if (typeof webGI === 'undefined') {
    webGI = {};
}

if (typeof getConfig() === 'undefined') {

webGI.conf = {
    websocket_host: "ws://" + window.location.hostname + ":" + window.location.port,
    bell_snd: new Audio("assets/snd/ui-bell.mp3"),
    ui_action: 'tap',
    alerts_enabled: 1,
    dtc_enabled: 1,
    gps_hacc: 0
};

} else
{
    getConfig();
}

webGI.jQT = new $.jQTouch({
    icon: 'jqtouch.png',
    statusBar: 'black-translucent',
    useFastTouch: true,
    preloadImages: []
});

function initUI() {
    $('#cnf_ws_url').val("ws://" + window.location.hostname + ":" + window.location.port);

    // Bind UI events

    // livechart (15m/60m/24h)
    $('.live-control').bind(webGI.conf.ui_action, function(event) {

        $('#toggleGauge,#toggleTrace').removeClass('enabled');
        $('.live-control').removeClass('enabled');
        $(this).addClass('enabled');

        webGI.status.disable();
        webGI.tracer.disable();
        webGI.livechart.enable();
        updateLayout();
        webGI.livechart.set_age(parseInt($(this).attr("data-seconds")));

    });

    $('#lvl_val, #lvl_unit').bind(webGI.conf.ui_action, function() {
        webGI.status.show_radcon();
    });

    // CPS/CPM Toggle
    $('#count_val, #count_unit').bind(webGI.conf.ui_action, function() {
        webGI.status.toggle_counter_unit();
    });

    $('#userGeoStatus').bind(webGI.conf.ui_action, function() {
        webGI.geo.toggle();
    });

    $('#showModalDateRanger').bind(webGI.conf.ui_action, function() {
        $('#modalDateRanger').addClass('md-show');
    });

    $('#showModalAuth').bind(webGI.conf.ui_action, function() {
        $('#modalAuth').addClass('md-show');
    });

    $('#showModalResetEntropy').bind(webGI.conf.ui_action, function() {
        $('#modalResetEntropy').addClass('md-show');
    });

    $('#showModalResetSettings').bind(webGI.conf.ui_action, function() {
        $('#modalResetSettings').addClass('md-show');
    });

    $('#annotationSave').bind(webGI.conf.ui_action, function() {
        webGI.livechart.save_annotation();
    });

    $('#toggleGauge').bind(webGI.conf.ui_action, function() {
        $('#toggleTrace').hide(); //FIXME This is bogus???

        webGI.tracer.disable();
        webGI.livechart.disable();
        webGI.status.enable();
        updateLayout();

        $('#toggleGauge').addClass('enabled');
        $('.live-control, #toggleTrace').removeClass('enabled');
    });

    $('#toggleTrace').bind(webGI.conf.ui_action, function() {
        webGI.livechart.disable();
        webGI.status.disable();
        webGI.tracer.enable();
        updateLayout();

        $('#toggleTrace').addClass('enabled');
        $('.live-control, #toggleGauge').removeClass('enabled');
    });

    // Audio
    $('#toggleAudio').bind(webGI.conf.ui_action, function() {
        if (webGI.ticker.enabled) {
            $('#toggleAudio').removeClass('enabled');
            $('#toggleAudio span:first-child').removeClass('icon-tick-on');
            $('#toggleAudio span:first-child').addClass('icon-tick-off');
            webGI.ticker.disable();
        } else {
            $('#toggleAudio').addClass('enabled');
            $('#toggleAudio span:first-child').removeClass('icon-tick-off');
            $('#toggleAudio span:first-child').addClass('icon-tick-on');
            webGI.ticker.enable();
        }
    });

    $('#toggleLogScale').bind(webGI.conf.ui_action, function() {
        if (!webGI.history.log_scale) {
            webGI.history.set_log_scale(true);
            $('#toggleLogScale').addClass('enabled');
        } else {
            webGI.history.set_log_scale(false);
            $('#toggleLogScale').removeClass('enabled');
        }
    });

    // Page animation callback events
    $('#jqt').bind('pageAnimationStart', function(e, info) {
        //console.log('Page animation started');
    });

    // Orientation change callback event
    $('#jqt').bind('turn', function(e, data) {
        alert('Orientation changed to: ' + data.orientation);
        $('#jqt').removeClass('portrait');
        $('#jqt').addClass('landscape');
        updateLayout();
    });

    // First working swipe handler test harness. Let's see how we like it
    $('#mainPanel').swipeLeft(function() {
        webGI.jQT.goTo('#historyPanel', 'slideleft');
    });

    $('#mainPanel').swipeRight(function() {
        webGI.jQT.goTo('#optionsPanel', 'slideright');
    });

    $('#optionsPanel').swipeLeft(function() {
        webGI.jQT.goTo('#mainPanel', 'slideleft');
    });

    $('#geoSnapshot').bind(webGI.conf.ui_action, function() {
        webGI.geo.getCurrentPosition(webGI.options.geoSnapshotCallback);
    });

    $('#saveServerSettings').bind(webGI.conf.ui_action, function() {
        webGI.options.save();
    });

    $('#reloadSettings').bind(webGI.conf.ui_action, function() {
        webGI.options.request();
    });

    $('#resetSettings').bind(webGI.conf.ui_action, function() {
        webGI.options.reset();
    });

    $('#startEntropyDownload').bind(webGI.conf.ui_action, function() {
        webGI.options.startEntropyDownload();
    });

    $('#resetEntropy').bind(webGI.conf.ui_action, function() {
        webGI.options.resetEntropy();
    });


    $('#simRanger').bind('input', function() {
        var val = webGI.options.lin2log(this.value);

        if (val >= 10) {
            val = val.toFixed(0);
            $('#server_cnf_sim_dose_rate').css({
                "color": "#F5C43C"
            });
        } else {
            val = val.toFixed(2);
            $('#server_cnf_sim_dose_rate').css({
                "color": "#75890c"
            });
        }

        //$('#server_cnf_sim_dose_rate').val(val);
        document.getElementById("server_cnf_sim_dose_rate").value = val;
    });

    $('#server_cnf_sim_dose_rate').bind('input', function() {
        //$('#simRanger').val(webGI.options.log2lin(this.valueAsNumber));
        document.getElementById("simRanger").value = webGI.options.log2lin(this.valueAsNumber);
        var val = webGI.options.lin2log(this.valueAsNumber);

        if (val >= 10) {
            $('#server_cnf_sim_dose_rate').css({
                "color": "#F5C43C"
            });
        } else {
            $('#server_cnf_sim_dose_rate').css({
                "color": "#75890c"
            });
        }
    });

    /*
    $('#jqt').bind('pageAnimationEnd', function(e, info)
    {
        console.log('Page animation finished');
        updateLayout();
    });*/
}

