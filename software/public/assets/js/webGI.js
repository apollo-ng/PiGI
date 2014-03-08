if (typeof webGI === 'undefined') {
    webGI = {}
}

var webGI_init =
{
    ui_action : 'click',
    websockets : {},
    conf :
    {
        websocket_host : "ws://" + window.location.hostname + ":" +window.location.port,
        bell_snd : new Audio("assets/snd/ui-bell.mp3"),
        count_unit : "CPM"
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
       //console.log(msg);
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
                webGI.livechart.update(msg);
            break;
            case "history":
                webGI.livechart.updateBacklog(msg);
            break;
            case "static_history":
                webGI.history.update(msg);
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
        webGI.livechart.enable();
        $('.live-control').removeClass('enabled');
        $('#toggleGauge,#toggleTrace').removeClass('enabled');
        $(event.target).addClass('enabled');
        webGI.tracer.disable();
        updateLayout();
        webGI.livechart.set_age(parseInt($(event.target).attr("data-seconds")));
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
        webGI.geo.toggle();
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
        if(webGI.ticker.enabled) {
            $('#toggleAudio').removeClass('enabled');
            webGI.ticker.disable();
        } else {
            $('#toggleAudio').addClass('enabled');
            webGI.ticker.enable();
        }
    });

    $('#toggleLogScale').bind(webGI.ui_action,function() {
        if(!webGI.history.log_scale) {
            webGI.history.set_log_scale(true);
            $('#toggleLogScale').addClass('enabled');
        } else {
            webGI.history.set_log_scale(false);
            $('#toggleLogScale').removeClass('enabled');
        }
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
    webGI.livechart.init()
    webGI.history.init();
    webGI.gauge.init();
    webGI.geo.init();
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
    webGI.livechart.init();
    webGI.history.init();
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
    webGI.livechart.now = parseInt(msg.timestamp)*1000;

    if(webGI.conf.count_unit=="CPM") $('#count_val').html(parseInt(msg.data.cpm_dtc));
    if(webGI.conf.count_unit=="CPS") $('#count_val').html(parseInt(msg.data.cps_dtc));

    webGI.tracer.add(parseInt(msg.data.cps_dtc));

    if (msg.data.source == "sim")
    {
        $('#simNotify').addClass('init-simNotify');
    }
    else
    {
        $('#simNotify').removeClass('init-simNotify');
    }


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
                webGI.livechart.set_colors(['#677712','yellow']);
            }
            else if (c<6)
            {
                $('.rc-cat').removeClass('current');
                $('#rcCatLMed').addClass('current');
                $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').removeClass('green red');
                $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').addClass('yellow');
                webGI.livechart.set_colors(['#F5C43C','yellow']);
            }
            else
            {
                $('.rc-cat').removeClass('current');
                $('#rcCatLHigh').addClass('current');
                $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').removeClass('green yellow');
                $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').addClass('red');
                webGI.livechart.set_colors(['#ff0000','yellow']);
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
