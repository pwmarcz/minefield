
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

    self.trigger = function(event, arg) {
        if (self.handlers[event])
            self.handlers[event](arg);
    };

    self.init();
    return self;
}
