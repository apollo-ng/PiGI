if (typeof webGI === 'undefined') {
    webGI = {}
}

var webGI_init =
{
    now: Date.now(),
    ui_action : 'click',
    websockets : {},
    log :
    {
        chart : null,
        data : [],
        alldata : [],
        data_hd : [],
        data_ld : [],
        edr_avg_24 : 0.10,
        chart_age : 60*15,
        desired_range : null,
        animtimer : null,
        chart_colors : ['#677712','yellow'],
    },
    history :
    {
        chart : null,
        data : [],
        log_scale : false
    },
    conf :
    {
        websocket_host : "ws://" + window.location.hostname + ":" +window.location.port,
        audio : 0,
        tick_snd : new Audio("assets/snd/tock.wav"),
        bell_snd : new Audio("assets/snd/ui-bell.mp3"),
        count_unit : "CPM"
    },
    geo :
    {
        watcher : null,
        lat : 0,
        lon : 0,
        alt : 0,
        acc : 0
    },
    jQT : new $.jQTouch
    ({
        icon: 'jqtouch.png',
        statusBar: 'black-translucent',
        preloadImages: []
    })
};

$.extend(webGI,webGI_init);

function initWebsockets()
{
    if(!("WebSocket" in window))
    {
        $('<p>Oh no, you need a modern browser that supports WebSockets. How about <a href="http://www.google.com/chrome">Google Chrome</a>?</p>').appendTo('#container');
        return;
    }

    webGI.websockets.status = new WebSocket(webGI.conf.websocket_host+"/ws_status");
    webGI.websockets.log = new WebSocket(webGI.conf.websocket_host+"/ws_log");


    webGI.websockets.status.onopen = function()
    {
        $('#modalError').removeClass('md-show');
        //console.log('Status Update socket opened');
    };

    webGI.websockets.status.onmessage = function(e)
    {
       var msg = JSON.parse(e.data);
       //console.log(x);
       switch(msg.type)
       {
            case "geigerjson":
                updateStatus(msg);
            break;

            default:
                console.log("INVALID MESSAGE",msg);

        }
    }

    webGI.websockets.status.onclose = function()
    {
        webGI.websockets.status = new WebSocket(webGI.conf.websocket_host+"/ws_status");

        showErrorModal(
            'Websocket Error',
            '<p>Wheeeeh, I lost my sockets. Either the server has gone down or the network connection is unreliable or stalled.</p><b>Possible solutions:</b></p><ul><li>Is the pyGI daemon running on the Pi?</li><li>Enable/toggle your WIFI connection</li></ul>'
        );

        setTimeout(function(){initWebsockets()}, 5000);
        //console.log ("Status socket rest");
    };

    webGI.websockets.log.onopen = function()
    {
        $('#modalError').removeClass('md-show');
        requestLog(60*60*1,true);
        requestLog(60*60*24,false);
        requestHistory(null,null);
    };

    webGI.websockets.log.onclose = function()
    {
        webGI.websockets.log = new WebSocket(webGI.conf.websocket_host+"/ws_log");
        showErrorModal(
            'Websocket Error',
            '<p>Wheeeeh, I lost my sockets. Either the server has gone down or the network connection is unreliable or stalled.</p><b>Possible solutions:</b></p><ul><li>Is the pyGI daemon running on the Pi?</li><li>Enable/toggle your WIFI connection</li></ul>'
        );
        //console.log ("Log socket rest");
    };

    webGI.websockets.log.onmessage = function(e)
    {
        var msg = JSON.parse(e.data);
        //console.log(msg);
        switch(msg.type)
        {
            case "geigerjson":
                updateLogStatus(msg);
            break;
            case "history":
                updateLogHistory(msg);
            break;
            case "static_history":
                updateHistory(msg);
            break;
            default:
                console.log("INVALID MESSAGE",msg)
        }
    }
}

