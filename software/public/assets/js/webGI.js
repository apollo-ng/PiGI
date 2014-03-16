if (typeof webGI === 'undefined') {
    webGI = {}
}

webGI.conf = {
    websocket_host : "ws://" + window.location.hostname + ":" +window.location.port,
    bell_snd : new Audio("assets/snd/ui-bell.mp3"),
    ui_action : 'click'
};

webGI.jQT = new $.jQTouch ({
    icon: 'jqtouch.png',
    statusBar: 'black-translucent',
    preloadImages: []
});

function initWebsockets() {
    if(!("WebSocket" in window)) {
        $('<p>Oh no, you need a modern browser that supports WebSockets. How about <a href="http://www.google.com/chrome">Google Chrome</a>?</p>').appendTo('#container');
        return;
    }
    webGI.websockets = {};
    webGI.websockets.log = new WebSocket(webGI.conf.websocket_host+"/ws_log");

    webGI.websockets.log.onopen = function() {
        $('#modalError').removeClass('md-show');
        requestLog(60*60*1,true);
        requestLog(60*60*24,false);
        requestHistory(null,null);
    };

    webGI.websockets.log.onclose = function() {
        webGI.websockets.log = new WebSocket(webGI.conf.websocket_host+"/ws_log");
        showErrorModal(
            'Websocket Error',
            '<p>Wheeeeh, I lost my sockets. Either the server has gone down or the network connection is unreliable or stalled.</p><b>Possible solutions:</b></p><ul><li>Is the pyGI daemon running on the Pi?</li><li>Enable/toggle your WIFI connection</li></ul>'
        );
        //console.log ("Log socket reset");
    };

    webGI.websockets.log.onmessage = function(e) {
        var msg = JSON.parse(e.data);
        //console.log(msg);
        switch(msg.type) {
            case "geigerjson":
                webGI.livechart.update(msg);
            break;
            case "history":
                webGI.livechart.updateBacklog(msg);
            break;
            case "static_history":
                webGI.history.update(msg);
            break;
            default:
                console.log("INVALID MESSAGE",msg)
        }
    }
}

