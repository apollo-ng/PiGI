/*
 * Status/Data websocket module
 */

// Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {};
}

// Add status module to webGI namespace
webGI.status = (function($) {

    /***************************************************************************
     * Public attributes ******************************************************/

    var my = {};


    /***************************************************************************
     * Private attributes ******************************************************/

    var count_unit = 'CPM';
    var ws_status = null;


    /***************************************************************************
     * Public functions ********************************************************/

    my.init = function() {

        // Add Checkboxes to client settings panel
        // and set check status according to config

        webGI.options.addOptionCheckbox(
            'client_settings',
            'cnf_dtc_enabled',
            'Dead-Time Compensation',
            (webGI.conf.dtc_enabled === 1) ? true : false
        );
    };

    my.init_socket = function() {
        ws_status = new WebSocket(webGI.conf.websocket_host + '/ws_status');

        ws_status.onopen = function() {
            $('#modalError').removeClass('md-show');
            //console.log('Status Update socket opened');
        };

        ws_status.onmessage = function(e) {
            var msg = JSON.parse(e.data);
            //console.log(msg);
            switch (msg.type) {
                case 'geigerjson':
                    my.update(msg);
                    webGI.livechart.now = parseInt(msg.timestamp * 1000);
                    webGI.tracer.add(parseInt(msg.data.cps_dtc));
                    break;

                default:
                    console.log('INVALID MESSAGE', msg);
            }
        };

        ws_status.onclose = function() {
            ws_status = new WebSocket(webGI.conf.websocket_host + "/ws_status");

            showErrorModal(
                'Websocket Error',
                '<p>Wheeeeh, I lost my sockets. Either the server has gone down or the network connection is unreliable or stalled.</p><b>Possible solutions:</b></p><ul><li>Is the pyGI daemon running on the Pi?</li><li>Enable/toggle your WIFI connection</li></ul>'
            );

            setTimeout(function() {
                my.init_socket();
                webGI.livechart.init_socket();
            }, 5000);
            //console.log ("Status socket reset");
        };
    };

    my.enable = function() {
        $('#gaugeContainer').show();
    };

    my.disable = function() {
        $('#gaugeContainer').hide();

    };

    my.show_radcon = function() {
        $('#modalRADCON').addClass('md-show');
    };

    my.toggle_counter_unit = function() {
        if (count_unit == 'CPM') {
            $('#count_unit').html('CPS');
            count_unit = 'CPS';
        } else {
            $('#count_unit').html('CPM');
            count_unit = 'CPM';
        }
    };

    my.update = function(msg) {

        if (count_unit == 'CPM') {
            document.getElementById('count_val').innerHTML = parseInt(msg.data.cpm_dtc);
            //$('#count_val').html(parseInt(msg.data.cpm_dtc));

        } else if (count_unit == 'CPS') {
            document.getElementById('count_val').innerHTML = parseInt(msg.data.cps_dtc);
            //$('#count_val').html(parseInt(msg.data.cps_dtc));
        }

        if (msg.data.source == 'sim') {
            $('#simNotify').addClass('init-simNotify');
        } else {
            $('#simNotify').removeClass('init-simNotify');
        }

        var edr = parseFloat(msg.data.edr);

        // RADCON class identification and UI reaction
        var s = 0.1;
        //var last = document.getElementById('lvl_val').innerHTML;

        for (var c = 0; c <= 8; c++) {
            if (edr < s) {
                $('#statusGauge').attr('max', s);

                document.getElementById('lvl_val').innerHTML = c;
                //document.getElementById('status_radcon').innerHTML = c;
                $('.rc-row').removeClass('current');
                $('#rc' + c).addClass('current');

                if (c < 3) {
                    $('.rc-cat').removeClass('current');
                    $('#rcCatLow').addClass('current');
                    $('#edr_val, #status_edr_val, #edr_unit, #lvl_val, #lvl_unit').removeClass('yellow red');
                    $('#edr_val, #status_edr_val, #edr_unit, #lvl_val, #lvl_unit').addClass('green');
                    //webGI.livechart.set_colors(['#677712','yellow']);
                } else if (c < 6) {
                    $('.rc-cat').removeClass('current');
                    $('#rcCatMed').addClass('current');
                    $('#edr_val, #status_edr_val, #edr_unit, #lvl_val, #lvl_unit').removeClass('green red');
                    $('#edr_val, #status_edr_val, #edr_unit, #lvl_val, #lvl_unit').addClass('yellow');
                    //webGI.livechart.set_colors(['#F5C43C','yellow']);
                } else {
                    $('.rc-cat').removeClass('current');
                    $('#rcCatHigh').addClass('current');
                    $('#edr_val, #status_edr_val, #edr_unit, #lvl_val, #lvl_unit').removeClass('green yellow');
                    $('#edr_val, #status_edr_val, #edr_unit, #lvl_val, #lvl_unit').addClass('red');
                    //webGI.livechart.set_colors(['#ff0000','yellow']);
                }

                break;
            } else {
                s = s * 10;
            }
        }

        // Automatic unit switching
        if (edr < 1000) {
            document.getElementById('edr_unit').innerHTML = 'uSv/h';
        } else if (edr < 1000000) {
            document.getElementById('edr_unit').innerHTML = 'mSv/h';
            edr = edr / 1000;
        } else {
            document.getElementById('edr_unit').innerHTML = 'Sv/h';
            edr = edr / 1000000;
        }

        document.getElementById('edr_val').innerHTML = edr.toFixed(2);
        document.getElementById('status_edr_val').innerHTML = edr.toFixed(2);
        //document.getElementById('statusGauge').value = edr;
        document.getElementById('status_cps').innerHTML = parseInt(msg.data.cps_dtc);
        document.getElementById('status_cpm').innerHTML = parseInt(msg.data.cpm_dtc);
        document.getElementById('status_rem').innerHTML = (edr / 10).toFixed(2);
        document.getElementById('status_avg_15min').innerHTML = webGI.livechart.getDoseRateAvg15m();
        document.getElementById('status_24h_dose').innerHTML = webGI.livechart.getDose24h();

        var etm = 10000 / edr;
        var d = parseInt(etm / 24);
        var h = parseInt(etm % 24);

/*
        if (d > 365) {
            document.getElementById('status_etm').innerHTML = 'Indefinitely';
            //$('#status_etm').val(d+' '+ h);
        } else if (d > 100) {
            document.getElementById('status_etm').innerHTML = d;
        } else {
            document.getElementById('status_etm').innerHTML = d + ' ' + h;
        }
*/
        // Analyze data for alerts
        webGI.alert.analyze(edr,c);

    };


    /***************************************************************************
     * Private functions *******************************************************/


    return my;

}($));
