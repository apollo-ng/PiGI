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
        my.server.sim_dose_rate = parseFloat($('#server_cnf_sim_dose_rate').val());

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
        //console.log("Requesting options");
    }

    my.lin2log = function(position) {
        var minp = 0;
        var maxp = 100;
        var minv = Math.log(0.01);
        var maxv = Math.log(1000);
        var scale = (maxv-minv) / (maxp-minp);
        return (Math.exp(minv + scale*(position-minp))).toFixed(2);
    }

    my.log2lin = function(value) {
        var minp = 0;
        var maxp = 100;
        var minv = Math.log(0.01);
        var maxv = Math.log(1000);
        var scale = (maxv-minv) / (maxp-minp);
        return ((Math.log(value)-minv) / scale + minp).toFixed(2);
    }

    my.geoSnapshotCallback = function (position) {
        //console.log(position);
        $('#server_cnf_node_lat').val(position.coords.latitude.toFixed(5));
        $('#server_cnf_node_lon').val(position.coords.longitude.toFixed(5));
        $('#server_cnf_node_alt').val(position.coords.altitude);

    }

    //Private Function
    function update(msg) {
        //console.log("Options:",msg)
        my.server.sim_dose_rate = msg.sim_dose_rate;
        $('#server_cnf_sim_dose_rate').val(my.server.sim_dose_rate);
        $('#simRanger').val(webGI.options.log2lin(my.server.sim_dose_rate));
    }

    //Do not forget to return my, otherwise nothing will work.
    return my;
}($));  //Pass jq/zepto to the module construction function call