function initUI() {
    // Bind UI events

    // livechart (15m/60m/24h)
    $('.live-control').bind(webGI.conf.ui_action,function(event) {
        webGI.gauge.disable();
        webGI.tracer.disable();
        webGI.livechart.enable();

        $('.live-control').removeClass('enabled');
        $('#toggleGauge,#toggleTrace').removeClass('enabled');
        $(event.target).addClass('enabled');

        updateLayout();
        webGI.livechart.set_age(parseInt($(event.target).attr("data-seconds")));
    });

    $('#lvl_val, #lvl_unit').bind(webGI.conf.ui_action,function() {
        webGI.status.show_radcon();
    });

    // CPS/CPM Toggle
    $('#count_val, #count_unit').bind(webGI.conf.ui_action,function() {
        webGI.status.toggle_counter_unit();
    });

    $('#userGeoStatus').bind(webGI.conf.ui_action,function() {
        webGI.geo.toggle();
    });

    $('#showModalDateRanger').bind(webGI.conf.ui_action,function() {
        $('#modalDateRanger').addClass('md-show');
    });

    $('#showModalAuth').bind(webGI.conf.ui_action,function() {
        $('#modalAuth').addClass('md-show');
    });

    $('#annotationSave').bind(webGI.conf.ui_action,function() {
        webGI.livechart.save_annotation();
    });

    $('#toggleGauge').bind(webGI.conf.ui_action,function() {
       $('#toggleTrace').hide(); //FIXME This is bogus???

       webGI.tracer.disable();
       webGI.livechart.disable();
       webGI.gauge.enable();

       $('#toggleGauge').addClass('enabled');
       $('.live-control, #toggleTrace').removeClass('enabled');
    });

    $('#toggleTrace').bind(webGI.conf.ui_action,function() {
       webGI.livechart.disable();
       webGI.gauge.disable();
       webGI.tracer.enable();

       $('#toggleTrace').addClass('enabled');
       $('.live-control, #toggleGauge').removeClass('enabled');
    });

    // Audio
    $('#toggleAudio').bind(webGI.conf.ui_action,function() {
        if(webGI.ticker.enabled) {
            $('#toggleAudio').removeClass('enabled');
            webGI.ticker.disable();
        } else {
            $('#toggleAudio').addClass('enabled');
            webGI.ticker.enable();
        }
    });

    $('#toggleLogScale').bind(webGI.conf.ui_action,function() {
        if(!webGI.history.log_scale) {
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
        console.log('Orientation changed to: ' + data.orientation);
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


    //Options stuff
    $('#geoSnapshot').bind(webGI.conf.ui_action,function() {
        webGI.geo.getCurrentPosition(webGI.options.geoSnapshotCallback);
    });

    $('#saveServerSettings').bind(webGI.conf.ui_action,function() {
        webGI.options.save();
    });

    $('#simRanger').bind('input', function() {
        var val = parseFloat(webGI.options.lin2log(this.value));
        if (val >= 10)
        {
            val = val.toFixed(0);
            $('#server_cnf_sim_dose_rate').css({ "color": "#F5C43C" });
        }
        else
        {
            $('#server_cnf_sim_dose_rate').css({ "color": "#75890c" });
        }
        $('#server_cnf_sim_dose_rate').val(val);
    });

    $('#server_cnf_sim_dose_rate').bind('input', function() {
        $('#simRanger').val(webGI.options.log2lin(parseFloat(this.value)));
    });




/*
    $('#jqt').bind('pageAnimationEnd', function(e, info)
    {
        console.log('Page animation finished');
        updateLayout();
    });
*/
}

function showErrorModal(title, msg, action) {
    $('#body').find('.md-modal').removeClass('md-show');
    webGI.conf.bell_snd.play();

    setTimeout(function()
    {
        $('#modalErrorTitle').html(title);
        $('#modalErrorMsg').html(msg);

        var buttons = '<a class="md-close" onclick="$(\'#modalError\').removeClass(\'md-show\');">Ack</a>';

        if (action) {
            buttons = buttons + action;
        }

        $('#modalErrorAction').html(buttons);
        $('#modalError').addClass('md-show');
    },
    300);
}

function updateLayout() {
    // This is called on DOMReady and on resize/rotate
    // FIXME: Nasty hack to keep everything in flux state :)
    //console.log("Updating Layout");

    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

    // Make the modals stack and sticky
    $('.md-modal').css({'top': '80px', 'left': (w/2)-($('#modalAuth').width()/2)+'px'})

    var h_offset = 150;
    var w_offset = 48;

    $('.instrument') .css({'height': h-100+'px'});

    var new_h = h-h_offset;
    var new_w = $('#mainInstrument').width();

    $('.instrument-container').css({'height': new_h+'px', 'width': new_w+'px'}).attr('height',new_h).attr('width',new_w);

    new_w = $('#historyInstrument').width();
    $('#historyContainer') .css({'height': new_h+'px', 'width': new_w-15+'px'}).attr('height',new_h).attr('width',new_w-15);

    //ugly, but we seem to need it
    webGI.livechart.init();
    webGI.history.init();
    webGI.gauge.init()
}

function updateConfig() {
    console.log("Writing config to local storage")
}

function requestLog(age,hd) {
    var cmd = {
        "cmd" : "read",
        "age" : age,
        "hd": hd
    }

    webGI.websockets.log.send(JSON.stringify(cmd));
    //console.log ("Requesting log (age " +webGI.log.chart_age +" )");
}

function requestHistory(from,to) {
    var cmd = {
        "cmd" : "history",
        "from" : from,
        "to" : to
    }

    webGI.websockets.log.send(JSON.stringify(cmd));
    //console.log ("Requesting history");
}

function pushAnnotation(ts,text) {
    var cmd = {
        "cmd" : "annotation",
        "timestamp" : ts,
        "text": text
    }

    webGI.websockets.log.send(JSON.stringify(cmd));
    //console.log ("Requesting history");
}

$(document).ready(function() {
    webGI.spinner.init();
    $(window).resize(updateLayout);
    window.onhashchange = updateLayout; // should have been replaced by pageAnimationEnd event but doesn't work as well

    // Switch UI click/tap event handler action for stupid apple browsers
    if ($.support.touch) { webGI.conf.ui_action = 'touchend'; }
    else { webGI.conf.ui_action  = 'click'; }

    initWebsockets();
    webGI.status.init();
    initUI();

    webGI.livechart.init()
    webGI.history.init();
    webGI.gauge.init();
    webGI.geo.init();
    updateLayout();

    setTimeout(function() {
        webGI.spinner.disable();
        $('.splash').addClass('splash-hidden');
    },500);

    //setTimeout(function () { geoToggle(); },5000);
});
