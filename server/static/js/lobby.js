
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

    self.update_games = function(data) {
        function make_row(item) {
            var $row = $('<tr>');
            if (item.type == 'game') {
                $row.append($('<td>').text(item.nick1));
                $row.append($('<td class="vs">vs</td>'));
                $row.append($('<td>').text(item.nick2));
            } else if (item.type == 'player') {
                $row.append($('<td>').text(item.nick1));
                $row.append($('<td class="vs">vs</td>'));
                if (item.is_public)
                    $row.append($('<td>').append('<button>Challenge</button>'));
                else
                    $row.append($('<td>').append('<button disabled>private</button>'));
            }

            if (!(item.type == 'player' && item.is_public)) {
                $row.addClass('inactive');
            }
            return $row;
        }
        var $table = self.find('.games table');
        // TODO the proper jQuery call
        $table.html('');
        $table.append(
            $('<tr>')
                .append('<td><button>New game</button></td>')
                .append('<td class="vs">')
                .append('<td>')
        );
        $.each(data, function(i, item) {
            self.find('.games table').append(make_row(item));
        });

    };

    self.init();

    self.update_games([
        {type: 'game', 'nick1': 'Lorem', 'nick2': 'Ipsum'},
        {type: 'player', 'nick1': 'Lorem'},
        {type: 'player', 'nick1': 'Lorem', is_public: true},
        {type: 'player', 'nick1': 'Ipsum', is_public: false},
    ]);
    return self;
}
