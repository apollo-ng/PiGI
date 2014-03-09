//Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {}
}

//Add module to webGI namespace
webGI.livechart = (function($) {
    //We have jquery/zepto available ($)

    //Public attributes
    var my = {};
    my.container_id = "chartContainer";
    my.chart_age = 60*15;
    my.now = Date.now();

    //Private attributes
    var container = null;
    var chart = null
    var data = [];
    var data_hd = [];
    var data_ld = [];
    var desired_range = null;
    var animtimer = null;
    var annotation_ts = null;
    var annotations = [];
    var edr_avg_24h = 0.1; //FIXME this does not belong here
    var chart_colors = ['#677712','yellow'];

    //Public Function
    my.init = function() {
        container = $("#"+my.container_id);
        //console.log("Init log");
        if (data.length==0)
        {
            return;
        }

        var clickCallback = function(e) {
            var x = e.offsetX;
            var y = e.offsetY;
            var dataXY = chart.toDataCoords(x, y);
            $('#eventTS').html(new Date(dataXY[0]));
            annotation_ts = dataXY[0]/1000;
            $('#eventEDR').html(dataXY[1].toFixed(2));
            $('#modalAnnotation').addClass('md-show');
        }
        
        my.save_annotation = function() {
            var annotation_text = $('#eventText').val();
            console.log(annotation_ts,annotation_text);
            pushAnnotation(annotation_ts,annotation_text);
            requestLog(60*60*1,true);
        };

        chart = new Dygraph(my.container_id, data,
        {
            title: 'EAR: $$ uSv/h (AVG) - EAD: $$ uSv (Total)',
            titleHeight: 35,
            fillGraph: true,
            rightGap: 20,
            fillAlpha: 0.7,
            showRoller: false,
            rollPeriod: 1,
            interactionModel: {
                'click' : clickCallback
            },
            //valueRange: [0,null],
            includeZero: true,
            animatedZooms: true,
            labels: ['time','µSv/h','µSv/h (15m avg)'],
            xlabel: 'time',
            colors: chart_colors,
            'µSv/h':
            {
                fillGraph: true,
                stepPlot: true,
            },
            'µSv/h (15m avg)':
            {
                fillGraph: false,
            },

        });
    }

    my.update = function(msg) {
        //console.log("UPDATE")

        var ts = new Date(msg.timestamp*1000);
        data_hd.push([ts,msg.data.edr,msg.data.edr_avg]);

        //FIXME: push ld data less often
        data_ld.push([ts,msg.data.edr,msg.data.edr_avg]);

        var left_end_ld = new Date((msg.timestamp-60*60*24)*1000)
        while(data_ld[0][0] < left_end_ld) data_ld.shift();

        var left_end_hd = new Date((msg.timestamp-60*60*1)*1000)
        while(data_hd[0][0] < left_end_hd) data_hd.shift();


        chart.updateOptions({
            file: data,
            dateWindow: [ my.now - my.chart_age*1000, my.now]
        });
    }

    my.updateBacklog = function(msg){
        
        //console.log("LOGHISTORY");
        if (msg.hd) {
            annotations = [];
            data_hd = [];
            $.each(msg.log, function(i,v)
            {
                var ts = new Date(v.timestamp*1000);
                //var ts = v.timestamp*1000
                //if (isNaN(ts.getTime()))
                //{
                //    return;
                //}
                if(! v.annotation == "") {
                    annotations.push( {
                      series: 'µSv/h',
                      x: v.timestamp*1000,
                      shortText: "X",
                      text: v.annotation
                    } );
                }
                data_hd.push([ts,v.data.edr,v.data.edr_avg]);
            });
        } else {
            data_ld = [];
            var edr_avg=0;

            $.each(msg.log, function(i,v)
            {
                var ts = new Date(v.timestamp*1000);
                //var ts = v.timestamp*1000
                //if (isNaN(ts.getTime()))
                //{
                //    return;
                //}
                data_ld.push([ts,v.data.edr,v.data.edr_avg]);
                edr_avg += v.data.edr;

            });

            // Update rolling 24h average EDR for alert reference
            edr_avg_24 = (edr_avg/msg.log.length);
        }

        //FIXME: this is very redundant with set_age, refactor...
        var age = my.chart_age;
        if (age > 60*60*1) {
            data = data_ld;
            //console.log("LD")
        } else {
            data = data_hd;
            //console.log("HD",webGI.log.data.length)
        }
        if (chart == null) {
            my.init();
        } else {
            chart.updateOptions({
                file: data,
                dateWindow: [ my.now - my.chart_age*1000, my.now]
            });
        }
        console.log(annotations);
        chart.setAnnotations(annotations);
    }


    my.set_log_scale = function(enabled) {
        if (chart) chart.updateOptions({ logscale: enabled });
        my.log_scale = enabled;
    }

    my.set_colors = function(c) {
        if (chart) chart.updateOptions({ colors: c });
        my.chart_colors = c
    }
    
    my.set_age = function(seconds) {
        my.chart_age = seconds
        if (animtimer != null) {
            clearTimeout(animtimer);
        }


        if (seconds > 60*60*1) {
            data = data_ld;
        } else {
            data = data_hd;
        }

        if (chart == null)
        {
            my.init();
        } else {
            chart.updateOptions({
                file: data,
                dateWindow: desired_range
            });
        }
        zoom(my.chart_age*1000);
    };

    my.enable = function() {
        container.show()
    };

    my.disable = function() {
        container.hide()
    };

    //Private Function
    function chartApproachRange() {
        if (!desired_range) return;
        // go halfway there
        var range = chart.xAxisRange();
        if (Math.abs(desired_range[0] - range[0]) < 60 &&
            Math.abs(desired_range[1] - range[1]) < 60) {
            if (my.chart_age > 60*60*1) {
                data = data_ld;
            } else {
                data = data_hd;
            }

        chart.updateOptions({
            dateWindow: desired_range,
            file: data
        });
          // (do not set another timeout.)
        } else {
          var new_range;
          new_range = [0.5 * (desired_range[0] + range[0]),
                       0.5 * (desired_range[1] + range[1])];
          chart.updateOptions({dateWindow: new_range});
          chartAnimate();
        }
    }

    function chartAnimate() {
        animtimer = setTimeout(chartApproachRange, 50);
    }

    function zoom (age) {
        var w = chart.xAxisRange();
        desired_range = [ my.now-age, my.now];
        chartAnimate();
    }

    //Do not forget to return my, otherwise nothing will work.
    return my;
}($));  //Pass jq/zepto to the module construction function call
