var webGI = {
    ui_action : 'click',
    websockets : {},
    log : {
        chart : null,
        data : {
            doserate : [],
            doserate_avg : [],
        },
        chart_age : 60*15,
        gauge : null,
        gauge_opts : {
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
    },
    history : {
        chart : null,
        data : {
            doserate : [],
            doserate_avg : [],
        },
        chart_age : 60*60*24*7,
    },
    conf : {
        websocket_host : "ws://" + window.location.hostname + ":" +window.location.port,
        audio : 0,
        tick_snd : new Audio("assets/tock.wav"),
        count_unit : "CPM"
    },
    geoWatch : null,
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
        $('<p>Oh no, you need a browser that supports WebSockets. How about <a href="http://www.google.com/chrome">Google Chrome</a>?</p>').appendTo('#container');
        return;
    }

    webGI.websockets.status = new WebSocket(webGI.conf.websocket_host+"/ws_status");
    webGI.websockets.log = new WebSocket(webGI.conf.websocket_host+"/ws_log");


    webGI.websockets.status.onopen = function()
    {
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
        console.log ("Status socket rest");
    };

    webGI.websockets.log.onopen = function()
    {
        requestLog();
        requestHistory(null,null);
    };

    webGI.websockets.log.onclose = function()
    {
        webGI.websockets.log = new WebSocket(webGI.conf.websocket_host+"/ws_log");
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
    $('.liveControl').bind(webGI.ui_action,function(event) {
        $('#gaugeContainer').hide();
        $('#chartContainer').show();
        $('.liveControl').removeClass('enabled');
        $('#toggleGauge,#toggleTrace').removeClass('enabled');
        $(event.target).addClass('enabled');
        traceStop();
        updateLayout();
        webGI.log.chart_age = parseInt($(event.target).attr("seconds"))
        requestLog();
    });

    // CPS/CPM Toggle
    $('#count_val, #count_unit').bind(webGI.ui_action,function() {
        toggleCounterUnit();
    });

    $('#userGeoStatus').bind(webGI.ui_action,function() {
        geoToggle();
    });

    $('#toggleModal').bind(webGI.ui_action,function() {
        $('#modal-1').addClass('md-show');
    });

    $('#toggleGauge').bind(webGI.ui_action,function() {
       $('#chartContainer').hide();
       $('#toggleTrace').hide();
       traceStop();
       $('#gaugeContainer').show();
       $('#toggleGauge').addClass('enabled');
       $('.liveControl, #toggleTrace').removeClass('enabled');
    });

    $('#toggleTrace').bind(webGI.ui_action,function() {
       $('#chartContainer').hide();
       $('#gaugeContainer').hide();
       $('#toggleTrace').addClass('enabled');
       $('.liveControl, #toggleGauge').removeClass('enabled');
       traceStart();
    });

    // Audio
    $('#toggleAudio').bind(webGI.ui_action,function() {
        toggleAudio();
    });

    updateLayout();
}

function initGauge() {
    var target = document.getElementById('gaugeContainer');
    webGI.log.gauge = new Gauge(target).setOptions(webGI.log.gauge_opts);
    webGI.log.gauge.maxValue = 1;
    webGI.log.gauge.animationSpeed = 64;
    webGI.log.gauge.set(0);
}

function updateLayout() {
    // This is called on DOMReady and on resize
    // FIXME: Nasty hack to keep chart fluid
    console.log("Updating Layout");
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

    var h_offset = 152;
    var w_offset = 48;

    $('.md') .css({'height': h-100+'px'});
    
    var new_h = h-h_offset;
    //var new_w = w-w_offset;
    var new_w = $('#md-home').width();
    
    
    $('.canvasjs-chart-canvas') .css({'height': h-h_offset+'px', 'width': w-w_offset+'px'}).attr('height',h-h_offset).attr('width',w-w_offset);
    
    //$('.instrumentContainer').css({'height': new_h+'px', 'width': new_w+'px'}).attr('height',new_h).attr('width',new_w);
    $('#traceContainer') .css({'height': new_h-4+'px', 'width': new_w+'px'}).attr('height',new_h-4).attr('width',new_w);
    $('#chartContainer') .css({'height': new_h+'px', 'width': new_w+'px'}).attr('height',new_h).attr('width',new_w);
    $('#gaugeContainer') .css({'height': new_h-4+'px', 'width': new_w+'px'}).attr('height',new_h-4).attr('width',new_w);
    
    new_w = $('#md-history').width();
    $('#historyContainer') .css({'height': new_h+'px', 'width': new_w+'px'}).attr('height',new_h).attr('width',new_w);
    
    initLog();
    initHistory();
    initGauge();
    //if (webGI.log.chart != null) webGI.log.chart.render();
    //if (webGI.history.chart != null) webGI.history.chart.render();
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

function updateHistory(data) {
    console.log("HISTORY");
    webGI.history.data.doserate = [];
    webGI.history.data.doserate_avg = [];
    $.each(data.log, function(i,v){
        //var v = JSON.parse(v_json);
        var ts = new Date(v.timestamp*1000)
        webGI.history.data.doserate.push({ "x": ts, "y": v.doserate});
        webGI.history.data.doserate_avg.push({ "x": ts, "y": v.doserate_avg});
    });

    initHistory();
}

function updateLogHistory(data) {
    console.log("LOGHISTORY");
    webGI.log.data.doserate = [];
    webGI.log.data.doserate_avg = [];
    $.each(data.log, function(i,v){
        //var v = JSON.parse(v_json);
        var ts = new Date(v.timestamp*1000)
        webGI.log.data.doserate.push({ "x": ts, "y": v.doserate});
        webGI.log.data.doserate_avg.push({ "x": ts, "y": v.doserate_avg});
    });
    initLog();
}

function updateLogStatus(data) {
    console.log("UPDATE")
    var ts = new Date(data.timestamp*1000);
    webGI.log.data.doserate.push({ "x": ts, "y": data.doserate});
    webGI.log.data.doserate_avg.push({ "x": ts, "y": data.doserate_avg});
    var left_end = new Date((data.timestamp-webGI.log.chart_age)*1000)
    while(webGI.log.data.doserate[0].x < left_end) webGI.log.data.doserate.shift();
    while(webGI.log.data.doserate_avg[0].x < left_end) webGI.log.data.doserate_avg.shift();
//    updateLayout();
    webGI.log.chart.render();
}


function initHistory() {
    console.log("Init history");
    webGI.history.chart = new CanvasJS.Chart("historyContainer",{
        animationEnabled: false,
        backgroundColor: "rgba(13,12,8,0.25)",
        title:{ text: "All time uSv/h", fontSize: 14, horizontalAlign: "right", fontColor: "rgba(117,137,12,0.8)", margin: 8 },
        axisY:{ minimum: 0, labelFontFamily: "Digi", gridThickness: 1, gridColor: "rgba(216,211,197,0.1)", lineThickness: 0, tickThickness: 0, interlacedColor: "rgba(216,211,197,0.05)"  },
        axisX:{ valueFormatString: "MM-DD", labelAngle: 0, labelFontFamily: "Digi", gridThickness: 1, gridColor: "rgba(216,211,197,0.1)", lineThickness: 1, tickThickness: 1 },
        data: [{ type: "area", color: "rgba(117,137,12,0.8)", dataPoints: webGI.history.data.doserate },
               { type: "line", color: "rgba(210,242,30,0.6)", dataPoints: webGI.history.data.doserate_avg }]
    });
    webGI.history.chart.render();
}

function initLog() {
    console.log("Init log");
    webGI.log.chart = new CanvasJS.Chart("chartContainer",{
        animationEnabled: false,
        backgroundColor: "rgba(13,12,8,0.25)",
        title:{ text: "uSv/h", fontSize: 14, horizontalAlign: "right", fontColor: "rgba(117,137,12,0.8)", margin: 8 },
        axisY:{ minimum: 0, labelFontFamily: "Digi", gridThickness: 1, gridColor: "rgba(216,211,197,0.1)", lineThickness: 0, tickThickness: 0, interlacedColor: "rgba(216,211,197,0.05)"  },
        axisX:{ valueFormatString: "HH:mm", labelAngle: 0, labelFontFamily: "Digi", gridThickness: 1, gridColor: "rgba(216,211,197,0.1)", lineThickness: 1, tickThickness: 1 },
        data: [{ type: "area", color: "rgba(117,137,12,0.8)", dataPoints: webGI.log.data.doserate },
               { type: "line", color: "rgba(210,242,30,0.6)", dataPoints: webGI.log.data.doserate_avg }]
    });
    webGI.log.chart.render();
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

// Geolocation

function geoToggle() {
  if (navigator.geolocation)
  {
    if(webGI.geoWatch)
    {
      navigator.geolocation.clearWatch(webGI.geoWatch);
      webGI.geoWatch = null;
      $('#userGeoStatus').removeClass('init-blinker icon-dot-circled lock-green lock-yellow lock-red');
      $('#userGeoStatus').addClass('icon-target-1');
      $('#userGeoLoc').html('');
      console.log("geoWatch disabled");
    }
    else
    {
      $('#userGeoStatus').addClass('init-blinker');
      var timeoutVal = 10 * 1000 * 1000;
      webGI.geoWatch = navigator.geolocation.watchPosition(
        geoUpdate,
        geoError,
        { enableHighAccuracy: true, timeout: timeoutVal, maximumAge: 0 }
      );
      console.log("geoWatch enabled");
    }
  }
  else
  {
    $('#userGeoLoc').html('');
    console.log("Geolocation is not supported by this browser");
  }
}

function geoUpdate(position) {
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

  $('#userGeoLoc').html(position.coords.latitude.toString().substr(0,8) + ' ' + position.coords.longitude.toString().substr(0,8))
}

function geoError(error) {
  var errors = {
    1: 'Permission denied',
    2: 'Position unavailable',
    3: 'Request timeout',
    4: 'Unknown Error'
  };
  $('#userGeoStatus').removeClass('init-blinker icon-dot-circled lock-green lock-yellow lock-red');
  $('#userGeoStatus').addClass('icon-target-1');
  $('#userGeoLoc').html('');
  navigator.geolocation.clearWatch(webGI.geoWatch);
  console.log("Error: " + errors[error.code]);
}


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
    //for(var t = 0; t < webGI.trace_particles.length; t++)
	//{
		//var p = webGI.trace_particles[t];

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
			//p.y = Math.random()*25-50;
			//p.x = Math.random()*W;
			//p.vy = Math.random()*2+6;
		}
	});
}

$(document).ready(function() {
    $(window).resize(updateLayout);
    updateLayout();
    window.onhashchange = updateLayout;
    // Switch UI click/tap event handler action for stupid apple browsers
    if ($.support.touch) { webGI.ui_action = 'touchend'; }
    else { webGI.ui_action  = 'click'; }

    initWebsockets();
    initUI();
    geoToggle();  // Init geolocation
});