function initUI()
{
    // Bind UI events

    // Backlog
    $('.live-control').bind(webGI.ui_action,function(event)
    {
        webGI.gauge.disable();
        $('#chartContainer').show();
        $('.live-control').removeClass('enabled');
        $('#toggleGauge,#toggleTrace').removeClass('enabled');
        $(event.target).addClass('enabled');
        webGI.tracer.disable();
        updateLayout();
        webGI.log.chart_age = parseInt($(event.target).attr("seconds"))
        //var samples = webGI.log.chart_age/5;
        //webGI.log.data = webGI.log.alldata.slice(-samples);
        if (webGI.log.animtimer != null) {
            clearTimeout(webGI.log.animtimer);
        }

        var age = webGI.log.chart_age;
        if (age > 60*60*1) {
            webGI.log.data = webGI.log.data_ld;
        } //else {
          //  webGI.log.data = webGI.log.data_hd;
        //}
        if (webGI.log.chart == null)
        {
            initLog();
        }
        else
        {
            var now = Date.now();
            webGI.log.chart.updateOptions({
                file: webGI.log.data,
                dateWindow: webGI.log.desired_range
            });
        }
        chartZoom(now - webGI.log.chart_age*1000);
});

    $('#lvl_val, #lvl_unit').bind(webGI.ui_action,function()
    {
        $('#modalRADCON').addClass('md-show');
    });

    // CPS/CPM Toggle
    $('#count_val, #count_unit').bind(webGI.ui_action,function()
    {
        toggleCounterUnit();
    });

    $('#userGeoStatus').bind(webGI.ui_action,function()
    {
        geoToggle();
    });

    $('#toggleModal').bind(webGI.ui_action,function()
    {
        $('#modal-1').addClass('md-show');
    });

    $('#showModalDateRanger').bind(webGI.ui_action,function()
    {
        $('#modalDateRanger').addClass('md-show');
    });

    $('#showModalAuth').bind(webGI.ui_action,function()
    {
        $('#modalAuth').addClass('md-show');
    });

    $('#toggleGauge').bind(webGI.ui_action,function()
    {
       $('#chartContainer').hide();
       $('#toggleTrace').hide();
       webGI.tracer.disable();
       webGI.gauge.enable();
       $('#toggleGauge').addClass('enabled');
       $('.live-control, #toggleTrace').removeClass('enabled');
    });

    $('#toggleTrace').bind(webGI.ui_action,function()
    {
       $('#chartContainer').hide();
       webGI.gauge.disable();
       $('#toggleTrace').addClass('enabled');
       $('.live-control, #toggleGauge').removeClass('enabled');
       webGI.tracer.enable();
    });

    // Audio
    $('#toggleAudio').bind(webGI.ui_action,function()
    {
        toggleAudio();
    });

    $('#toggleLogScale').bind(webGI.ui_action,function()
    {
        toggleLogScale();
    });

    // Page animation callback events
    $('#jqt').bind('pageAnimationStart', function(e, info)
    {
        //console.log('Page animation started');
    });

    // Orientation change callback event
    $('#jqt').bind('turn', function(e, data)
    {
        console.log('Orientation changed to: ' + data.orientation);
        updateLayout();
    });

    // First working swipe handler test harness. Let's see how we like it
    $('#mainPanel').swipeLeft(function(){
        webGI.jQT.goTo('#historyPanel', 'slideleft');
    });

    $('#mainPanel').swipeRight(function(){
        webGI.jQT.goTo('#optionsPanel', 'slideright');
    });

    $('#optionsPanel').swipeLeft(function(){
        webGI.jQT.goTo('#mainPanel', 'slideleft');
    });

/*
    $('#jqt').bind('pageAnimationEnd', function(e, info)
    {
        console.log('Page animation finished');
        updateLayout();
    });
*/
    initLog();
    initHistory();
    webGI.gauge.init()
    updateLayout();
}


function toggleCounterUnit()
{
    if(webGI.conf.count_unit=="CPM")
    {
        $('#count_unit').html('CPS');
        webGI.conf.count_unit = "CPS";
    }
    else
    {
        $('#count_unit').html('CPM');
        webGI.conf.count_unit = "CPM";
    }
}

function toggleLogScale()
{
    if(!webGI.history.log_scale)
    {
        webGI.history.log_scale = true;
        $('#toggleLogScale').addClass('enabled');
    }
    else
    {
        webGI.history.log_scale = false;
        $('#toggleLogScale').removeClass('enabled');
    }

    webGI.history.chart.updateOptions({ logscale: webGI.history.log_scale });
}

