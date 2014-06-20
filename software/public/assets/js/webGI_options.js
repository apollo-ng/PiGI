/*
 * Client/Server options & configuration management module
 */

// Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {};
}

// Add module to webGI namespace
webGI.options = (function($) {

    /***************************************************************************
     * Public attributes *******************************************************/

    var my = {
        server: {},
        client: {
            show_dtc: true
        }
    };


    /***************************************************************************
     * Private attributes ******************************************************/



    /***************************************************************************
     * Public functions ********************************************************/

    my.save = function() {

        my.server.sim_dose_rate = parseFloat($('#server_cnf_sim_dose_rate').val());

        // Get OpMode
        if ($('#server_cnf_gps_mode_mobile').is(':checked')) {
            my.server.opmode = "mobile";
        } else {
            my.server.opmode = "stationary";
            my.server.lat = parseFloat($('#server_cnf_node_lat').val());
            my.server.lon = parseFloat($('#server_cnf_node_lon').val());
            my.server.alt = parseFloat($('#server_cnf_node_alt').val());
        }

        // Get Source Selection
        if ($('#server_cnf_source_env').is(':checked')) {
            my.server.source = "env";
        } else if ($('#server_cnf_source_test').is(':checked')) {
            my.server.source = "test";
        } else if ($('#server_cnf_source_sim').is(':checked')) {
            my.server.source = "sim";
        }

        // Get Window/Sensitivity/Capability
        if ($('#cgw_abc').is(':checked')) {
            my.server.window = "abc";
        } else if ($('#cgw_bc').is(':checked')) {
            my.server.window = "bc";
        } else if ($('#cgw_c').is(':checked')) {
            my.server.window = "c";
        }

        // Get Entropy Generator Setting
        my.server.entropy = $('#server_cnf_entropy_enabled').is(':checked');

        var cmd = {
            "cmd": "save",
            "conf": my.server
        };

        webGI.websocket.send(cmd);
        console.log("Saving options", my.server);
        my.request();
    };

    my.request = function() {

        var cmd = {
            'cmd': 'get'
        };

        webGI.websocket.send(cmd);
    };

    my.reset = function() {
        console.log("clear pyGI conf/dynamic.cfg");
        webGI.websocket.send({"cmd": "resetDynamicCfg"});
        my.request();
    };

    my.startEntropyDownload = function() {
        var hiddenIFrameID = 'hiddenDownloader',
        iframe = document.getElementById(hiddenIFrameID);
        if (iframe === null) {
            iframe = document.createElement('iframe');
            iframe.id = hiddenIFrameID;
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }
        iframe.src = "/webGI/data/entropy.bin";
    };

    my.resetEntropy = function() {
        console.log("Resetting entropy");
        webGI.websocket.send({"cmd": "resetEntropy"});
        my.request();
    };

    my.lin2log = function(position) {

        var minp = 0;
        var maxp = 100;
        var minv = Math.log(0.01);
        var maxv = Math.log(1000);
        var scale = (maxv - minv) / (maxp - minp);
        return Math.exp(minv + scale * (position - minp));
    };

    my.log2lin = function(value) {

        var minp = 0;
        var maxp = 100;
        var minv = Math.log(0.01);
        var maxv = Math.log(1000);
        var scale = (maxv - minv) / (maxp - minp);
        return (Math.log(value) - minv) / scale + minp;
    };

    my.geoSnapshotCallback = function(position) {

        //console.log(position);
        $('#server_cnf_node_lat').val(position.coords.latitude.toFixed(5));
        $('#server_cnf_node_lon').val(position.coords.longitude.toFixed(5));
        $('#server_cnf_node_alt').val(position.coords.altitude);
    };

    my.addOptionCheckbox = function(parent_id, id, label, checked) {

        checked = (typeof checked === "undefined") ? false : checked;
        var content = '<li class="option_checkbox">';
        content += '<input type="checkbox" id="' + id + '" ' + (checked ? 'checked="checked"' : '') + ' />';
        content += '<label for="' + id + '">';
        content += '<span class="input_container"></span>';
        content += '<span class="label_text">' + label + '</span>';
        content += '</label>';
        content += '</li>';
        $('#' + parent_id).append(content);
    };

    my.update = function(msg) {
        //console.log("Options:", msg);
        document.getElementById('cnf_node_uuid').innerHTML = msg.uuid;
        document.getElementById('cnf_node_name').innerHTML = msg.name;
        //$('#cnf_node_uuid').text(msg.uuid);
        //$('#cnf_node_name').text(msg.name);

        // OPMode
        if (msg.opmode === "stationary") {
            $('#server_cnf_gps_mode_stationary').prop('checked', true);
        } else if (msg.opmode === "mobile") {
            $('#server_cnf_gps_mode_mobile').prop('checked', true);
        }

        // Geostamp
        document.getElementById('server_cnf_node_lat').value = msg.lat;
        document.getElementById('server_cnf_node_lon').value = msg.lon;
        document.getElementById('server_cnf_node_alt').value = msg.alt;
        //$('#server_cnf_node_lat').val(msg.lat);
        //$('#server_cnf_node_lon').val(msg.lon);
        //$('#server_cnf_node_alt').val(msg.alt);

        // Data Sources
        $('#server_cnf_source_' + msg.source).prop('checked', true);

        // Window/Capabilties/Sensitivity
        $('#cgw_' + msg.window).prop('checked', true);

        // Tick Simulator Dose Rate
        my.server.sim_dose_rate = msg.sim_dose_rate;

        document.getElementById('simRanger').value = webGI.options.log2lin(my.server.sim_dose_rate);
        //$('#simRanger').val(webGI.options.log2lin(my.server.sim_dose_rate));

        if (my.server.sim_dose_rate >= 10) {
            my.server.sim_dose_rate = my.server.sim_dose_rate.toFixed(0);
            $('#server_cnf_sim_dose_rate').css({
                "color": "#F5C43C"
            });
        } else {
            $('#server_cnf_sim_dose_rate').css({
                "color": "#75890c"
            });
        }

        document.getElementById('server_cnf_sim_dose_rate').value = my.server.sim_dose_rate;
        //$('#server_cnf_sim_dose_rate').val(my.server.sim_dose_rate);

        // Entropy Generator
        if (msg.entropy === false) {
            $('#server_cnf_entropy_disabled').prop('checked', true);
        } else {
            $('#server_cnf_entropy_enabled').prop('checked', true);
        }

        document.getElementById('server_entropy_pool').value = msg.entropy_pool;
        //$('#server_entropy_pool').val(msg.entropy_pool);
    }
    /***************************************************************************
     * Private functions *******************************************************/




    return my;

}($));
