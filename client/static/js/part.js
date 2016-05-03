
function Part($elt, template_sel) {
    var self = {
        $elt: $elt,
        find: function(sel) { return self.$elt.find(sel); },
        handlers: {},
    };

    self.init = function() {
        self.$elt.html($('#templates > ' + template_sel).html());
    };

    self.on = function(event, handler) {
        self.handlers[event] = handler;
    };

    self.trigger = function(event) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (self.handlers[event])
            self.handlers[event].apply(null, args);
    };

    self.init();
    return self;
}