function toggleAudio()
{
    if(webGI.conf.audio==0)
    {
        $('#toggleAudio').addClass('enabled');
        webGI.conf.audio=1;
        webGI.websockets.ticks = new WebSocket(webGI.conf.websocket_host+"/ws_ticks");
        webGI.websockets.ticks.onmessage = function(e)
        {
            x = JSON.parse(e.data);
           //console.log(x);
           switch(x.type)
           {
               case "tick":
                    if (webGI.conf.audio == 1) {
                        for(var i = 0; i < parseInt(x.count); i++)
                        {
                            setTimeout(function() {
                                webGI.conf.tick_snd.play();
                            }, Math.random()*200);
                        }
                    }
               break;
               default:

            }
        }
    } else {
        webGI.conf.audio=0;
        webGI.websockets.ticks.close();
        $('#toggleAudio').removeClass('enabled');
    }
}

function showErrorModal (title, msg, action)
{
    $('#body').find('.md-modal').removeClass('md-show');
    webGI.conf.bell_snd.play();

    setTimeout(function()
    {
        $('#modalErrorTitle').html(title);
        $('#modalErrorMsg').html(msg);

        var buttons = '<a class="md-close" onclick="$(\'#modalError\').removeClass(\'md-show\');">Ack</a>';

        if (action)
        {
            buttons = buttons + action;
        }

        $('#modalErrorAction').html(buttons);
        $('#modalError').addClass('md-show');
    },
    300);
}


function updateLayout()
{
    // This is called on DOMReady and on resize/rotate
    // FIXME: Nasty hack to keep everything in flux state :)
    //console.log("Updating Layout");

    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

    // Make the modals stack and sticky
    $('.md-modal').css({'top': '80px', 'left': (w/2)-($('#modalAuth').width()/2)+'px'})

    var h_offset = 150;
    var w_offset = 48;

    $('.instrument') .css({'height': h-100+'px'});

    var new_h = h-h_offset;
    var new_w = $('#mainInstrument').width();

    $('.instrument-container').css({'height': new_h+'px', 'width': new_w+'px'}).attr('height',new_h).attr('width',new_w);

    new_w = $('#historyInstrument').width();
    $('#historyContainer') .css({'height': new_h+'px', 'width': new_w-15+'px'}).attr('height',new_h).attr('width',new_w-15);

    //ugly, but we seem to need it
    initLog();
    initHistory();
    webGI.gauge.init()
    //if (webGI.log.chart != null) webGI.log.chart.updateOptions({file: webGI.log.data});
    //if (webGI.history.chart != null) webGI.history.chart.updateOptions({file: webGI.history.data});

}

function updateConfig()
{
    console.log("Writing config to local storage")
}


function updateStatus(msg)
{
    webGI.now = parseInt(msg.timestamp)*1000;

    if(webGI.conf.count_unit=="CPM") $('#count_val').html(parseInt(msg.data.cpm_dtc));
    if(webGI.conf.count_unit=="CPS") $('#count_val').html(parseInt(msg.data.cps_dtc));

    webGI.tracer.add(parseInt(msg.data.cps_dtc));
    
    var edr = parseFloat(msg.data.edr);

    // EDR Watchdog firing above 20% increase compared to 24h EDR avg
    /*
    if(edr > (webGI.log.edr_avg_24*1.2))
    {
        console.log('EDR Watchdog fired');

        showErrorModal(
            'RADIATION Warning',
            '<p>Wow, that tube is really cracking and sparkling now...</p>'
        );
    }*/

    // RADCON class identification and UI reaction
    var s = 0.1;

    for(var c=0;c<=8;c++)
    {
        if(edr < s)
        {
            $('#lvl_val').html(c);
            $('.rc-row').removeClass('current');
            $('#rc'+c).addClass('current');

            if(c<3)
            {
                $('.rc-cat').removeClass('current');
                $('#rcCatLow').addClass('current');
                $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').removeClass('yellow red');
                $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').addClass('green');
                webGI.log.chart_colors = ['#677712','yellow']; //FIXME: needs a full redraw to take effect :/
                if (webGI.log.chart) webGI.log.chart.updateOptions({colors: webGI.log.chart_colors});
            }
            else if (c<6)
            {
                $('.rc-cat').removeClass('current');
                $('#rcCatLMed').addClass('current');
                $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').removeClass('green red');
                $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').addClass('yellow');
                webGI.log.chart_colors = ['#F5C43C','yellow']; //FIXME: needs a full redraw to take effect :/
                if (webGI.log.chart) webGI.log.chart.updateOptions({colors: webGI.log.chart_colors});
            }
            else
            {
                $('.rc-cat').removeClass('current');
                $('#rcCatLHigh').addClass('current');
                $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').removeClass('green yellow');
                $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').addClass('red');
                webGI.log.chart_colors = ['#ff0000','yellow']; //FIXME: needs a full redraw to take effect :/
                if (webGI.log.chart) webGI.log.chart.updateOptions({colors: webGI.log.chart_colors});
            }

            break;
        }
        else
        {
            s=s*10;
        }
    }

    // Automatic unit switching
    if(edr < 1000)
    {
        $('#edr_unit').html('uSv/h');
    }
    else if (edr < 1000000)
    {
        $('#edr_unit').html('mSv/h');
        edr = edr/1000;
    }
    else
    {
        $('#edr_unit').html('Sv/h');
        edr = edr/1000000;
    }

    webGI.gauge.set(edr);
    $('#edr_val').html(edr.toFixed(2));
}

