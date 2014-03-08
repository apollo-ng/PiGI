//Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {}
}

//Add module to webGI namespace
webGI.options = (function($) {
    //We have jquery/zepto available ($)

    //Public attributes
    var my = {};
    my.client = {};
    my.client.show_dtc = true;
    my.server = {};
    
    
    //Private attributes
    var ws_conf = new WebSocket(webGI.conf.websocket_host+"/ws_conf");
    ws_conf.onopen = function() {
        my.request();
    }
    
    ws_conf.onmessage = function(e) {
       var msg = JSON.parse(e.data);
       //console.log(msg);
       switch(msg.type) {
            case "geigerconf":
                update(msg)
            break;

            default:
                console.log("INVALID MESSAGE",msg);
        }
    }
    
    //Public Function
    my.save = function() {
        my.server.sim_dose_rate = $('#server_cnf_sim_dose_rate').val();
        
        var cmd = {
            "cmd" : "save",
            "conf": my.server
        };
        ws_conf.send(JSON.stringify(cmd));
        console.log("Saving options");
        my.request()
    }
    
    my.request = function() {
        var cmd = {
        "cmd" : "get",
        }
        ws_conf.send(JSON.stringify(cmd));
        console.log("Requesting options");
    }
    
    //Private Function
    function update(msg) {
        console.log("Options:",msg)
        my.server.sim_dose_rate = msg.sim_dose_rate;
        $('#server_cnf_sim_dose_rate').val(my.server.sim_dose_rate);
    }
    
    //Do not forget to return my, otherwise nothing will work.
    return my;
}($));  //Pass jq/zepto to the module construction function call
