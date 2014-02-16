var host = "ws://" + window.location.hostname + ":8080";
var ws_status = new WebSocket(host+"/ws_status");
var ws_log = new WebSocket(host+"/ws_log");
var ws_ticks = null;
var snd = new Audio("assets/tock.wav");
var backlog_seconds = 60 * 15;

var audio = 0;
var count_unit = "CPM";
var chart = null;
var points= [];
var gauge = null;
var geoWatch = null;

var jQT = new $.jQTouch({    // `new` keyword is optional.
    icon: 'jqtouch.png',
    statusBar: 'black-translucent',
    preloadImages: []
});




$(document).ready(function()
{

    // FIXME: Nasty hack to keep chart fluid
    $(function(){
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    $('.md') .css({'height': h-100+'px'});
    $('#chartContainer') .css({'height': h-150+'px'});
    $('#gauge1') .css({'height': h-150+'px'});
    $('#gauge1').attr('height',h-150);
    $('#gauge1').attr('width',Math.max(document.documentElement.clientWidth, window.innerWidth || 0));
    $(window).resize(function(){
        var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        $('.md') .css({'height': h-100+'px'});
        $('#chartContainer') .css({'height': h-150+'px'});
        $('#gauge1') .css({'height': h-150+'px'});
        $('#gauge1').attr('height',h-150);
        $('#gauge1').attr('width',Math.max(document.documentElement.clientWidth, window.innerWidth || 0));
    });
    });


    if(!("WebSocket" in window))
    {
        //$('#chatLog, input, button, #examples').fadeOut("fast");
        $('<p>Oh no, you need a browser that supports WebSockets. How about <a href="http://www.google.com/chrome">Google Chrome</a>?</p>').appendTo('#container');
    }
    else
    {

        ws_status.onopen = function()
        {
            //console.log('Status Update socket opened');
        };

        ws_status.onmessage = function(e)
        {
            x = JSON.parse(e.data);
           //console.log(x);
           switch(x.type)
           {
               case "status":
                    if(count_unit=="CPM") $('#count_val').html(parseInt(x.cpm));
                    if(count_unit=="CPS") $('#count_val').html(parseInt(x.cps));


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

                    gauge.set(doserate);

                    $('#eqd_val').html(doserate.toFixed(2));
               break;

               default:

            }
        }

        ws_status.onclose = function()
        {
            //console.log("Status socket closed");
        };

        ws_log.onopen = function()
        {
            var cmd = {
                "cmd" : "read",
                "age" : backlog_seconds
            }
            ws_log.send(JSON.stringify(cmd));
            console.log ("Requesting log (age " +backlog_seconds +" )");
        };

        ws_log.onclose = function()
        {
            ws_log = new WebSocket(host+"/ws_log");
            console.log ("Log socket rest");
        };

        ws_log.onmessage = function(e)
        {
          var x = JSON.parse(e.data);
          //console.log(x);
          switch(x.type)
          {
            case "history":
              console.log("HISTORY");
              points = [];
              $.each(x.log, function(i,v)
              {
                //var v = JSON.parse(v_json);
                points.push({ "x": new Date(v.timestamp*1000), "y": v.doserate});
              });

              chart = new CanvasJS.Chart("chartContainer",
              {
                animationEnabled: false,
                backgroundColor: "rgba(13,12,8,0.25)",
                title:{ text: "EAR: $$ uSv/h (AVG) - EAD: $$ uSv (Total)", fontSize: 14, horizontalAlign: "right", fontColor: "rgba(117,137,12,0.8)", margin: 8 },
                axisY:{ minimum: 0, labelFontFamily: "Digi", gridThickness: 1, gridColor: "rgba(216,211,197,0.1)", lineThickness: 1, tickThickness: 0, interlacedColor: "rgba(216,211,197,0.05)"  },
                axisX:{ valueFormatString: "HH:mm", labelAngle: 0, labelFontFamily: "Digi", gridThickness: 1, gridColor: "rgba(216,211,197,0.1)", lineThickness: 1, tickThickness: 1 },
                data: [{ type: "area", color: "rgba(117,137,12,0.8)", dataPoints: points }]
              });

              chart.render();

            break;
            case "status":
              console.log("UPDATE")
              points.push({ "x": new Date(x.timestamp*1000), "y": x.doserate});

              while(points[0].x < new Date((x.timestamp-backlog_seconds)*1000))
              {
                points.shift();
              }

              chart.render();
            break;
            default:
          }
        }
    }

// Bind UI events

// Backlog
$('#live15m').bind('click',function() {
    $('#gauge1').hide();
    $('#chartContainer').show();
    $('#live15m').addClass('enabled');
    $('#live60m').removeClass('enabled');
    $('#live24h').removeClass('enabled');
    $('#toggleGauge').removeClass('enabled');
    backlog_seconds = 15 * 60;
    var cmd = {
                "cmd" : "read",
                "age" : backlog_seconds
            }
            ws_log.send(JSON.stringify(cmd));
});

$('#live60m').bind('click',function() {
    $('#gauge1').hide();
    $('#chartContainer').show();
    $('#live15m').removeClass('enabled');
    $('#live60m').addClass('enabled');
    $('#live24h').removeClass('enabled');
    $('#toggleGauge').removeClass('enabled');
    backlog_seconds = 60 * 60;
    var cmd = {
                "cmd" : "read",
                "age" : backlog_seconds
            }
            ws_log.send(JSON.stringify(cmd));
});

$('#live24h').bind('click',function() {
    $('#gauge1').hide();
    $('#chartContainer').show();
    $('#live15m').removeClass('enabled');
    $('#live60m').removeClass('enabled');
    $('#live24h').addClass('enabled');
    $('#toggleGauge').removeClass('enabled');
    backlog_seconds = 60 * 60 * 24;
    var cmd = {
                "cmd" : "read",
                "age" : backlog_seconds
            }
            ws_log.send(JSON.stringify(cmd));
});

// CPS/CPM Toggle
$('#count_val').bind('click',function() {
    toggleCounter();
});

$('#count_unit').bind('click',function() {
    toggleCounter();
});

$('#userGeoStatus').bind('click',function() {
    geoToggle();
});

$('#toggleModal').bind('click',function() {
    $('#modal-1').addClass('md-show');
});

$('#toggleGauge').bind('click',function() {
   $('#chartContainer').hide();
   $('#gauge1').show();
   $('#toggleGauge').addClass('enabled');
   $('#live15m').removeClass('enabled');
   $('#live60m').removeClass('enabled');
   $('#live24h').removeClass('enabled');

});


// Audio
$('#toggleAudio').bind('click',function() {
    if(audio==0)
    {
    $('#toggleAudio').addClass('enabled');
    audio=1;
    ws_ticks = new WebSocket(host+"/ws_ticks");
    ws_ticks.onmessage = function(e)
    {
        x = JSON.parse(e.data);
       //console.log(x);
       switch(x.type)
       {
           case "tick":
                if (audio == 1) snd.play();
                break;
           default:

        }
    }


                        }
                        else
                        {
              $('#audio-icon').html('<span class="glyphicon glyphicon-volume-off"></span>');
    $('#audio-status').html('<span class="ds-unit">OFF</span>');
    audio=0;
    ws_ticks.close();
    $('#toggleAudio').removeClass('enabled');
                        }

                        });

// Gauge Init


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
        gauge = new Gauge(target).setOptions(opts); // create sexy gauge!

        //gauge.setTextField(document.getElementById("output"));
        gauge.maxValue = 1; // set max gauge value
        gauge.animationSpeed = 64; // set animation speed (32 is default value)
        gauge.set(0);


// Init geolocation
geoToggle();


});