function requestLog(age,hd)
{
    var cmd =
    {
        "cmd" : "read",
        //"age" : webGI.log.chart_age
        "age" : age,
        "hd": hd
    }

    webGI.websockets.log.send(JSON.stringify(cmd));
    //console.log ("Requesting log (age " +webGI.log.chart_age +" )");
}

function requestHistory(from,to)
{
    var cmd =
    {
        "cmd" : "history",
        "from" : from,
        "to" : to
    }

    webGI.websockets.log.send(JSON.stringify(cmd));
    //console.log ("Requesting history");
}

function initHistory()
{
    //console.log("Init history");

    if (webGI.history.data.length==0)
    {
        return;
    }

    webGI.history.chart = new Dygraph("historyContainer", webGI.history.data,
    {
        //interactionModel : {
        //    'mousedown' : Dygraph.Interaction.startPan,
        //    'mousemove' : Dygraph.Interaction.movePan,
        //    'mouseup' : Dygraph.Interaction.endPan,
            //'click' : clickV3,
            //'dblclick' : dblClickV3,
        //    'mousewheel' : Dygraph.Interaction.moveZoom
        //},
        showRangeSelector: true,
        rangeSelectorPlotFillColor: '#677712',
        rangeSelectorPlotStrokeColor: '#677712',
        title: 'EAR: $$ uSv/h (AVG) - EAD: $$ uSv (Total)',
        titleHeight: 35,
        rightGap: 10,
        fillAlpha: 0.7,
        fillGraph: true,
        showRoller: true,
        valueRange: [0.01,null],
        //yRangePad: 10,
        drawCallback: function(dygraph, initial)
        {
            var range = dygraph.yAxisRange()
            if (range[0] != 0.01)
            {
                console.log("Fixing range",range);
                range[0] = 0.01;
                range[1] = null//;range[1]*2;
                dygraph.updateOptions({valueRange: range});
            }
        },
        //zoomCallback: function(min,max,y) {
        //    webGI.history.chart.updateOptions({valueRange: [0.01, null]});
        //},

        //includeZero: true,
        //connectSeparatedPoints: true,
        labels: ['time','µSv/h','µSv/h (15m avg)'],
        xlabel: 'time',
        xLabelHeight : 25,
        colors: ['#677712','yellow'],
        'µSv/h':
        {
            fillGraph: true,
            stepPlot: true,
        },
        'µSv/h (15m avg)':
        {
            fillGraph: false,
        },
    });
}

function updateHistory(data)
{
    //console.log("HISTORY");
    webGI.history.data = [];
    $.each(data.log, function(i,v)
    {
        //var v = JSON.parse(v_json);
        var ts = new Date(v.timestamp*1000)
        if (isNaN(ts.getTime()))
        {
            return;
        }
        webGI.history.data.push([ts,v.data.edr,v.data.edr_avg]);
    });

    if (webGI.history.chart == null)
    {
        initHistory();
    }
    else
    {
        webGI.history.chart.updateOptions({ file: webGI.history.data });
    }
}

