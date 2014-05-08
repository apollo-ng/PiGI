//Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {};
}

//Add module to webGI namespace
webGI.spinner = (function() {

    //Public attributes
    var my = {};

    //Private attributes
    var spinner = null;

    //Public Function
    my.init = function() {
        var opts =
        {
            lines: 14, // The number of lines to draw
            length: 30, // The length of each line
            width: 11, // The line thickness
            radius: 45, // The radius of the inner circle
            corners: 1, // Corner roundness (0..1)
            rotate: 0, // The rotation offset
            direction: 1, // 1: clockwise, -1: counterclockwise
            color: 'rgba(216, 211, 197, 0.9)', // #rgb or #rrggbb or array of colors
            speed: 0.8, // Rounds per second
            trail: 60, // Afterglow percentage
            shadow: true, // Whether to render a shadow
            hwaccel: true, // Whether to use hardware acceleration
            className: 'spinner', // The CSS class to assign to the spinner
            zIndex: 2e9, // The z-index (defaults to 2000000000)
            top: '150px', // Top position relative to parent in px
            left: 'auto' // Left position relative to parent in px
        };

        //console.log(document.getElementById('body'));
        spinner = new Spinner(opts).spin(document.getElementById('body'));
        //disable();
    };

    my.enable = function() {
        spinner.spin(document.getElementById('body'));
    };

    my.disable = function() {
        spinner.stop();
    };

    //Create the spinner immedeatly
    //FIXME does not work, body is not ready :(
    //my.init();

    //Do not forget to return my, otherwise nothing will work.
    return my;
}());
