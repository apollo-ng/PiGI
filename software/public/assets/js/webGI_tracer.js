/*
 * 2D/hardware accelerated canvas particle tracer/visualizer
 */

// Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {};
}

// Add tracer module to webGI namespace
webGI.tracer = (function($) {

    /***************************************************************************
     * Public attributes *******************************************************/

    var my = {
        container_id: 'traceContainer',
        canvas_id: 'traceCanvas'
    };


    /***************************************************************************
     * Private attributes ******************************************************/

    var particles = {};
    var draw_interval = null;
    var active = false;


    /***************************************************************************
     * Public functions ********************************************************/

    my.enable = function() {

        $('#' + my.container_id).show();
        active = true;
        canvas = document.getElementById(my.canvas_id);
        var ctx = canvas.getContext('2d');
        particles = {};
        draw_interval = setInterval(draw, 33);
    };

    my.disable = function() {

        $('#' + my.container_id).hide();
        particles = {};
        active = false;
        if (draw_interval !== null) clearInterval(draw_interval);
    };

    my.add = function(amount) {

        if (active) {
            for (var i = 0; i < amount; i++) {
                setTimeout(function() {
                    particles[Math.random()] = new createParticle();
                },
                Math.random() * 1000);
            }
        }
    };


    /***************************************************************************
     * Private functions *******************************************************/

    function createParticle() {

        var b = Math.random() * 128 + 128 >> 0;
        this.color = 'rgba(' + b + ',' + b + ',' + b + ',0.6)';

        this.x = Math.random() * canvas.width;
        this.y = 0; //-Math.random()*webGI.trace.canvas.height;

        this.vx = 0;
        this.vy = Math.random() * 4 + 2;
    }

    function draw() {

        var W = canvas.width;
        var H = canvas.height;
        var ctx = canvas.getContext('2d');

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(30,30,30, 0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';

        // Lets draw particles from the array now
        $.each(particles, function(t, p) {

            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 1, p.vy);
            ctx.fillStyle = 'rgba(117,137,12,1)';
            ctx.fillRect(p.x, p.y + p.vy, 1, 2);

            p.x += p.vx;
            p.y += p.vy;
            p.vy += Math.random() * p.y / 25;

            // To prevent the balls from moving out of the canvas
            if (p.x < -50) p.x = W + 50;
            if (p.y < -50) p.y = H + 50;
            if (p.x > W) p.x = -50;
            if (p.y > H) {
                delete particles[t];
            }
        });
    }


    return my;

}($));
