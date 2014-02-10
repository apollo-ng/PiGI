var state = "IDLE";
var state_last = "";
var graph = [ 'profile', 'live'];
var points = [];
var profiles = [];
var selected_profile = 0;
var selected_profile_name = "leadfree";

var host = "ws://" + window.location.hostname + ":8080";
var ws_status = new WebSocket(host+"/ws_status");
var ws_log = new WebSocket(host+"/ws_log");
var ws_ticks = null;
var snd = new Audio("assets/tock.wav");

var audio = 0;
var count_unit = "CPM";


if(window.webkitRequestAnimationFrame) window.requestAnimationFrame = window.webkitRequestAnimationFrame;

graph.profile =
{
    label: "Profile",
    data: [],
    points: { show: false },
    color: "#75890c",
    draggable: false
};

graph.live =
{
    label: "Live",
    data: [],
    points: { show: false },
    color: "#d8d3c5",
    draggable: false
};


function getOptions()
{

  var options =
  {

    series:
    {
        lines:
        {
            show: true
        },

        points:
        {
            show: true,
            radius: 5,
            symbol: "circle"
        },

        shadowSize: 3

    },

	xaxis:
    {
      //tickSize: 30,
      mode: 'time',
      tickColor: 'rgba(216, 211, 197, 0.2)',
      font:
      {
        size: 14,
        lineHeight: 14,        weight: "normal",
        family: "Digi",
        variant: "small-caps",
        color: "rgba(216, 211, 197, 0.85)"
      }
	},

	yaxis:
    {
  	  tickSize: 0.1,
      tickDecimals: 1,
      draggable: false,
      tickColor: 'rgba(216, 211, 197, 0.2)',
      font:
      {
        size: 14,
        lineHeight: 14,
        weight: "normal",
        family: "Digi",
        variant: "small-caps",
        color: "rgba(216, 211, 197, 0.85)"
      }
	},

	grid:
    {
	  color: 'rgba(216, 211, 197, 0.55)',
      borderWidth: 1,
      labelMargin: 10,
      mouseActiveRadius: 50
	},

    legend:
    {
      show: false
    }
  }

  return options;

}


function toggleAudio()
{
  if (audio==0)
  {
    $('#audio-icon').html('<span class="glyphicon glyphicon-volume-up"></span>');
    $('#audio-status').html('<span class="ds-unit">ON</span>');
    audio=1;
    ws_ticks = new WebSocket(host+"/ws_ticks");
    ws_ticks.onmessage = function(e)
    {
        x = JSON.parse(e.data);
       console.log(x);
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
  }
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


$(document).ready(function()
{

    if(!("WebSocket" in window))
    {
        //$('#chatLog, input, button, #examples').fadeOut("fast");
        $('<p>Oh no, you need a browser that supports WebSockets. How about <a href="http://www.google.com/chrome">Google Chrome</a>?</p>').appendTo('#container');
    }
    else
    {

        ws_status.onopen = function()
        {
            console.log('Status Update socket opened');
        };

        ws_status.onmessage = function(e)
        {
            x = JSON.parse(e.data);
           console.log(x);
           switch(x.type)
           {
               case "status":
                    if(count_unit=="CPM") $('#act_count').html(parseInt(x.cpm));
                    if(count_unit=="CPS") $('#act_count').html(parseInt(x.cps));


                    // INES class identification
                    var doserate = parseFloat(x.doserate);

                    if(doserate < 0.1)
                    {
                        console.log("ebola");
                        // Level 0 Local Background
                        $('#radcon').html('0');
                        $('#radcon_name').html('LDR');
                        $('#eqd_unit').html('&micro;Sv/h');

                    }
                    else if (doserate < 10)
                    {
                        // Level 1 Anomaly
                        $('#radcon').html('1');
                        $('#radcon_name').html('Jet');
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

                    $('#act_eqd').html(doserate.toFixed(2));
               break;

               default:

            }
        }

        ws_status.onclose = function()
        {
          $.bootstrapGrowl("<span class=\"glyphicon glyphicon-exclamation-sign\"></span> <b>ERROR 1:</b><br/>Status Websocket not available", {
          ele: 'body', // which element to append to
          type: 'error', // (null, 'info', 'error', 'success')
          offset: {from: 'top', amount: 250}, // 'top', or 'bottom'
          align: 'center', // ('left', 'right', or 'center')
          width: 385, // (integer, or 'auto')
          delay: 5000,
          allow_dismiss: true,
          stackup_spacing: 10 // spacing between consecutively stacked growls.
          });
        };

        ws_log.onmessage = function(e)
        {
           var x = JSON.parse(e.data);
           console.log(x);
           switch(x.type)
           {
               case "history":
               console.log("HISTORY");
               $.each(x.log, function(i,v_json)
               {
                    var v = JSON.parse(v_json);
                    graph.live.data.push([i*1000, v.doserate]);
                    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ] , getOptions());
               });

                    break;
               case "status":
                    console.log("UPDATE")
                    graph.live.data.push([x.timestamp*1000, x.doserate]);
                    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ] , getOptions());
                    break;
               default:
            }
        }

        $("#e2").select2(
        {
            placeholder: "Select Profile",
            allowClear: false,
            minimumResultsForSearch: -1
        });


        $("#e2").on("change", function(e)
        {
            updateProfile(e.val);
        });

    }
});
