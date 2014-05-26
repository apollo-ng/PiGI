/*
 * History Chart/Data module
 */

//Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {};
}

//Add module to webGI namespace
webGI.history = (function($) {

    /***************************************************************************
     * Public attributes *******************************************************/

    var my = {};
    my.container_id = "historyContainer";
    my.log_scale = false;


    /***************************************************************************
     * Private attributes ******************************************************/

    var container = null;
    var chart = null;
    var data = [];
    var annotations = [];


    /***************************************************************************
     * Public functions ********************************************************/

    my.init = function() {
        if (data.length === 0) {
            return;
        }

        var objToString = function(obj) {
            var tabjson=[];
            for (var p in obj) {
                if (obj.hasOwnProperty(p)) {
                    tabjson.push('"'+p +'"'+ ':' + obj[p]);
                }
            }
            tabjson.push();
            return '{'+tabjson.join(',')+'}';
        };

        var clickCallback = function(e,z,pts) {
            alert("e: " + objToString(e));
            alert("z: " + objToString(z));
            alert("pts: " + objToString(pts));
            var x = e.offsetX;
            var y = e.offsetY;
            var dataXY = chart.toDataCoords(x, y);
            $('#eventTS').html(new Date(dataXY[0]));
            $('#eventText').val("Enter your annotation text here...");
            webGI.livechart.annotation_ts = dataXY[0] / 1000;
            $('#eventEDR').html(dataXY[1].toFixed(2));
            $('#modalAnnotation').addClass('md-show');
        };

        var annotationClickCallback = function(annotation, point) {
            webGI.livechart.annotation_ts = annotation.xval / 1000;
            $('#eventTS').html(new Date(annotation.xval));
            $('#eventEDR').html(point.yval.toFixed(2));
            $('#eventText').val(escapeHTML(annotation.text));
            $('#modalAnnotation').addClass('md-show');
        };

        var pts_info = function(e, x, pts, row) {

            var date = new Date(x).toLocaleString().split(" ");
            var str = "";
            var yRangeMaxHighlight = 0;

            for (var i = 0; i < chart.numRows(); i++) {
                if ( chart.xAxisRange()[0] <= chart.getValue(i, 0) && x >= chart.getValue(i, 0) ) {
                    yRangeMaxHighlight += chart.getValue(i, 1);
                }
            }

            str += " <b><span style=color:#003366;>accumulated</span></b>: " + yRangeMaxHighlight.toFixed(2);
			return str;
		};

        chart = new Dygraph(my.container_id, data, {
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
            rightGap: 15,
            fillAlpha: 0.7,
            fillGraph: true,
            showRoller: false,
            valueRange: [0.01, null],
            //yRangePad: 10,
            drawCallback: function(dygraph, initial) {
                var range = dygraph.yAxisRange();
                if (range[0] != 0.01) {
                    console.log("Fixing range", range);
                    range[0] = 0.01;
                    range[1] = null; //range[1]*2;
                    dygraph.updateOptions({
                        valueRange: range
                    });
                }
            },
            //zoomCallback: function(min,max,y) {
            //    webGI.history.chart.updateOptions({valueRange: [0.01, null]});
            //},
            interactionModel: {
                'touchend': clickCallback,
                'click': clickCallback

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
            labels: ['time', 'µSv/h', 'µSv/h (15m avg)'],
            xlabel: 'time',
            xLabelHeight: 25,
            colors: ['#677712', 'yellow'],
            'µSv/h': {
                fillGraph: true,
                stepPlot: true,
            },
            'µSv/h (15m avg)': {
                fillGraph: false,
            },
        });
        chart.setAnnotations(annotations);
    };

    my.update = function(msg) {
        //console.log("HISTORY");
        data = [];
        annotations = [];
        $.each(msg.log, function(i, v) {
            //var v = JSON.parse(v_json);
            var ts = new Date(v.timestamp * 1000);
            if (isNaN(ts.getTime())) {
                return;
            }
            if (v.annotation !== "") {
                annotations.push({
                    series: 'µSv/h',
                    x: v.timestamp * 1000,
                    shortText: v.annotation[0],
                    text: v.annotation
                });
            }
            data.push([ts, v.data.edr, v.data.edr_avg]);
        });

        if (!webGI.history.chart) {
            my.init();
        } else {
            chart.updateOptions({
                file: webGI.history.data
            });
            chart.setAnnotations(annotations);
        }

    };

    my.set_log_scale = function(enabled) {
        chart.updateOptions({
            logscale: enabled
        });
        my.log_scale = enabled;
    };


    /***************************************************************************
     * Private functions *******************************************************/


    return my;

}($));
