/*
 * Audio feedback/tick module
 */

// Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {};
}

// Add ticker module to webGI namespace
webGI.ticker = (function($) {

    /***************************************************************************
     * Public attributes *******************************************************/

    var my = {
        enabled: false
    };


    /***************************************************************************
     * Private attributes ******************************************************/

    var tick_snd = new Audio("assets/snd/tock.wav");


    /***************************************************************************
     * Public functions ********************************************************/

    my.init = function() {
        // Add Checkbox to client settings panel
        webGI.options.addOptionCheckbox(
            'client_settings',
            'cnf_silent',
            'Silent Mode (No Audio Feedback/Alerts)'
        );
    };

    my.play_ticks = function(count) {
        if (my.enabled) {
            for (var i = 0; i < parseInt(count); i++) {
                setTimeout(function() {
                    tick_snd.play();
                }, Math.random() * 200);
            }
        }
    }
    my.enable = function() {
        my.enabled = true;
        webGI.websocket.send({"cmd":"send_ticks","state":"on"});
    };

    my.disable = function() {
        my.enabled = false;
        webGI.websocket.send({"cmd":"send_ticks","state":"off"});
    };


    /***************************************************************************
     * Private functions *******************************************************/


    return my;

}($));
