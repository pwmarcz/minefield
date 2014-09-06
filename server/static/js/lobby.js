
/* global Part */

function Lobby($elt, socket) {
    var self = Part($elt, '.lobby');
    self.state = null;

    self.init = function() {
        self.find('.new-game').click(self.new_game);
        self.find('input').keyup(function(e) {
            if (e.which == 13) {
                e.preventDefault();
                this.blur();
                self.login();
            }
        });

        self.find('input[name=nick]').val(localStorage.getItem('nick') || '');
    };

    self.new_game = function() {
        var nick = self.find('input[name=nick]').val();
        if (!self.testing)
            localStorage.setItem('nick', nick);
        self.set_state('joining');
        self.trigger('new_game', nick);
    };

    self.reset_state = function() {
        self.find('button').prop('disabled', false);
        self.find('input[name=nick]').prop('disabled', false);
        self.$elt.removeClass('joining');
    };

    self.set_state = function(state) {
        self.reset_state();
        if (state == 'joining') {
            self.find('button').prop('disabled', true);
            self.find('input[name=nick]').prop('disabled', true);
            self.$elt.addClass('joining');
        }
        self.state = state;
    };

    self.update_games = function(data) {
        function make_row(item) {
            var $row = $('<tr>');
            if (item.type == 'game') {
                $row.append($('<td>').text(item.nicks[0] || 'Anonymous'));
                $row.append($('<td class="vs">vs</td>'));
                $row.append($('<td>').text(item.nicks[1] || 'Anonymous'));
            } else if (item.type == 'player') {
                $row.append($('<td>').text(item.nick || 'Anonymous'));
                $row.append($('<td class="vs"></td>'));
                var $join_button = $('<button>Join</button>');
                if (item.is_public) {
                    $join_button.text('Join');
                    if (self.state == 'joining')
                        $join_button.prop('disabled', true);
                } else {
                    $join_button.text('private');
                    $join_button.prop('disabled', true);
                }
                $row.append($('<td>').append($join_button));
            }

            if (!(item.type == 'player' && item.is_public)) {
                $row.addClass('inactive');
            }
            return $row;
        }
        var $table = self.find('.games table');
        $table.empty();
        $.each(data, function(i, item) {
            self.find('.games table').append(make_row(item));
        });

    };

    self.init();
    return self;
}
