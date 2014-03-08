//This is a template for webGI modules
//Copy and extend...

//Create webGI object if neccessary
if (typeof webGI === 'undefined') {
    webGI = {}
}

//Add module to webGI namespace
webGI.module_name = (function($) {
    //We have jquery/zepto available ($)

    //Public attributes
    var my = {};
    my.public_attribute = "foo";
    
    //Private attributes
    var private_attribute = "bar";
    
    //Public Function
    my.public_function = function() {
        console.log(my.public_attribute);
        private_function();
    };
    
    //Private Function
    function private_function() {
        console.log(private_attr);
    }
    
    //Do not forget to return my, otherwise nothing will work.
    return my;
}($));  //Pass jq/zepto to the module construction function call
