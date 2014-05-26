/*
 * Alert module
 */

// Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {};
}

// Add alert module to webGI namespace
webGI.alert = (function($) {

    /***************************************************************************
     * Public attributes *******************************************************/

    var my = {
        enabled: true
    };


    /***************************************************************************
     * Private attributes ******************************************************/

    var alert_snd = new Audio('assets/snd/ui-bell.mp3');
    var radcon_alert_ack_lvl = 0;
    var radcon_alert_last_ts = 0;


    /***************************************************************************
     * Public functions ********************************************************/

    my.init = function() {

        // Add Checkboxes to client settings panel
        // and set check status according to config

        webGI.options.addOptionCheckbox(
            'client_settings',
            'cnf_alerts_enabled',
            'Radiation Alerts',
            my.enabled
        );

    };

    my.enable = function() {
        my.enabled = true;
    };

    my.disable = function() {
        my.enabled = false;
    };

    my.ack_new_lvl = function(lvl) {

        radcon_alert_ack_lvl = lvl;
        $('#modalError').removeClass('md-show');
    };

    my.analyze = function(edr, lvl) {

        if(my.enabled === true) {
            check_radcon_lvl_change(lvl);
        } else {
            return;
        }
    };


    /***************************************************************************
     * Private functions *******************************************************/

    function check_radcon_lvl_change(lvl) {

        var ts = Math.round(new Date().getTime() / 1000);
        if (lvl > radcon_alert_ack_lvl && ts - radcon_alert_last_ts > 10) {
            radcon_alert_last_ts = ts;
            showErrorModal(
                'RADIATION Warning',
                '<p>RADCON level increased to <b>' + lvl + '</b></p>',
                '<a class="md-close md-green" onclick="webGI.alert.ack_new_lvl(' + lvl + ')">Acknowledged</a>'
            );
        } else if (lvl < radcon_alert_ack_lvl) {
            radcon_alert_ack_lvl = lvl;
        }
    }

    function edr_watchdog(edr) {

        if(edr > (webGI.log.edr_avg_24*1.2))
        {
            console.log('EDR Watchdog fired');

            showErrorModal(
                'RADIATION Warning',
                '<p>Wow, that tube is really cracking and sparkling now...</p>'
            );
        }
    }


    return my;

}($));
