//This is a template for webGI modules
//Copy and extend...

//Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {}
}

//Add module to webGI namespace
webGI.gauge = (function($) {
    //We have jquery/zepto available ($)

    //Public attributes
    var my = {};
    my.container_id = "gaugeContainer";
    
    //Private attributes
    var container = null;
    var gauge = null
    
    //Public Function
    my.init = function() {
        var opts = {
            lines: 1,
            angle: 0.15,
            lineWidth: 0.05,
            pointer: {
                length: 0.9,
                strokeWidth: 0.015,
                color: '#d8d3c5'
            },
            limitmMax: 'true',
            colorStart: '#75890c',
            colorStop: '#75890c',
            strokeColor: '#000000'
        };

        var target = document.getElementById(my.container_id);
        container = $("#"+my.container_id);
        gauge = new Gauge(target).setOptions(opts);
        gauge.maxValue = 1;
        gauge.animationSpeed = 64;
        gauge.set(0);
    }

    my.enable = function() {
        container.show()
    }
    
    my.disable = function() {
        container.hide()
    }
    
    my.set = function(val) {
        gauge.set(val)
    }
    
    //Private Function
    function private_function() {
        console.log(private_attr);
    }
    
    //Do not forget to return my, otherwise nothing will work.
    return my;
}($));  //Pass jq/zepto to the module construction function call
