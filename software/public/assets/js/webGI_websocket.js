/*
 * Status/Data websocket module
 */

// Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {};
}

// Add websocket module to webGI namespace
webGI.websocket = (function($) {

    /***************************************************************************
     * Public attributes ******************************************************/

    var my = {};


    /***************************************************************************
     * Private attributes ******************************************************/

    var ws = null;


    /***************************************************************************
     * Public functions ********************************************************/

    my.init = function() {
        ws = new WebSocket(webGI.conf.websocket_host + '/ws');

        ws.onopen = function() {
            $('#modalError').removeClass('md-show');
            console.log('websocket opened');
        };

        ws.onmessage = function(e) {
            var msg = JSON.parse(e.data);
            //console.log(msg);
            switch (msg.type) {
                case 'geigerjson':
                    webGI.status.update(msg);
                    webGI.livechart.now = parseInt(msg.timestamp * 1000);
                    webGI.tracer.add(parseInt(msg.data.cps_dtc));
                    break;
                case "tick":
                    webGI.ticker.play_ticks(msg.count);
                    break;
                default:
                    console.log('INVALID MESSAGE', msg);
            }
        };

        ws.onclose = function() {
            ws = new WebSocket(webGI.conf.websocket_host + "/ws");

            showErrorModal(
                'Websocket Error',
                '<p>Wheeeeh, I lost my sockets. Either the server has gone down or the network connection is unreliable or stalled.</p><b>Possible solutions:</b></p><ul><li>Is the pyGI daemon running on the Pi?</li><li>Enable/toggle your WIFI connection</li></ul>'
            );

            setTimeout(function() {
                my.init();
            }, 5000);
            console.log ("websocket reset");
        };
    };

    my.send = function(msg){
        ws.send(JSON.stringify(msg))
    }

    /***************************************************************************
     * Private functions *******************************************************/


    return my;

}($));
