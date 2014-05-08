//Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {};
}

//Add module to webGI namespace
webGI.history = (function($) {
    //We have jquery/zepto available ($)

    //Public attributes
    var my = {};
    my.container_id = "historyContainer";
    my.log_scale = false;


    //Private attributes
    var container = null;
    var chart = null;
    var data = [];
    var annotations = [];

    //Public Function
    my.init = function() {
        if (data.length === 0)
        {
            return;
        }

        var clickCallback = function(e)
        {
            var x = e.offsetX;
            var y = e.offsetY;
            var dataXY = chart.toDataCoords(x, y);
            $('#eventTS').html(new Date(dataXY[0]));
            $('#eventText').val("Enter your annotation text here...");
            webGI.livechart.annotation_ts = dataXY[0]/1000;
            console.log("HA:",webGI.livechart.annotation_ts);
            $('#eventEDR').html(dataXY[1].toFixed(2));
            $('#modalAnnotation').addClass('md-show');
        };

        var annotationClickCallback = function(annotation, point)
        {
            console.log(annotation.xval);
            console.log(annotation.text);
            console.log(point.yval);
            console.log(point.yval);
            webGI.livechart.annotation_ts = annotation.xval/1000;
            console.log("HAA:",webGI.livechart.annotation_ts);
            $('#eventTS').html(new Date(annotation.xval));
            $('#eventEDR').html(point.yval.toFixed(2));
            $('#eventText').val(annotation.text);
            $('#modalAnnotation').addClass('md-show');
        };

        chart = new Dygraph(my.container_id, data,
        {
            //interactionModel : {
            //    'mousedown' : Dygraph.Interaction.startPan,
            //    'mousemove' : Dygraph.Interaction.movePan,
            //    'mouseup' : Dygraph.Interaction.endPan,
                //'click' : clickV3,
                //'dblclick' : dblClickV3,
            //    'mousewheel' : Dygraph.Interaction.moveZoom
            //},
            showRangeSelector: true,
            rangeSelectorPlotFillColor: '#677712',
            rangeSelectorPlotStrokeColor: '#677712',
            title: 'EAR: $$ uSv/h (AVG) - EAD: $$ uSv (Total)',
            titleHeight: 35,
            rightGap: 10,
            fillAlpha: 0.7,
            fillGraph: true,
            showRoller: true,
            valueRange: [0.01,null],
            //yRangePad: 10,
            drawCallback: function(dygraph, initial)
            {
                var range = dygraph.yAxisRange();
                if (range[0] != 0.01)
                {
                    console.log("Fixing range",range);
                    range[0] = 0.01;
                    range[1] = null; //range[1]*2;
                    dygraph.updateOptions({valueRange: range});
                }
            },
            //zoomCallback: function(min,max,y) {
            //    webGI.history.chart.updateOptions({valueRange: [0.01, null]});
            //},
            interactionModel: {
                'click' : clickCallback
            },
            annotationClickHandler: annotationClickCallback,
            /*
            clickCallback: function(e, x, pts) {
                console.log("Click " + pts_info(e,x,pts));
              },
            pointClickCallback: function(e, p) {
                console.log("Point Click " + p.name + ": " + p.x);
            },*/
            //includeZero: true,
            //connectSeparatedPoints: true,
            labels: ['time','µSv/h','µSv/h (15m avg)'],
            xlabel: 'time',
            xLabelHeight : 25,
            colors: ['#677712','yellow'],
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
        chart.setAnnotations(annotations);
    };




    my.update = function(msg) {
        //console.log("HISTORY");
        data = [];
        annotations = [];
        $.each(msg.log, function(i,v)
        {
            //var v = JSON.parse(v_json);
            var ts = new Date(v.timestamp*1000);
            if (isNaN(ts.getTime()))
            {
                return;
            }
            if(v.annotation !== "") {
                annotations.push( {
                  series: 'µSv/h',
                  x: v.timestamp*1000,
                  shortText: v.annotation[0],
                  text: v.annotation
                } );
            }
            data.push([ts,v.data.edr,v.data.edr_avg]);
        });

        if (webGI.history.chart === null)
        {
            my.init();
        }
        else
        {
            chart.updateOptions({ file: webGI.history.data });
            chart.setAnnotations(annotations);
        }

    };

    my.set_log_scale = function(enabled) {
        chart.updateOptions({ logscale: enabled });
        my.log_scale = enabled;
    };


    //Private Function


    //Do not forget to return my, otherwise nothing will work.
    return my;
}($));  //Pass jq/zepto to the module construction function call
