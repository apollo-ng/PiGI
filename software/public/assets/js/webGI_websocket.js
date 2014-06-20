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

            //FIXME: do we need the timeout?
            setTimeout(function() {
                webGI.livechart.requestLog(60 * 60 * 1, true);
                webGI.livechart.requestLog(60 * 60 * 24, false);

                //FIXME: this belongs to history, not livechart!
                webGI.livechart.requestHistory(null, null);

                webGI.options.request();
            }, 100);
        };

        ws.onmessage = function(e) {
            var msg = JSON.parse(e.data);
            console.log("websocket receiving",msg.type,msg);
            switch (msg.type) {
                case 'geigerjson-status':
                    webGI.status.update(msg);
                    webGI.livechart.now = parseInt(msg.timestamp * 1000);
                    webGI.tracer.add(parseInt(msg.data.cps_dtc));
                    break;
                case "tick":
                    webGI.ticker.play_ticks(msg.count);
                    break;
                //Log
                case "geigerjson":
                    webGI.livechart.update(msg);
                    break;
                case "history":
                    webGI.livechart.updateBacklog(msg);
                    break;
                case "static_history":
                    webGI.history.update(msg);
                    break;

                //Config
                case 'geigerconf':
                    webGI.options.update(msg);
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
        console.log("websocket sending ",msg);
        ws.send(JSON.stringify(msg))
    }

    /***************************************************************************
     * Private functions *******************************************************/


    return my;

}($));
