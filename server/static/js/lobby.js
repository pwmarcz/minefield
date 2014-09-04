
/* global Part */

function Lobby($elt) {
    var self = Part($elt, '.lobby');

    self.init = function() {
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
