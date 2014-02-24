var pigi = {
    websockets : {},
    log : {
        chart : null,
        data : {
            doserate : [],
            doserate_avg : [],
        },
        chart_age : 60*15,
        gauge : null,

    },
    conf : {
        websocket_host : "ws://" + window.location.hostname + ":8080",
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

    pigi.websockets.status = new WebSocket(pigi.conf.websocket_host+"/ws_status");
    pigi.websockets.log = new WebSocket(pigi.conf.websocket_host+"/ws_log");


    pigi.websockets.status.onopen = function()
    {
        //console.log('Status Update socket opened');
    };

    pigi.websockets.status.onmessage = function(e)
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

    pigi.websockets.status.onclose = function()
    {
        pigi.websockets.status = new WebSocket(pigi.conf.websocket_host+"/ws_status");
        console.log ("Status socket rest");
    };

    pigi.websockets.log.onopen = function()
    {
        requestLog();
    };

    pigi.websockets.log.onclose = function()
    {
        pigi.websockets.log = new WebSocket(pigi.conf.websocket_host+"/ws_log");
        console.log ("Log socket rest");
    };

    pigi.websockets.log.onmessage = function(e)
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
        default:
      }
    }
}

function initUI() {
    // Bind UI events

    // Backlog
    $('.liveControl').bind('click',function(event) {
        $('#gauge1').hide();
        $('#chartContainer').show();
        $('.liveControl').removeClass('enabled');
        $('#toggleGauge,#toggleTrace').removeClass('enabled');
        $(event.target).addClass('enabled');
        traceStop();
        pigi.log.chart_age = parseInt($(event.target).attr("seconds"))
        requestLog();
    });

    // CPS/CPM Toggle
    $('#count_val, #count_unit').bind('click',function() {
        toggleCounterUnit();
    });

    $('#userGeoStatus').bind('click',function() {
        geoToggle();
    });

    $('#toggleModal').bind('click',function() {
        $('#modal-1').addClass('md-show');
    });

    $('#toggleGauge').bind('click',function() {
       $('#chartContainer').hide();
       $('#toggleTrace').hide();
       $('#gauge1').show();
       traceStop();
       $('#toggleGauge').addClass('enabled');
       $('.liveControl, #toggleTrace').removeClass('enabled');
    });

    $('#toggleTrace').bind('click',function() {
       $('#chartContainer').hide();
       $('#gauge1').hide();
       $('#toggleTrace').addClass('enabled');
       $('.liveControl, #toggleGauge').removeClass('enabled');
       traceStart();
    });

    // Audio
    $('#toggleAudio').bind('click',function() {
        toggleAudio();
    });

    // Init Gauge
    initGauge()
}

function initGauge() {
    var opts = {
      lines: 12, // The number of lines to draw
      angle: 0.15, // The length of each line
      lineWidth: 0.24, // The line thickness
      pointer: {
        length: 0.9, // The radius of the inner circle
        strokeWidth: 0.035 // The rotation offset
      },
      colorStart: '#6FADCF',   // Colors
      colorStop: '#8FC0DA',    // just experiment with them
      strokeColor: '#E0E0E0'   // to see which ones work best for you
    };
    var target = document.getElementById('gauge1'); // your canvas element
    pigi.log.gauge = new Gauge(target).setOptions(opts); // create sexy gauge!

    //gauge.setTextField(document.getElementById("output"));
    pigi.log.gauge.maxValue = 1; // set max gauge value
    pigi.log.gauge.animationSpeed = 64; // set animation speed (32 is default value)
    pigi.log.gauge.set(0);
}

function updateLayout() {
    // This is called on DOMReady and on resize
    // FIXME: Nasty hack to keep chart fluid
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

    $('.md') .css({'height': h-100+'px'});
    $('#traceContainer') .css({'height': h-150+'px', 'width': w+'px'}).attr('height',h-150).attr('width',w);
    $('#chartContainer') .css({'height': h-150+'px'});
    $('#gauge1') .css({'height': h-150+'px'});
    $('#gauge1') .css({'width': w+'px'});
    $('#gauge1').attr('height',h-150);
    $('#gauge1').attr('width', w);
}

