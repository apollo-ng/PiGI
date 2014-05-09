/*
 * Client enabled geolocation helper module
 */

//Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {};
}

// Add module to webGI namespace
webGI.geo = (function($) {

    /***************************************************************************
     * Public attributes *******************************************************/

    var my = {};


    /***************************************************************************
     * Private attributes ******************************************************/

    var lat = 0;
    var lon = 0;
    var alt = 0;
    var acc = 0;
    var watcher = null;
    var container_status = null;
    var container_loc = null;


    /***************************************************************************
     * Public functions ********************************************************/

    my.init = function() {

        // Add Checkbox to client settings panel
        // and set check status according to config
        webGI.options.addOptionCheckbox(
            'client_settings',
            'cnf_gps_hacc',
            'GPS High Accuracy Mode',
            (webGI.conf.gps_hacc === 1) ? true : false
        );

        container_status = $('#userGeoStatus');
        container_loc = $('#userGeoLoc');
    };

    my.toggle = function() {

        if (navigator.geolocation) {
            if (watcher) {
                navigator.geolocation.clearWatch(watcher);
                watcher = null;
                container_status.removeClass('init-blinker icon-dot-circled lock-green lock-yellow lock-red');
                container_status.addClass('icon-target-1');
                container_loc.html('');
            } else {
                container_status.addClass('init-blinker');

                watcher = navigator.geolocation.watchPosition(
                    geoUpdate,
                    geoError, {
                        enableHighAccuracy: (webGI.conf.gps_hacc === 1) ? true : false,
                        timeout: 60,
                        maximumAge: 5
                    }
                );
            }
        } else {
            container_loc.html('');
            showErrorModal(
                'Geolocation unavailable',
                '<p>It seems your browser/device does not support geolocation</p>'
            );
        }
    };

    my.getCurrentPosition = function(callback) {
        navigator.geolocation.getCurrentPosition(callback);
    };


    /***************************************************************************
     * Private functions *******************************************************/

    function geoUpdate(position) {

        container_status.removeClass('init-blinker icon-target-1');
        container_status.addClass('icon-dot-circled');

        // Update lock circle to indicate GeoLocation accuracy
        if (position.coords.accuracy < 10) {
            container_status.removeClass('lock-red lock-yellow');
            container_status.addClass('lock-green');
        } else if (position.coords.accuracy < 25) {
            container_status.removeClass('lock-red lock-green');
            container_status.addClass('lock-yellow');
        } else {
            container_status.removeClass('lock-yellow lock-green');
            container_status.addClass('lock-red');
        }

        lat = position.coords.latitude;
        lon = position.coords.longitude;
        alt = position.coords.altitude;
        acc = position.coords.accuracy;

        container_loc.html(
            position.coords.latitude.toString().substr(0, 8) + ' ' +
            position.coords.longitude.toString().substr(0, 8)
        );
    }

    function geoError(error) {

        var errors = {
            1: 'Permission denied',
            2: 'Position unavailable',
            3: 'Request timeout',
            4: 'Unknown Error'
        };

        container_status.removeClass('init-blinker icon-dot-circled lock-green lock-yellow lock-red');
        container_status.addClass('icon-target-1');
        container_loc.html('');

        navigator.geolocation.clearWatch(watcher);

        showErrorModal(
            'Geolocation unavailable',
            '<p>Hmmm, unfortunately, I still could not really determine our location. The browser/device told me:</p> <p><h4>' + errors[error.code] + '</h4></p><b>Possible solutions:</b></p><ul><li>Turn on your GPS</li><li>Allow the browser to share geolocation</li></ul>'
        );
    }


    return my;

}($));
