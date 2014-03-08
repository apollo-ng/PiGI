//Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {}
}

//Add module to webGI namespace
webGI.status = (function($) {
    //We have jquery/zepto available ($)

    //Public attributes
    var my = {};
    
    //Private attributes
    var count_unit = "CPM";
    
    //Public Function
    my.show_radcon = function() {
        $('#modalRADCON').addClass('md-show');
    };
    
    my.toggle_counter_unit = function() {
        if(count_unit=="CPM")
        {
            $('#count_unit').html('CPS');
            count_unit = "CPS";
        }
        else
        {
            $('#count_unit').html('CPM');
            count_unit = "CPM";
        }
        }
    

    my.update = function(msg) {
        if(count_unit=="CPM") $('#count_val').html(parseInt(msg.data.cpm_dtc));
        if(count_unit=="CPS") $('#count_val').html(parseInt(msg.data.cps_dtc));

        if (msg.data.source == "sim")
        {
            $('#simNotify').addClass('init-simNotify');
        }
        else
        {
            $('#simNotify').removeClass('init-simNotify');
        }


        var edr = parseFloat(msg.data.edr);

        // EDR Watchdog firing above 20% increase compared to 24h EDR avg
        /*
        if(edr > (webGI.log.edr_avg_24*1.2))
        {
            console.log('EDR Watchdog fired');

            showErrorModal(
                'RADIATION Warning',
                '<p>Wow, that tube is really cracking and sparkling now...</p>'
            );
        }*/

        // RADCON class identification and UI reaction
        var s = 0.1;

        for(var c=0;c<=8;c++)
        {
            if(edr < s)
            {
                $('#lvl_val').html(c);
                $('.rc-row').removeClass('current');
                $('#rc'+c).addClass('current');

                if(c<3)
                {
                    $('.rc-cat').removeClass('current');
                    $('#rcCatLow').addClass('current');
                    $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').removeClass('yellow red');
                    $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').addClass('green');
                    //webGI.livechart.set_colors(['#677712','yellow']);
                }
                else if (c<6)
                {
                    $('.rc-cat').removeClass('current');
                    $('#rcCatLMed').addClass('current');
                    $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').removeClass('green red');
                    $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').addClass('yellow');
                    //webGI.livechart.set_colors(['#F5C43C','yellow']);
                }
                else
                {
                    $('.rc-cat').removeClass('current');
                    $('#rcCatLHigh').addClass('current');
                    $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').removeClass('green yellow');
                    $('#edr_val, #edr_unit, #lvl_val, #lvl_unit').addClass('red');
                    //webGI.livechart.set_colors(['#ff0000','yellow']);
                }

                break;
            }
            else
            {
                s=s*10;
            }
        }

        // Automatic unit switching
        if(edr < 1000)
        {
            $('#edr_unit').html('uSv/h');
        }
        else if (edr < 1000000)
        {
            $('#edr_unit').html('mSv/h');
            edr = edr/1000;
        }
        else
        {
            $('#edr_unit').html('Sv/h');
            edr = edr/1000000;
        }

        $('#edr_val').html(edr.toFixed(2));
    }
    
    //Do not forget to return my, otherwise nothing will work.
    return my;
}($));  //Pass jq/zepto to the module construction function call
