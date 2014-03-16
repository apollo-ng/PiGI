//Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {}
}

//Add module to webGI namespace
webGI.status = (function($) {
    //We have jquery/zepto available ($)

    //Public attributes
    var my = {};

    //Private attributes
    var count_unit = "CPM";
    var ws_status = null;
    //Public Function


    my.init_socket = function() {
        ws_status = new WebSocket(webGI.conf.websocket_host+"/ws_status");

        ws_status.onopen = function() {
            $('#modalError').removeClass('md-show');
            //console.log('Status Update socket opened');
        };

        ws_status.onmessage = function(e) {
           var msg = JSON.parse(e.data);
           //console.log(msg);
           switch(msg.type) {
                case "geigerjson":
                    my.update(msg);
                    webGI.livechart.now = parseInt(msg.timestamp)*1000;
                    //webGI.gauge.set(parseFloat(msg.data.edr));
                    webGI.tracer.add(parseInt(msg.data.cps_dtc));
                break;

                default:
                    console.log("INVALID MESSAGE",msg);
            }
        };

        ws_status.onclose = function() {
            ws_status = new WebSocket(webGI.conf.websocket_host+"/ws_status");

            showErrorModal(
                'Websocket Error',
                '<p>Wheeeeh, I lost my sockets. Either the server has gone down or the network connection is unreliable or stalled.</p><b>Possible solutions:</b></p><ul><li>Is the pyGI daemon running on the Pi?</li><li>Enable/toggle your WIFI connection</li></ul>'
            );

            setTimeout(function(){my.init_socket(); webGI.livechart.init_socket();}, 5000);
            //console.log ("Status socket reset");
        };
    };

    my.enable = function() {
        $('#gaugeContainer').show();
    }

    my.disable = function() {
        $('#gaugeContainer').hide();
    }

    my.show_radcon = function() {
        $('#modalRADCON').addClass('md-show');
    };

    my.toggle_counter_unit = function() {
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


    my.update = function(msg) {
        if(count_unit=="CPM") $('#count_val').html(parseInt(msg.data.cpm_dtc));
        if(count_unit=="CPS") $('#count_val').html(parseInt(msg.data.cps_dtc));

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
                    //webGI.livechart.set_colors(['#677712','yellow']);
                }
                else if (c<6)
                {
                    $('.rc-cat').removeClass('current');
                    $('#rcCatMed').addClass('current');
                    $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').removeClass('green red');
                    $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').addClass('yellow');
                    //webGI.livechart.set_colors(['#F5C43C','yellow']);
                }
                else
                {
                    $('.rc-cat').removeClass('current');
                    $('#rcCatHigh').addClass('current');
                    $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').removeClass('green yellow');
                    $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').addClass('red');
                    //webGI.livechart.set_colors(['#ff0000','yellow']);
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

        $('#edr_val').html(edr.toFixed(2));
    }

    //Do not forget to return my, otherwise nothing will work.
    return my;
}($));  //Pass jq/zepto to the module construction function call