function initLog()
{
    //console.log("Init log");
    if (webGI.log.data.length==0)
    {
        //requestLog()
        return;
    }

    webGI.log.chart = new Dygraph("chartContainer", webGI.log.data,
    {
        title: 'EAR: $$ uSv/h (AVG) - EAD: $$ uSv (Total)',
        titleHeight: 35,
        fillGraph: true, //we want the error bars
        rightGap: 20,
        fillAlpha: 0.7,
        showRoller: false,
        rollPeriod: 1,
        interactionModel: {},
        //valueRange: [0,null],
        includeZero: true,
        animatedZooms: true,
        labels: ['time','µSv/h','µSv/h (15m avg)'],
        xlabel: 'time',
        colors: webGI.log.chart_colors,
        'µSv/h':
        {
            fillGraph: true,
            stepPlot: true,
        },
        'µSv/h (15m avg)':
        {
            fillGraph: false,
        },
    });
}

function updateLogHistory(data)
{
    //console.log("LOGHISTORY");

    if (data.hd) {
        webGI.log.data_hd = [];
        $.each(data.log, function(i,v)
        {
            var ts = new Date(v.timestamp*1000);
            //var ts = v.timestamp*1000
            //if (isNaN(ts.getTime()))
            //{
            //    return;
            //}
            webGI.log.data_hd.push([ts,v.data.edr,v.data.edr_avg]);
        });
    } else {
        webGI.log.data_ld = [];
        var edr_avg=0;

        $.each(data.log, function(i,v)
        {
            var ts = new Date(v.timestamp*1000);
            //var ts = v.timestamp*1000
            //if (isNaN(ts.getTime()))
            //{
            //    return;
            //}
            webGI.log.data_ld.push([ts,v.data.edr,v.data.edr_avg]);
            edr_avg += v.data.edr;

        });

        // Update rolling 24h average EDR for alert reference
        webGI.log.edr_avg_24 = (edr_avg/data.log.length);
    }

    var age = webGI.log.chart_age;
    if (age > 60*60*1) {
        webGI.log.data = webGI.log.data_ld;
        //console.log("LD")
    } else {
        webGI.log.data = webGI.log.data_hd;
        //console.log("HD",webGI.log.data.length)
    }
    if (webGI.log.chart == null)
    {
        initLog();
    }
    else
    {
        var now = webGI.now;
        webGI.log.chart.updateOptions({
            file: webGI.log.data,
            dateWindow: [ now - webGI.log.chart_age*1000, now]
        });
    }
}

function updateLogStatus(msg)
{
    //console.log("UPDATE")

    var ts = new Date(msg.timestamp*1000);
    webGI.log.data_hd.push([ts,msg.data.edr,msg.data.edr_avg]);

    //FIXME: push ld data less often
    webGI.log.data_ld.push([ts,msg.data.edr,msg.data.edr_avg]);

    var left_end_ld = new Date((msg.timestamp-60*60*24)*1000)
    while(webGI.log.data_ld[0][0] < left_end_ld) webGI.log.data_ld.shift();

    var left_end_hd = new Date((msg.timestamp-60*60*1)*1000)
    while(webGI.log.data_hd[0][0] < left_end_hd) webGI.log.data_hd.shift();


    var now = webGI.now;
    webGI.log.chart.updateOptions({
        file: webGI.log.data,
        dateWindow: [ now - webGI.log.chart_age*1000, now]
    });
}


  function chartApproachRange() {
    if (!webGI.log.desired_range) return;
    // go halfway there
    var range = webGI.log.chart.xAxisRange();
    if (Math.abs(webGI.log.desired_range[0] - range[0]) < 60 &&
        Math.abs(webGI.log.desired_range[1] - range[1]) < 60) {
        if (webGI.log.chart_age > 60*60*1) {
            webGI.log.data = webGI.log.data_ld;
        } else {
            webGI.log.data = webGI.log.data_hd;
        }

      webGI.log.chart.updateOptions({dateWindow: webGI.log.desired_range,
        file: webGI.log.data});
      // (do not set another timeout.)
    } else {
      var new_range;
      new_range = [0.5 * (webGI.log.desired_range[0] + range[0]),
                   0.5 * (webGI.log.desired_range[1] + range[1])];
      webGI.log.chart.updateOptions({dateWindow: new_range});
      chartAnimate();
    }
  }
  function chartAnimate() {
    webGI.log.animtimer = setTimeout(chartApproachRange, 50);
  }

  function chartZoom (age) {
    var w = webGI.log.chart.xAxisRange();
    webGI.log.desired_range = [ age, webGI.now];
    chartAnimate();
  }