function updateStatus(data) {
    if(pigi.conf.count_unit=="CPM") $('#count_val').html(parseInt(x.cpm));
    if(pigi.conf.count_unit=="CPS") $('#count_val').html(parseInt(x.cps));

    if(pigi.trace.active) {
        for(var i = 0; i < parseInt(x.cps); i++)
        {
            pigi.trace.particles[Math.random()]=new traceCreateParticle();
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

    pigi.log.gauge.set(doserate);

    $('#eqd_val').html(doserate.toFixed(2));
}

function requestLog() {
    var cmd = {
        "cmd" : "read",
        "age" : pigi.log.chart_age
    }
    pigi.websockets.log.send(JSON.stringify(cmd));
    console.log ("Requesting log (age " +pigi.log.chart_age +" )");
}

function updateLogHistory(data) {
    console.log("HISTORY");
    pigi.log.data.doserate = [];
    pigi.log.data.doserate_avg = [];
    $.each(data.log, function(i,v){
        //var v = JSON.parse(v_json);
        var ts = new Date(v.timestamp*1000)
        pigi.log.data.doserate.push({ "x": ts, "y": v.doserate});
        pigi.log.data.doserate_avg.push({ "x": ts, "y": v.doserate_avg});
    });

    pigi.log.chart = new CanvasJS.Chart("chartContainer",{
        animationEnabled: false,
        backgroundColor: "rgba(13,12,8,0.25)",
        title:{ text: "EAR: $$ uSv/h (AVG) - EAD: $$ uSv (Total)", fontSize: 14, horizontalAlign: "right", fontColor: "rgba(117,137,12,0.8)", margin: 8 },
        axisY:{ minimum: 0, labelFontFamily: "Digi", gridThickness: 1, gridColor: "rgba(216,211,197,0.1)", lineThickness: 1, tickThickness: 0, interlacedColor: "rgba(216,211,197,0.05)"  },
        axisX:{ valueFormatString: "HH:mm", labelAngle: 0, labelFontFamily: "Digi", gridThickness: 1, gridColor: "rgba(216,211,197,0.1)", lineThickness: 1, tickThickness: 1 },
        data: [{ type: "area", color: "rgba(117,137,12,0.8)", dataPoints: pigi.log.data.doserate },
               { type: "line", color: "rgba(210,242,30,0.6)", dataPoints: pigi.log.data.doserate_avg }]
    });

    pigi.log.chart.render();
}

function updateLogStatus(data) {
    console.log("UPDATE")
    var ts = new Date(data.timestamp*1000);
    pigi.log.data.doserate.push({ "x": ts, "y": data.doserate});
    pigi.log.data.doserate_avg.push({ "x": ts, "y": data.doserate_avg});
    var left_end = new Date((data.timestamp-pigi.log.chart_age)*1000)
    while(pigi.log.data.doserate[0].x < left_end) pigi.log.data.doserate.shift();
    while(pigi.log.data.doserate_avg[0].x < left_end) pigi.log.data.doserate_avg.shift();
    pigi.log.chart.render();
}

function toggleCounterUnit() {
  if(pigi.conf.count_unit=="CPM")
  {
     $('#count_unit').html('CPS');
     pigi.conf.count_unit = "CPS";
  }
  else
  {
      $('#count_unit').html('CPM');
      pigi.conf.count_unit = "CPM";
  }
}

function toggleAudio() {
    if(pigi.conf.audio==0) {
        $('#toggleAudio').addClass('enabled');
        pigi.conf.audio=1;
        pigi.websockets.ticks = new WebSocket(pigi.conf.websocket_host+"/ws_ticks");
        pigi.websockets.ticks.onmessage = function(e)
        {
            x = JSON.parse(e.data);
           //console.log(x);
           switch(x.type)
           {
               case "tick":
                    if (pigi.conf.audio == 1) pigi.conf.tick_snd.play();
                    break;
               default:

            }
        }
    } else {
        pigi.conf.audio=0;
        pigi.websockets.ticks.close();
        $('#toggleAudio').removeClass('enabled');
    }
}

// Geolocation

function geoToggle() {
  if (navigator.geolocation)
  {
    if(pigi.geoWatch)
    {
      navigator.geolocation.clearWatch(pigi.geoWatch);
      pigi.geoWatch = null;
      $('#userGeoStatus').removeClass('init-blinker icon-dot-circled lock-green lock-yellow lock-red');
      $('#userGeoStatus').addClass('icon-target-1');
      $('#userGeoLoc').html('');
      console.log("geoWatch disabled");
    }
    else
    {
      $('#userGeoStatus').addClass('init-blinker');
      var timeoutVal = 10 * 1000 * 1000;
      pigi.geoWatch = navigator.geolocation.watchPosition(
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
  navigator.geolocation.clearWatch(pigi.geoWatch);
  console.log("Error: " + errors[error.code]);
}


function traceCreateParticle()
{
	this.x = Math.random()*pigi.trace.canvas.width;
	this.y = -Math.random()*10;

	this.vx = 0;
	this.vy = Math.random()*4+2;

	var b = Math.random()*128+128>>0;
	this.color = "rgba("+b+","+b+","+b+",0.5)";
}

function traceStart()
{
    $('#traceContainer').show();
    pigi.trace.active = true;
    pigi.trace.canvas = document.getElementById("traceContainer");
    //pigi.trace.width = $(pigi.trace).width();

    var ctx = pigi.trace.canvas.getContext("2d");
    //for(var i = 0; i < 300; i++)
    //{
        //This will add 50 particles to the array with random positions
    //    pigi.trace_particles[Math.random()]=new traceCreateParticle();
    //}
    pigi.trace.draw_interval = setInterval(traceDraw, 33);
}

function traceStop()
{
    $('#traceContainer').hide();
    pigi.trace.particles = {};
    if (pigi.trace.draw_interval !== null) clearInterval(pigi.trace.draw_interval);
}

function traceDraw()
{
    var W = pigi.trace.canvas.width;
    var H = pigi.trace.canvas.height;
    var ctx = pigi.trace.canvas.getContext("2d");

	ctx.globalCompositeOperation = "source-over";
	ctx.fillStyle = "rgba(52,51,48, 0.5)";
	ctx.fillRect(0, 0, W, H);
	ctx.globalCompositeOperation = "lighter";

	//Lets draw particles from the array now
	$.each(pigi.trace.particles, function(t,p)
    {
    //for(var t = 0; t < pigi.trace_particles.length; t++)
	//{
		//var p = pigi.trace_particles[t];

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
            delete pigi.trace.particles[t]
			//p.y = Math.random()*25-50;
			//p.x = Math.random()*W;
			//p.vy = Math.random()*2+6;
		}
	});
}

$(document).ready(function() {
    initWebsockets();
    initUI();
    geoToggle();  // Init geolocation

    updateLayout();
    $(window).resize(updateLayout)
});
