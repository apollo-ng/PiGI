/*
 * This is a skeleton template for webGI modules
 * Just copy and extend...
 */

// Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {};
}

// Add module_name to webGI namespace
webGI.module_name = (function($) {

    /***************************************************************************
     * Public attributes *******************************************************/

    var my = {
        public_attribute : 'foo'
    };


    /***************************************************************************
     * Private attributes ******************************************************/

    var private_attribute = 'bar';


    /***************************************************************************
     * Public functions ********************************************************/

    my.public_function = function() {
        console.log(my.public_attribute);
        private_function();
    };


    /***************************************************************************
     * Private functions *******************************************************/

    function private_function() {
        console.log(private_attribute);
    }


    return my; // Do not forget to return my, otherwise nothing will work.
}($));  // Pass jq/zepto to the module construction function call
