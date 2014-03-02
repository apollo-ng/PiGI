var webGI = {
    ui_action : 'click',
    websockets : {},
    spinner : null,
    log : {
        chart : null,
        data : [],
        chart_age : 60*15,
        gauge : null
    },
    history : {
        chart : null,
        data : [],
        log_scale : false
    },
    conf : {
        websocket_host : "ws://" + window.location.hostname + ":" +window.location.port,
        audio : 0,
        tick_snd : new Audio("assets/tock.wav"),
        count_unit : "CPM"
    },
    geo : {
        watcher : null,
        lat : 0,
        lon : 0,
        alt : 0,
        acc : 0
    },
    jQT : new $.jQTouch({
        icon: 'jqtouch.png',
        statusBar: 'black-translucent',
        preloadImages: []
    }),
    trace : {
        canvas : null,
        particles : {},
        active : false,
        drawInterval : null
    }
};

function initWebsockets() {
    if(!("WebSocket" in window))
    {
        //$('#chatLog, input, button, #examples').fadeOut("fast");
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
        x = JSON.parse(e.data);
       //console.log(x);
       switch(x.type)
       {
           case "status":
                updateStatus(x);
           break;

           default:

        }
    }

    webGI.websockets.status.onclose = function()
    {
        webGI.websockets.status = new WebSocket(webGI.conf.websocket_host+"/ws_status");
        $('#modalError').addClass('md-show');
        setTimeout(function(){initWebsockets()}, 5000);
        console.log ("Status socket rest");
    };

    webGI.websockets.log.onopen = function()
    {
        $('#modalError').removeClass('md-show');
        requestLog();
        requestHistory(null,null);
    };

    webGI.websockets.log.onclose = function()
    {
        webGI.websockets.log = new WebSocket(webGI.conf.websocket_host+"/ws_log");
        $('#modalError').addClass('md-show');
        //setTimeout(function(){initWebsockets()}, 5000);
        console.log ("Log socket rest");
    };

    webGI.websockets.log.onmessage = function(e)
    {
      var x = JSON.parse(e.data);
      //console.log(x);
      switch(x.type)
      {
        case "history":
          updateLogHistory(x);
        break;
        case "status":
          updateLogStatus(x);
        break;
        case "static_history":
          updateHistory(x);
        break;
        default:
      }
    }
}

