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

        // Get OpMode
        if ($('#server_cnf_gps_mode_mobile').is(':checked')){
            my.server.opmode = "mobile";
        } else {
            my.server.opmode = "stationary";
            my.server.lat = parseFloat($('#server_cnf_node_lat').val());
            my.server.lon = parseFloat($('#server_cnf_node_lon').val());
            my.server.alt = parseFloat($('#server_cnf_node_alt').val());
        };

        // Get Source Selection
        if ($('#server_cnf_source_env').is(':checked')){
            my.server.source = "env";
        } else if ($('#server_cnf_source_test').is(':checked')){
            my.server.source = "test";
        } else if ($('#server_cnf_source_sim').is(':checked')){
            my.server.source = "sim";
        }

        // Get Window/Sensitivity/Capability
        if ($('#cgw_abc').is(':checked')){
            my.server.window = "abc";
        } else if ($('#cgw_bc').is(':checked')){
            my.server.window = "bc";
        } else if ($('#cgw_c').is(':checked')){
            my.server.window = "c";
        }

        // Get Entropy Generator Setting
        my.server.entropy=$('#server_cnf_entropy_enabled').is(':checked')

        var cmd = {
            "cmd" : "save",
            "conf": my.server
        };
        ws_conf.send(JSON.stringify(cmd));
        console.log("Saving options", my.server);
        my.request()
    }

    my.request = function() {
        var cmd = {
        "cmd" : "get",
        }
        ws_conf.send(JSON.stringify(cmd));
        //console.log("Requesting options");
    }

    my.reset = function() {
        console.log("FIXME: I should clear pyGI conf/dynamic.cfg");
    }

    my.startEntropyDownload = function() {
        console.log("FIXME: I should trigger the download/delete routine in pyGI");
    }

    my.lin2log = function(position) {
        var minp = 0;
        var maxp = 100;
        var minv = Math.log(0.01);
        var maxv = Math.log(1000);
        var scale = (maxv-minv) / (maxp-minp);
        return Math.exp(minv + scale*(position-minp));
    }

    my.log2lin = function(value) {
        var minp = 0;
        var maxp = 100;
        var minv = Math.log(0.01);
        var maxv = Math.log(1000);
        var scale = (maxv-minv) / (maxp-minp);
        return (Math.log(value)-minv) / scale + minp;
    }

    my.geoSnapshotCallback = function (position) {
        //console.log(position);
        $('#server_cnf_node_lat').val(position.coords.latitude.toFixed(5));
        $('#server_cnf_node_lon').val(position.coords.longitude.toFixed(5));
        $('#server_cnf_node_alt').val(position.coords.altitude);
    }

    my.addOptionCheckbox = function (parent_id, id, label, checked) {
        checked = (typeof checked === "undefined") ? false : checked;
        var content  = '<li class="option_checkbox">';
            content += '<input type="checkbox" id="' + id + '" '+(checked ? 'checked="checked"' : '')+' />';
            content += '<label for="' + id + '">';
            content += '<span class="input_container"></span>';
            content += '<span class="label_text">' + label + '</span>';
            content += '</label>';
            content += '</li>';
        $('#'+parent_id).append(content);
    }


    //Private Function
    function update(msg) {
        console.log("Options:",msg)
        $('#cnf_node_uuid').text(msg.uuid);
        $('#cnf_node_name').text(msg.name);

        my.server.sim_dose_rate = msg.sim_dose_rate;
        $('#simRanger').val(webGI.options.log2lin(my.server.sim_dose_rate));

        if (my.server.sim_dose_rate >= 10)
        {
            my.server.sim_dose_rate = my.server.sim_dose_rate.toFixed(0);
            $('#server_cnf_sim_dose_rate').css({ "color": "#F5C43C" });
        }
        else
        {
            $('#server_cnf_sim_dose_rate').css({ "color": "#75890c" });
        }

        $('#server_cnf_sim_dose_rate').val(my.server.sim_dose_rate);

        $('#server_cnf_node_lat').val(msg.lat);
        $('#server_cnf_node_lon').val(msg.lon);
        $('#server_cnf_node_alt').val(msg.alt);

        if(msg.opmode==="stationary"){
            $('#server_cnf_gps_mode_stationary').prop('checked',true);
        } else if (msg.opmode==="mobile") {
            $('#server_cnf_gps_mode_mobile').prop('checked',true);
        }

        $('#server_cnf_entropy_enabled').prop('checked',msg.entropy);
        $('#server_entropy_pool').val(msg.entropy_pool);

        $('#server_cnf_source_'+msg.source).prop('checked',true);

        $('#cgw_'+msg.window).prop('checked',true);

    }

    //Do not forget to return my, otherwise nothing will work.
    return my;
}($));  //Pass jq/zepto to the module construction function call