/*
 *   Geolocation
 */

function geoToggle()
{
    //console.log('geo toggled');
    if (navigator.geolocation)
    {
        if(webGI.geo.watcher)
        {
            navigator.geolocation.clearWatch(webGI.geo.watcher);
            webGI.geo.watcher = null;
            $('#userGeoStatus').removeClass('init-blinker icon-dot-circled lock-green lock-yellow lock-red');
            $('#userGeoStatus').addClass('icon-target-1');
            $('#userGeoLoc').html('');
            //console.log("geo.watcher disabled");
        }
        else
        {
            $('#userGeoStatus').addClass('init-blinker');

            webGI.geo.watcher = navigator.geolocation.watchPosition(
                geoUpdate,
                geoError,
                {
                    enableHighAccuracy: false,
                    timeout: 60,
                    maximumAge: 5
                }
            );
            //console.log("geo.watcher enabled");
        }
    }
    else
    {
        $('#userGeoLoc').html('');
        showErrorModal(
            'Geolocation unavailable',
            '<p>It seems your browser/device does not support geolocation</p>'
        );
    }
}

function geoUpdate(position)
{
    $('#userGeoStatus').removeClass('init-blinker icon-target-1');
    $('#userGeoStatus').addClass('icon-dot-circled');

    // Update lock circle to indicate GeoLocation accuracy
    if (position.coords.accuracy < 10)
    {
        $('#userGeoStatus').removeClass('lock-red lock-yellow');
        $('#userGeoStatus').addClass('lock-green');
    }
    else if (position.coords.accuracy < 25)
    {
        $('#userGeoStatus').removeClass('lock-red lock-green');
        $('#userGeoStatus').addClass('lock-yellow');
    }
    else
    {
        $('#userGeoStatus').removeClass('lock-yellow lock-green');
        $('#userGeoStatus').addClass('lock-red');
    }

    webGI.geo.lat = position.coords.latitude;
    webGI.geo.lon = position.coords.longitude;
    webGI.geo.alt = position.coords.altitude;
    webGI.geo.acc = position.coords.accuracy;

    $('#userGeoLoc').html(
        position.coords.latitude.toString().substr(0,8) + ' ' +
        position.coords.longitude.toString().substr(0,8)
    )
}

function geoError(error)
{
    var errors = {
        1: 'Permission denied',
        2: 'Position unavailable',
        3: 'Request timeout',
        4: 'Unknown Error'
    };

    //console.log("Error: " + errors[error.code]);

    $('#userGeoStatus').removeClass('init-blinker icon-dot-circled lock-green lock-yellow lock-red');
    $('#userGeoStatus').addClass('icon-target-1');
    $('#userGeoLoc').html('');

    navigator.geolocation.clearWatch(webGI.geo.watcher);

    showErrorModal(
        'Geolocation unavailable',
        '<p>Hmmm, unfortunately, I still could not really determine our location. The browser/device told me:</p> <p><h4>'+ errors[error.code] + '</h4></p><b>Possible solutions:</b></p><ul><li>Turn on your GPS</li><li>Allow the browser to share geolocation</li></ul>'
    );
}


$(document).ready(function()
{
    webGI.spinner.init();
    $(window).resize(updateLayout);
    updateLayout();
    window.onhashchange = updateLayout; // should have been replaced by pageAnimationEnd event but doesn't work as well

    // Switch UI click/tap event handler action for stupid apple browsers
    if ($.support.touch) { webGI.ui_action = 'touchend'; }
    else { webGI.ui_action  = 'click'; }

    initUI();
    initWebsockets();
    setTimeout(function() {
        webGI.spinner.disable();
        $('.splash').addClass('splash-hidden');
    },500);
    
    //setTimeout(function () { geoToggle(); },5000);
    

});
