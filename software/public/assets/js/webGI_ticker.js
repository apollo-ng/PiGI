// Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {};
}

// Add module to webGI namespace
webGI.ticker = (function($) {
    // We have jquery/zepto available ($)

    // Public attributes
    var my = {};
    my.enabled = false;

    // Private attributes
    var ws_ticks = null;
    var tick_snd = new Audio("assets/snd/tock.wav");

    // Public Functions
    my.init = function()
    {
        // Add Checkbox to client settings panel
        webGI.options.addOptionCheckbox('client_settings', 'cnf_silent', 'Silent Mode (No Audio Feedback/Alerts)');
    };

    my.enable = function()
    {
        my.enabled=true;
        ws_ticks = new WebSocket(webGI.conf.websocket_host+"/ws_ticks");
        ws_ticks.onmessage = function(e)
        {
            x = JSON.parse(e.data);
           //console.log(x);
           switch(x.type)
           {
               case "tick":
                    if (my.enabled) {
                        for(var i = 0; i < parseInt(x.count); i++)
                        {
                            setTimeout(function() {
                                tick_snd.play();
                            }, Math.random()*200);
                        }
                    }
               break;
               default:
            }
        };
    };

    my.disable = function()
    {
        my.enabled=false;
        ws_ticks.close();
    };

    // Private Function

    //Do not forget to return my, otherwise nothing will work.
    return my;
}($));  //Pass jq/zepto to the module construction function call