function showErrorModal(title, msg, action) {
    //$('#body').find('.md-modal').removeClass('md-show');
    $('.md-show').removeClass('md-show');
    webGI.conf.bell_snd.play();

    setTimeout(function() {
            document.getElementById("modalErrorTitle").innerHTML = title;
            //$('#modalErrorTitle').html(title);
            document.getElementById("modalErrorMsg").innerHTML = msg;
            //$('#modalErrorMsg').html(msg);

            var buttons = '<a class="md-close" onclick="$(\'#modalError\').removeClass(\'md-show\');">Close</a>';

            if (action) {
                buttons = buttons + action;
            }

            //$('#modalErrorAction').html(buttons);
            document.getElementById("modalErrorAction").innerHTML = buttons;
            $('#modalError').addClass('md-show');
        },
        500);
}

function popModal(type, title, msg, action) {
    //$('#body').find('.md-modal').removeClass('md-show');
    $('.md-show').removeClass('md-show');
    webGI.conf.bell_snd.play();

    setTimeout(function() {
            document.getElementById("modalErrorTitle").innerHTML = title;
            //$('#modalErrorTitle').html(title);
            document.getElementById("modalErrorMsg").innerHTML = msg;
            //$('#modalErrorMsg').html(msg);

            var buttons = '<a class="md-close" onclick="$(\'#modalError\').removeClass(\'md-show\');">Ack</a>';

            if (action) {
                buttons = buttons + action;
            }

            //$('#modalErrorAction').html(buttons);
            document.getElementById("modalErrorAction").innerHTML = buttons;
            $('#modalError').addClass('md-show');
        },
        200);
}

function updateLayout() {
    // This is called on DOMReady and on resize/rotate
    // FIXME: Nasty hack to keep everything in flux state :)

    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

    // Make the modals stack and sticky
    $('.modal').css({
        'top': '80px',
        'left': (w / 2) - ($('#modalAuth').width() / 2) + 'px'
    });

    var h_offset = 137;
    var w_offset = 0;

    $('.instrument').css({
        'height': h - 85 + 'px'
    });

    var new_h = h - h_offset;
    var new_w = $('#mainInstrument').width();

    $('.instrument-container').css({
        'height': new_h + 'px',
        'width': new_w + 'px'
    }).attr('height', new_h).attr('width', new_w);
    $('#traceCanvas').css({
        'height': new_h + 'px',
        'width': new_w + 'px'
    }).attr('height', new_h).attr('width', new_w);

    new_w = $('#historyInstrument').width();
    $('#historyContainer').css({
        'height': new_h + 'px',
        'width': new_w + 'px'
    }).attr('height', new_h).attr('width', new_w);

    //ugly, but we seem to need it
    webGI.livechart.init();
    webGI.history.init();
}

function saveConfig() {
    console.log("Writing config to local storage");
    localStorage.setItem('webGI-localconf', JSON.stringify(webGI.conf));
}

function getConfig() {
    var localConf = localStorage.getItem('webGI-localconf');
    console.log('Getting local webGI.conf: ', JSON.parse(localConf));
}

function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

$(document).ready(function() {

    // Make sure we've got a capable browser
    if (!("WebSocket" in window)) {
        $('<p>Oh no, you need a modern browser that supports WebSockets. How about <a href="http://www.chromium.org/">Chromium</a>?</p>').appendTo('#container');
        return;
    }
    webGI.websocket.init();
    webGI.status.init();
    webGI.geo.init();
    webGI.ticker.init();
    webGI.alert.init();
    // Set callbacks to updateLayout on window resize and url-hash change (panels)
    // Should have been replaced by pageAnimationEnd event but doesn't work as well
    $(window).resize(updateLayout);
    window.onhashchange = updateLayout;

    // Switch UI click/tap event handler action for stupid apple browsers
    if ($.support.touch) {
        webGI.conf.ui_action = 'tap';
    } else {
        webGI.conf.ui_action = 'click';
    }

    initUI();

    // Give client some time to settle
    setTimeout(function() {
        $('.splash').addClass('splash-hidden');
        updateLayout();
    }, 1200);

});
