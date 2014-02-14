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
var chart = null;
var points= [];

var jQT = new $.jQTouch({    // `new` keyword is optional.
    icon: 'jqtouch.png',
    statusBar: 'black-translucent',
    preloadImages: []
});

  // Some sample Javascript functions:
            $(function(){

                // Show a swipe event on swipe test
                $('#swipeme').swipe(function(evt, data) {
                    var details = !data ? '': '<strong>' + data.direction + '/' + data.deltaX +':' + data.deltaY + '</strong>!';
                    $(this).html('You swiped ' + details );
                    $(this).parent().after('<li>swiped!</li>')
                });

                $('#tapme').tap(function(){
                    $(this).parent().after('<li>tapped!</li>')
                });

                $('a[target="_blank"]').bind('click', function() {
                    if (confirm('This link opens in a new window.')) {
                        return true;
                    } else {
                        return false;
                    }
                });

                // Page animation callback events
                $('#pageevents').
                    bind('pageAnimationStart', function(e, info){
                        $(this).find('.info').append('Started animating ' + info.direction + '&hellip;  And the link ' +
                            'had this custom data: ' + $(this).data('referrer').data('custom') + '<br>');
                    }).
                    bind('pageAnimationEnd', function(e, info){
                        $(this).find('.info').append('Finished animating ' + info.direction + '.<br><br>');

                    });

                // Page animations end with AJAX callback event, example 1 (load remote HTML only first time)
                $('#callback').bind('pageAnimationEnd', function(e, info){
                    // Make sure the data hasn't already been loaded (we'll set 'loaded' to true a couple lines further down)
                    if (!$(this).data('loaded')) {
                        // Append a placeholder in case the remote HTML takes its sweet time making it back
                        // Then, overwrite the "Loading" placeholder text with the remote HTML
                        $(this).append($('<div>Loading</div>').load('ajax.html .info', function() {
                            // Set the 'loaded' var to true so we know not to reload
                            // the HTML next time the #callback div animation ends
                            $(this).parent().data('loaded', true);
                        }));
                    }
                });
                // Orientation callback event
                $('#jqt').bind('turn', function(e, data){
                    $('#orient').html('Orientation: ' + data.orientation);
                });

            });




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
                    points.push({ "x": new Date(i*1000), "y":v.doserate});
                    //graph.live.data.push([i*1000, v.doserate]);
                    //graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ] , getOptions());
               });

                chart = new CanvasJS.Chart("chartContainer",
    {

      title:{
      text: ""
      },
       data: [
      {
        type: "line",

        dataPoints: points
      }
      ]
    });
               chart.render();

                    break;
               case "status":
                    console.log("UPDATE")


                    points.push({ "x": new Date(x.timestamp*1000), "y":x.doserate});

                    while(points[0].x < new Date((x.timestamp-15*60)*1000))
                    {
                      points.shift();
                    }

                    chart.render();
                    //graph.live.data.push([x.timestamp*1000, x.doserate]);
                    //graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ] , getOptions());
                    break;
               default:
            }
        }
    }
});