//
//
//
//
//

// Geolocation

function geoToggle()
{
  if (navigator.geolocation)
  {
    if(geoWatch)
    {
      navigator.geolocation.clearWatch(geoWatch);
      geoWatch = null;
      $('#userGeoStatus').removeClass('enabled');
      console.log("geoWatch disabled");
    }
    else
    {
      $('#userGeoStatus').addClass('init-blinker');
      var timeoutVal = 10 * 1000 * 1000;
      geoWatch = navigator.geolocation.watchPosition(
        geoUpdate,
        geoError,
        { enableHighAccuracy: true, timeout: timeoutVal, maximumAge: 0 }
      );
      console.log("geoWatch enabled");
    }
  }
  else
  {
    console.log("Geolocation is not supported by this browser");
  }
}

function geoUpdate(position)
{
  $('#userGeoStatus').removeClass('init-blinker');
  $('#userGeoStatus').addClass('enabled');
  var contentString = "Timestamp: " + position.timestamp + " User location: lat " + position.coords.latitude + ", long " + position.coords.longitude + ", accuracy " + position.coords.accuracy;
  console.log(contentString)
}

function geoError(error)
{
  var errors = {
    1: 'Permission denied',
    2: 'Position unavailable',
    3: 'Request timeout',
    4: 'Unknown Error'
  };
  $('#userGeoStatus').removeClass('init-blinker');
  $('#userGeoStatus').removeClass('enabled');
  navigator.geolocation.clearWatch(geoWatch);
  console.log("Error: " + errors[error.code]);
}


function toggleCounter()
{
  if(count_unit=="CPM")
  {
     $('#count_unit').html('CPS');
     count_unit = "CPS";
  }
  else
  {
      $('#count_unit').html('CPM');
      count_unit = "CPM";
  }
}



