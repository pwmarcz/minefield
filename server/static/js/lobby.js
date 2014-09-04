
function Lobby($elt) {
    var self = {
        $elt: $elt,
        find: function(sel) { return self.$elt.find(sel); },
        handlers: {},
    };

    self.init = function() {
        self.$elt.html($('#templates > .lobby').html());

        self.find('button').click(self.login);
        self.find('input').keyup(function(e) {
            if (e.which == 13) {
                e.preventDefault();
                this.blur();
                self.login();
            }
        });

        self.find('.login input[name=nick]').val(localStorage.getItem('nick') || '');
    };

    self.on = function(event, handler) {
        self.handlers[event] = handler;
    };

    self.trigger = function(event, arg) {
        if (self.handlers[event])
            self.handlers[event](arg);
    };

    self.login = function() {
        var nick = self.find('input[name=nick]').val();
        if (!self.testing)
            localStorage.setItem('nick', nick);
        self.find('.login button').prop('disabled', true);
        self.trigger('login', nick);
    };

    self.init();
    return self;
}
