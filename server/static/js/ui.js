
/* global io */
/* global Part, Lobby, Table, Tiles */

function Ui($elt, socket) {
    var self = Part($elt, '.ui');
    // How long to wait with "your turn / win / lose" after dealing a tile
    self.discard_delay = 1000;
    self.clock = null;

    if (socket)
        self.socket = socket;

    self.init = function() {
        self.init_network();
        self.init_elements();

        var key = self.get_key();
        if (key) {
            self.rejoin(key);
        }
    };

    self.init_elements = function() {
        self.lobby = Lobby(self.find('.lobby'), self.socket);
        self.lobby.on('join_failed', function(message) {
            self.set_status(message);
        });

        self.$elt.on('click', '.reload', function() {
            window.location.reload();
        });
    };

    self.init_network = function() {
        if (!self.socket) {
            var path = window.location.pathname;
            path = path.substring(1, path.lastIndexOf('/')+1);

            self.socket = io.connect('/minefield', {
                reconnect: false,
                resource: path+'socket.io',
                'sync disconnect on unload': true,
            });
            self.set_overlay('Connecting to server');
            self.socket.on('connect', self.clear_overlay);
        }

        $(window).unload(function() {
            self.unloading = true;
        });

        self.socket.on('disconnect', function(data) {
            self.hide_clock();
            // Show overlay after some time - don't show it if the browser is
            // just leaving the page
            setTimeout(function() {
                if (!self.unloading) {
                    self.set_overlay('Reconnecting...');
                    setTimeout(function() { window.location.reload(); }, 300);
                }
            }, 300);
        });
        self.socket.on('abort', function(data) {
            self.set_key("");
            self.hide_clock();
            self.set_overlay('Game aborted', true);
            var message = data.description;
            if (data.culprit)
                message += (data.culprit == self.player ?
                            ' (rule violation by you)' :
                            ' (rule violation by opponent)');
            self.set_status(message);
        });
        self.socket.on('room', function(data) {
            self.lobby.set_state('inactive');
            self.set_key(data.key);
            self.player = data.you;
            self.set_nicks(data.nicks[self.player], data.nicks[1-self.player]);
        });
        self.socket.on('phase_one', function(data) {
            self.set_table_phase_1(data);
        });
        self.socket.on('wait_for_phase_two', function(data) {
            self.set_status('Hand accepted, waiting for opponent\'s hand');
        });
        self.socket.on('hand', function(data) {
            if (data.replay) {
                self.table.replay_hand(data.hand);
            }
        });
        self.socket.on('phase_two', function(data) {
            self.set_table_phase_2();
        });
        self.socket.on('your_move', function(data) {
            self.delay(data.replay, self.start_move);
        });
        self.socket.on('discarded', function(data) {
            self.last_discard = data.tile;
            if (data.player == self.player) {
                if (data.replay) {
                    self.table.replay_discard(data.tile);
                    self.set_status('');
                }
                // Otherwise, we displayed our own discard already.
            } else {
                self.table.opponent_discard(data.tile);
            }
        });
        self.socket.on('draw', function(data) {
            self.delay(data.replay, function() {
                self.set_key("");
                self.find('.end-draw').show();
            });
        });
        self.socket.on('ron', function(data) {
            self.delay(data.replay, function() {
                self.set_key("");
                self.display_ron(data);
            });
        });
        self.socket.on('clock', function(data) {
            if (typeof data.time_limit == 'number') {
                var time_limit_ms = data.time_limit * 1000;
                if (self.table.state == 'select_hand') {
                    self.show_clock(time_limit_ms);
                } else {
                    // Hack: this is discard, so we don't don't show the clock
                    // immediately (so that the player doesn't have a clue
                    // whether the opponent won or not).
                    setTimeout(function() {
                        self.show_clock(time_limit_ms - self.discard_delay);
                    }, self.discard_delay);
                }
            } else {
                self.hide_clock();
            }
        });
    };

    self.get_key = function() { return window.location.hash.slice(1); };
    self.set_key = function(key) { window.location.hash = key; };

    self.set_nicks = function(your_nick, opponent_nick) {
        self.find('.nicks .you').text(
            your_nick || 'Anonymous');
        self.find('.nicks .opponent').text(
            opponent_nick || 'Anonymous');
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

    self.new_game = function(nick) {
        self.socket.emit('new_game', nick);
        self.set_status('Waiting for opponent');
    };

    self.join = function(nick, key) {
        self.socket.emit('join', nick, key);
        self.set_status('Starting game');
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
    };

    self.discard_tile = function(tile_code) {
        self.socket.emit('discard', tile_code);
        self.set_status('');
    };

    self.init_table = function(data) {
        self.table = Table(
            self.find('.table'),
            {
                tiles: data.tiles,
                dora_ind: data.dora_ind,
                east: data.east,
                you: data.you
            });

        self.table.on('select_hand', self.submit_hand);
        self.table.on('discard', self.discard_tile);
    };

    self.set_table_phase_1 = function(data) {
        self.player = data.you;
        self.dora_ind = data.dora_ind;
        self.game_started = true;

        self.find('.lobby').hide();

        self.init_table(data);

        self.table.set_state('select_hand');
        self.set_status('Choose your hand and press OK');
    };

    self.set_table_phase_2 = function ()
    {
        self.set_status('');
    };

    self.start_move = function() {
        self.set_status('Your turn!');
        self.table.set_state('discard');
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
            self.hide_clock();
            self.clock_timeout();
        }
    };

    self.hide_clock = function() {
        if (!self.clock)
            return;
        self.clock = null;
        self.find('.clock').hide();
    };

    self.clock_timeout = function() {
        if (self.table.state == 'select_hand') {
            // Just add as many tiles as will fit
            self.find('.table .tiles .tile').click();
            // Submit the hand manually
            self.find('.table .submit-hand').click();
        }
        if (self.table.state == 'discard') {
            self.find('.table .tiles .tile').first().click();
        }
    };

    self.test_phase_1 = function() {
        self.set_nicks('Akagi', 'Washizu');
        self.set_table_phase_1({
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
        self.table.reset_state();
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
