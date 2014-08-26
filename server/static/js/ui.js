
/* global io */
/* global Table, Tiles */

function Ui($elt, socket) {
    var self = {
        $elt: $elt,
        // How long to wait with "your turn / win / lose" after dealing a tile
        discard_delay: 1000,

        discard_time_limit: 30 * 1000,
        hand_time_limit: 3 * 60 * 1000,
        clock: null,
    };

    if (socket)
        self.socket = socket;

    self.init = function() {
        self.$elt.html($('#templates > .ui').html());

        self.init_elements();
        self.init_network();

        if (window.location.hash) {
            var key = window.location.hash.slice(1);
            self.rejoin(key);
        }
    };

    self.find = function(sel) {
        return self.$elt.find(sel);
    };

    self.init_elements = function() {
        self.find('.login button').click(self.login);
        self.find('.login input').keyup(function(e) {
            if (e.which == 13) {
                e.preventDefault();
                this.blur();
                self.login();
            }
        });

        self.$elt.on('click', '.reload', function() {
            window.location.reload();
        });

        self.find('.login input[name=nick]').val(localStorage.getItem('nick') || '');

        self.set_status('Enter nick and press Login');
    };

    self.init_network = function() {
        if (!self.socket) {
            var path = window.location.pathname;
            path = path.substring(1, path.lastIndexOf('/')+1);

            self.socket = io.connect('/minefield', { reconnect: false, resource: path+'socket.io' });
            self.set_overlay('Connecting to server');
            self.socket.on('connect', self.clear_overlay);
        }

        self.socket.on('disconnect', function(data) {
            self.hide_clock();
            // Show overlay after some time - don't show it if the browser is
            // just leaving the page
            setTimeout(function() {
                self.set_overlay('Connection lost', true);
            }, 500);
        });
        self.socket.on('abort', function(data) {
            self.hide_clock();
            self.set_overlay('Game aborted', true);
            self.set_status(data.description + (data.culprit == self.player ?
                                                ' (because of you)' :
                                                ' (because of opponent)'));
        });
        self.socket.on('room', function(key) {
            window.location.hash = key;
        });
        self.socket.on('phase_one', function(data) {
            self.set_table_phase_1(data);
        });
        self.socket.on('wait_for_phase_two', function(data) {
            self.set_status('Hand accepted, waiting for opponent\'s hand');
        });
        self.socket.on('phase_two', function(data) {
            self.set_table_phase_2();
        });
        self.socket.on('your_move', function(data) {
            if (!data.replay || data.last_replay)
                self.delay(data.last_replay, self.start_move);
        });
        self.socket.on('discarded', function(data) {
            self.last_discard = data.tile;
            if (data.player == self.player) {
                if (data.replay)
                    self.table.replay_discard(data.tile);
                // Otherwise, we display our own discards immediately
            } else {
                self.table.opponent_discard(data.tile);
            }
        });
        self.socket.on('draw', function(data) {
            self.delay(data.replay, function() {
                self.find('.end-draw').show();
            });
        });
        self.socket.on('ron', function(data) {
            self.delay(data.replay, function() {
                self.display_ron(data);
            });
        });
    };

    self.delay = function(replay, func) {
        if (replay)
            func();
        else
            setTimeout(func, self.discard_delay);
    };

    self.rejoin = function(key) {
        self.socket.emit('rejoin', key);
    };

    self.login = function() {
        var nick = self.find('.login input[name=nick]').val();
        if (!self.testing)
            localStorage.setItem('nick', nick);
        self.socket.emit('hello', nick);

        self.find('.login button').prop('disabled', true);

        self.set_status('Waiting for opponent');
    };

    self.set_status = function(status) {
        self.find('.status .status-text').text(status);
    };

    self.set_overlay = function(status, show_reload) {
        self.find('.overlay').show();
        self.find('.overlay .message').text(status);
        if (show_reload)
            self.find('.overlay .reload').show();
    };

    self.clear_overlay = function() {
        self.find('.overlay').hide();
    };

    self.submit_hand = function(tiles) {
        self.socket.emit('hand', tiles);
        self.set_status('Submitting hand');
        self.on_clock_timeout(null);
    };

    self.discard_tile = function(tile_code) {
        self.socket.emit('discard', tile_code);
        self.set_status('');
        self.hide_clock();
    };

    self.set_table_phase_1 = function(data) {
        self.player = data.you;
        self.dora_ind = data.dora_ind;

        self.find('.login').hide();
        self.table = Table(
            self.find('.table'),
            {
                tiles: data.tiles,
                dora_ind: data.dora_ind,
                east: data.east,
                you: data.you
            });

        self.find('.nicks .you').text(
            data.nicks[self.player] || 'Anonymous');
        self.find('.nicks .opponent').text(
            data.nicks[1-self.player] || 'Anonymous');

        self.table.select_hand(self.submit_hand);
        self.set_status('Choose your hand and press OK');

        self.show_clock(self.hand_time_limit);
        self.on_clock_timeout(function() {
            // Just add as many tiles as will fit
            self.find('.table .tiles .tile').click();
            // Submit the hand manually
            self.find('.table .submit-hand').click();
        });
    };

    self.set_table_phase_2 = function ()
    {
        self.hide_clock();
        self.set_status('');
    };

    self.start_move = function() {
        self.set_status('Your turn!');
        self.table.discard(self.discard_tile);
        self.show_clock(self.discard_time_limit);
        self.on_clock_timeout(function() {
            // On timeout, just discard the first available tile.
            self.find('.table .tiles .tile').first().click();
        });
    };

    self.display_ron = function(data) {
        self.find('.end-ron').show();
        if (data.player == self.player)
            self.find('.end-ron .message').text('You won!');
        else
            self.find('.end-ron .message').text('You lost!');
        Tiles.add(self.find('.end-ron .winning-hand'), data.hand);
        /* Display winning tile next to winning hand */
        var $winning_tile = self.find(
            '.end-ron .winning-hand ' +
                '.tile[data-tile='+self.last_discard+']').first();
        $winning_tile.detach();
        self.find('.end-ron .winning-hand').
            append($('<div class="tile-placeholder">')).
            append($winning_tile);
        Tiles.add(self.find('.end-ron .doras-ind'),
                  [self.dora_ind, data.uradora_ind]);

        function add_yaku(yaku) {
            self.find('.end-ron .yaku').append($('<li>').text(yaku));
        }
        if (!data.yakuman)
            add_yaku('riichi');
        $.each(data.yaku, function(i, yaku) { add_yaku(yaku); });
        if (!data.yakuman && data.dora > 0)
            add_yaku('dora '+data.dora);

        self.find('.end-ron .points').text(data.points);
        self.find('.end-ron .limit').text(
            ['?', 'mangan', 'haneman', 'baiman', 'sanbaiman', 'yakuman'][data.limit]);
    };

    self.show_clock = function(time_limit) {
        self.clock = {};
        self.clock.start = new Date();
        self.clock.time_limit = time_limit;
        self.clock.on_timeout = null;
        self.find('.clock').show();
        self.update_clock();
    };

    self.on_clock_timeout = function(on_timeout) {
        if (!self.clock)
            return;

        self.clock.on_timeout = on_timeout;
    };

    self.update_clock = function() {
        if (!self.clock)
            return;

        setTimeout(self.update_clock, 100);

        var now = new Date();
        var remaining_ms =
            self.clock.start.getTime() + self.clock.time_limit - now.getTime();
        var remaining_seconds = Math.ceil(remaining_ms / 1000);

        function pad_zeros(number, n) {
            var s = number.toString();
            while (s.length < n)
                s = '0' + s;
            return s;
        }

        if (remaining_seconds > 0) {
            var $clock = self.find('.clock');
            $clock.text(
                Math.floor(remaining_seconds / 60) +
                ':' +
                pad_zeros(remaining_seconds % 60, 2));
            if (remaining_seconds <= 10)
                $clock.addClass('warning');
            else
                $clock.removeClass('warning');
        } else {
            var on_timeout = self.clock.on_timeout;
            self.hide_clock();
            if (on_timeout)
                on_timeout();
        }
    };

    self.hide_clock = function() {
        if (!self.clock)
            return;
        self.clock = null;
        self.find('.clock').hide();
    };

    self.test_phase_1 = function() {
        self.set_table_phase_1({
            nicks: ['Akagi', 'Washizu'],
            tiles: ['M1', 'M2', 'M3', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3',
                    'M1', 'M2', 'M3', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3'],
            dora_ind: 'M1',
            east: 0,
            you: 0
        });
    };

    self.test_phase_2 = function() {
        self.test_phase_1();
        // add as many tiles as will fit
        self.find('.tiles .tile').click();
        self.table.on_select_hand = function () {};
        self.table.select_hand_complete();
        self.set_table_phase_2();
    };

    self.test_ron = function() {
        self.test_phase_2();
        self.last_discard = 'S1';
        self.display_ron({
            player: 0,
            hand: ['M1', 'M1', 'M2', 'M2', 'M3', 'M3',
                   'P1', 'P1', 'P2', 'P2', 'P3', 'P3', 'S1', 'S1'],
            yaku: ['Polish Riichi', 'Ban Tan'],
            dora: 3,
            uradora_ind: 'X1',
            points: 7,
            limit: 3
        });
    };

    self.init();
    return self;
}