function initUI() {
    // Bind UI events

    // Backlog
    $('.live-control').bind(webGI.ui_action,function(event)
    {
        $('#gaugeContainer').hide();
        $('#chartContainer').show();
        $('.live-control').removeClass('enabled');
        $('#toggleGauge,#toggleTrace').removeClass('enabled');
        $(event.target).addClass('enabled');
        traceStop();
        updateLayout();
        webGI.log.chart_age = parseInt($(event.target).attr("seconds"))
        requestLog();
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
        $('#calendarContainer').dateRangePicker();
    });

    $('#showModalAuth').bind(webGI.ui_action,function()
    {
        $('#modalAuth').addClass('md-show');
    });

    $('#toggleGauge').bind(webGI.ui_action,function()
    {
       $('#chartContainer').hide();
       $('#toggleTrace').hide();
       traceStop();
       $('#gaugeContainer').show();
       $('#toggleGauge').addClass('enabled');
       $('.live-control, #toggleTrace').removeClass('enabled');
    });

    $('#toggleTrace').bind(webGI.ui_action,function()
    {
       $('#chartContainer').hide();
       $('#gaugeContainer').hide();
       $('#toggleTrace').addClass('enabled');
       $('.live-control, #toggleGauge').removeClass('enabled');
       traceStart();
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
    initGauge();
    updateLayout();
}


function toggleCounterUnit() {
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

function toggleLogScale() {
    if(!webGI.history.log_scale){
        webGI.history.log_scale = true;
        $('#toggleLogScale').addClass('enabled');
    } else {
        webGI.history.log_scale = false;
        $('#toggleLogScale').removeClass('enabled');
    }

    webGI.history.chart.updateOptions({ logscale: webGI.history.log_scale });
}
function toggleAudio() {
    if(webGI.conf.audio==0) {
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
                        console.log(x)
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
    //console.log('Firing Modal');
    $('#modalErrorTitle').html(title);
    $('#modalErrorMsg').html(msg);

    var buttons = '<a class="md-close" onclick="$(\'#modalError\').removeClass(\'md-show\');">Ack</a>';
    if (action) {
        buttons = buttons + action;
    }

    $('#modalErrorAction').html(buttons);
    $('#modalError').addClass('md-show');
}

function initSpinner()
{
    var opts = {
        lines: 15, // The number of lines to draw
        length: 30, // The length of each line
        width: 12, // The line thickness
        radius: 45, // The radius of the inner circle
        corners: 1, // Corner roundness (0..1)
        rotate: 0, // The rotation offset
        direction: 1, // 1: clockwise, -1: counterclockwise
        color: 'rgba(216, 211, 197, 0.9)', // #rgb or #rrggbb or array of colors
        speed: 1, // Rounds per second
        trail: 60, // Afterglow percentage
        shadow: true, // Whether to render a shadow
        hwaccel: true, // Whether to use hardware acceleration
        className: 'spinner', // The CSS class to assign to the spinner
        zIndex: 2e9, // The z-index (defaults to 2000000000)
        top: 'auto', // Top position relative to parent in px
        left: 'auto' // Left position relative to parent in px
    };

    webGI.spinner = new Spinner(opts).spin(document.getElementById('body'));
    webGI.spinner.stop();
}

function startSpinner(){
    webGI.spinner.spin(document.getElementById('body'));
}

function stopSpinner(){
    webGI.spinner.stop();
}

function initGauge() {

    var opts = {
        lines: 1,
        angle: 0.15,
        lineWidth: 0.05,
        pointer: {
            length: 0.9,
            strokeWidth: 0.015,
            color: '#d8d3c5'
        },
        limitmMax: 'true',
        colorStart: '#75890c',
        colorStop: '#75890c',
        strokeColor: '#000000'
    }

    var target = document.getElementById('gaugeContainer');
    webGI.log.gauge = new Gauge(target).setOptions(opts);
    webGI.log.gauge.maxValue = 1;
    webGI.log.gauge.animationSpeed = 64;
    webGI.log.gauge.set(0);
}

function updateLayout() {
    // This is called on DOMReady and on resize/rotate
    // FIXME: Nasty hack to keep everything in flux state :)
    //console.log("Updating Layout");

    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

    // Make the modals stack and sticky
    $('.md-modal').css({'top': '100px', 'left': (w/2)-($('#modalAuth').width()/2)+'px'})

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
    initGauge();
    //if (webGI.log.chart != null) webGI.log.chart.updateOptions({file: webGI.log.data});
    //if (webGI.history.chart != null) webGI.history.chart.updateOptions({file: webGI.history.data});

}

function updateConfig() {
    console.log("Writing config to local storage")
}


function updateStatus(data) {
    if(webGI.conf.count_unit=="CPM") $('#count_val').html(parseInt(x.cpm));
    if(webGI.conf.count_unit=="CPS") $('#count_val').html(parseInt(x.cps));

    if(webGI.trace.active) {
        for(var i = 0; i < parseInt(x.cps); i++)
        {
            setTimeout(function() {
                webGI.trace.particles[Math.random()]=new traceCreateParticle();
            }, Math.random()*1000);
        }
    }
    // INES class identification
    var doserate = parseFloat(x.doserate);

    if(doserate < 0.1)
    {
        console.log("ebola");
        // Level 0 Local Background
        $('#lvl_val').html('0');
        $('#lvl_unit').html('LDR');
        $('#eqd_unit').html('&micro;Sv/h');

    }
    else if (doserate < 10)
    {
        // Level 1 Anomaly
        $('#lvl_val').html('1');
        $('#lvl_unit').html('Jet');
        $('#eqd_unit').html('&micro;Sv/h');

    }
    else if (doserate < 1000)
    {
        // Level 2 Incident
    }
    else if (doserate < 100000)
    {
        // Level 3
    }
    else if (doserate < 1000000)
    {
        // Level 4
    }
    else if (doserate < 10000000)
    {
        // Level 5
    }
    else if (doserate < 100000000)
    {
        // Level 6
    }
    else
    {
        // Level 7
    }

    webGI.log.gauge.set(doserate);

    $('#eqd_val').html(doserate.toFixed(2));
}

function requestLog() {
    var cmd = {
        "cmd" : "read",
        "age" : webGI.log.chart_age
    }
    webGI.websockets.log.send(JSON.stringify(cmd));
    console.log ("Requesting log (age " +webGI.log.chart_age +" )");
}

function requestHistory(from,to) {
    var cmd = {
        "cmd" : "history",
        "from" : from,
        "to" : to
    }
    webGI.websockets.log.send(JSON.stringify(cmd));
    console.log ("Requesting history");
}

function initHistory() {
    console.log("Init history");
    if (webGI.history.data.length==0) {
        return;
    }
    webGI.history.chart = new Dygraph("historyContainer", webGI.history.data,
    {
        showRangeSelector: true,
        rangeSelectorPlotFillColor: '#677712',
        rangeSelectorPlotStrokeColor: '#677712',
        title: 'EAR: $$ uSv/h (AVG) - EAD: $$ uSv (Total)',
        rightGap: 15,
        fillAlpha: 0.7,
        fillGraph: true,
        showRoller: true,
        valueRange: [0.01,null],
        //yRangePad: 10,
        drawCallback: function(dygraph, initial) {
            var range = dygraph.yAxisRange()
            if (range[0] != 0.01){
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
        colors: ['#677712','yellow'],
        'µSv/h': {
            fillGraph: true,
            stepPlot: true,
        },
        'µSv/h (15m avg)': {
            fillGraph: false,
        },
    });
}

function updateHistory(data) {
    console.log("HISTORY");
    webGI.history.data = [];
    $.each(data.log, function(i,v){
        //var v = JSON.parse(v_json);
        var ts = new Date(v.timestamp*1000)
        if (isNaN(ts.getTime())) {
            return;
        }
        webGI.history.data.push([ts,v.doserate,v.doserate_avg]);
    });
    if (webGI.history.chart == null) {
        initHistory();
    } else {
        webGI.history.chart.updateOptions({ file: webGI.history.data });
    }
}

function initLog() {
    console.log("Init log");
    if (webGI.log.data.length==0) {
        return;
    }
    webGI.log.chart = new Dygraph("chartContainer", webGI.log.data,
    {
        title: 'EAR: $$ uSv/h (AVG) - EAD: $$ uSv (Total)',
        titleHeight: 25,
        fillGraph: true, //we want the error bars
        rightGap: 15,
        fillAlpha: 0.7,
        showRoller: false,
        rollPeriod: 1,
        interactionModel: {},
        //valueRange: [0,null],
        includeZero: true,
        labels: ['time','µSv/h','µSv/h (15m avg)'],
        xlabel: 'time',
        colors: ['#677712','yellow'],
        'µSv/h': {
            fillGraph: true,
            stepPlot: true,
        },
        'µSv/h (15m avg)': {
            fillGraph: false,
        },
    });
}

function updateLogHistory(data) {
    console.log("LOGHISTORY");
    webGI.log.data = [];
    $.each(data.log, function(i,v){
        //var v = JSON.parse(v_json);
        var ts = new Date(v.timestamp*1000)
        if (isNaN(ts.getTime())) {
            return;
        }
        webGI.log.data.push([ts,v.doserate,v.doserate_avg]);
    });
    if (webGI.log.chart == null) {
        initLog();
    } else {
        webGI.log.chart.updateOptions({ file: webGI.log.data });
    }
}

function updateLogStatus(data) {
    console.log("UPDATE")
    var ts = new Date(data.timestamp*1000);
    webGI.log.data.push([ts,data.doserate,data.doserate_avg]);
    var left_end = new Date((data.timestamp-webGI.log.chart_age)*1000)
    while(webGI.log.data[0][0] < left_end) webGI.log.data.shift();
    webGI.log.chart.updateOptions({ file: webGI.log.data });
}

/*
 * 2D/hardware accelerated canvas particle tracer/visualizer
 */

function traceCreateParticle()
{
	this.x = Math.random()*webGI.trace.canvas.width;
	this.y = 0; //-Math.random()*webGI.trace.canvas.height;

	this.vx = 0;
	this.vy = Math.random()*4+2;

	var b = Math.random()*128+128>>0;
	this.color = "rgba("+b+","+b+","+b+",0.5)";
}

function traceStart()
{
    $('#traceContainer').show();
    webGI.trace.active = true;
    webGI.trace.canvas = document.getElementById("traceContainer");
    //webGI.trace.width = $(webGI.trace).width();

    var ctx = webGI.trace.canvas.getContext("2d");
    webGI.trace.particles = {};
    webGI.trace.draw_interval = setInterval(traceDraw, 33);
}

function traceStop()
{
    $('#traceContainer').hide();
    webGI.trace.particles = {};
    if (webGI.trace.draw_interval !== null) clearInterval(webGI.trace.draw_interval);
}

function traceDraw()
{
    var W = webGI.trace.canvas.width;
    var H = webGI.trace.canvas.height;
    var ctx = webGI.trace.canvas.getContext("2d");

	ctx.globalCompositeOperation = "source-over";
	ctx.fillStyle = "rgba(52,51,48, 0.6)";
	ctx.fillRect(0, 0, W, H);
	ctx.globalCompositeOperation = "lighter";

	//Lets draw particles from the array now
	$.each(webGI.trace.particles, function(t,p)
    {
		ctx.beginPath();

		ctx.fillStyle = p.color;
		ctx.fillRect(p.x, p.y, 1,p.vy);

		p.x += p.vx;
		p.y += p.vy;
		p.vy += Math.random()*p.y/25;
		//To prevent the balls from moving out of the canvas
		if(p.x < -50) p.x = W+50;
		if(p.y < -50) p.y = H+50;
		if(p.x > W) p.x = -50;
		if(p.y > H) {
            delete webGI.trace.particles[t]
		}
	});
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
            var timeoutVal = 10 * 1000 * 1000;
            webGI.geo.watcher = navigator.geolocation.watchPosition(
                geoUpdate,
                geoError,
                {
                    enableHighAccuracy: false,
                    timeout: timeoutVal,
                    maximumAge: 0
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
        '<p>Hmmm, unfortunately I still could not determine our location. The browser/device told me:</p> <p><h4>'+ errors[error.code] + '</h4></p><b>Possible solutions:</b></p><ul><li>Turn on your GPS</li><li>Allow the browser to share geolocation</li></ul>'
    );
}


$(document).ready(function()
{
    $(window).resize(updateLayout);
    updateLayout();
    window.onhashchange = updateLayout; // should have been replaced by pageAnimationEnd event but doesn't work as well

    // Switch UI click/tap event handler action for stupid apple browsers
    if ($.support.touch) { webGI.ui_action = 'touchend'; }
    else { webGI.ui_action  = 'click'; }

    initUI();
    initSpinner();
    initWebsockets();
    setTimeout(function () { geoToggle(); },1500);

});
