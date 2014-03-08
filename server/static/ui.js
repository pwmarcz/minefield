
/* global io */
/* global Table, Tiles */

function Ui($elt, socket) {
    var self = {
        $elt: $elt,
        // How long to wait with "your turn / win / lose" after dealing a tile
        discard_delay: 1000,

        discard_time_limit: 30 * 1000,
        clock: null,
    };

    if (socket)
        self.socket = socket;

    self.init = function() {
        self.$elt.html($('#templates > .ui').html());

        self.init_elements();
        self.init_network();
    };

    self.find = function(sel) {
        return self.$elt.find(sel);
    };

    self.init_elements = function() {
        self.$elt.on('click', '.login button', function() {
            self.login();
        });
        self.set_status('Enter nick and press Login');
    };

    self.init_network = function() {
        if (!self.socket) {
            self.socket = io.connect('/minefield');
            self.set_overlay('Connecting to server');
            self.socket.on('connect', self.clear_overlay);
        }

        self.socket.on('disconnect', function(data) {
            self.set_overlay('Connection lost :(');
            // don't reconnect - we're not able to restart a game
            self.socket.disconnect();
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
            setTimeout(self.start_move, self.discard_delay);
        });
        self.socket.on('discarded', function(data) {
            self.last_discard = data.tile;
            // We display our own discards immediately
            if (data.player == self.player)
                return;
            self.table.opponent_discard(data.tile);
        });
        self.socket.on('draw', function(data) {
            setTimeout(function() {
                self.find('.table').hide();
                self.find('.end-draw').show();
            }, self.discard_delay);
        });
        self.socket.on('ron', function(data) {
            setTimeout(function() {
                self.display_ron(data);
            }, self.discard_delay);
        });
    };

    self.login = function() {
        var nick = self.find('.login input[name=nick]').val();
        self.socket.emit('hello', nick);

        self.find('.login button').prop('disabled', true);

        self.set_status('Waiting for opponent');
    };

    self.set_status = function(status) {
        self.find('.status .status-text').text(status);
    };

    self.set_overlay = function(status) {
        self.find('.overlay').show();
        self.find('.overlay div').text(status);
    };

    self.clear_overlay = function() {
        self.find('.overlay').hide();
    };

    self.submit_hand = function(tiles) {
        self.socket.emit('hand', tiles);
        self.set_status('Submitting hand');
        self.find('.submit-hand').prop('disabled', true);
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
        self.find('.table').show();

        self.find('.nicks .you').text(
            data.nicks[self.player] || 'Anonymous');
        self.find('.nicks .opponent').text(
            data.nicks[1-self.player] || 'Anonymous');

        self.table.select_hand(self.submit_hand);
        self.set_status('Choose your hand and press OK');
    };

    self.set_table_phase_2 = function ()
    {
        // TODO:
        // move disposable space & hand to make space for discarded tiles
        // display discarded tiles
        // display turn marker
        self.set_status('');
    };

    self.start_move = function() {
        self.set_status('Your turn!');
        self.table.discard(self.discard_tile);
        self.show_clock(self.discard_time_limit, function() {
            // On timeout, just discard the first available tile.
            console.log('aaa');
            self.find('.table .tiles .tile').first().click();
        });
    };

    self.display_ron = function(data) {
        self.find('.table').hide();
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
            append($('<div class="tile placeholder">')).
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
    };

    self.show_clock = function(time_limit, on_timeout) {
        self.clock = {};
        self.clock.start = new Date();
        self.clock.time_limit = time_limit;
        self.clock.on_timeout = on_timeout;
        self.clock.timer_id = setTimeout(self.update_clock, 0);
        self.find('.clock').show();
    };

    self.update_clock = function() {
        self.clock.timer_id = setTimeout(self.update_clock, 100);

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

        if (remaining_seconds >= 0) {
            var $clock = self.find('.clock');
            $clock.text(
                Math.floor(remaining_seconds / 60) +
                ':' +
                pad_zeros(remaining_seconds % 60, 2));
            $clock.data('seconds', remaining_seconds);
            if (remaining_seconds <= 10)
                $clock.addClass('warning');
            else
                $clock.removeClass('warning');
        } else {
            var on_timeout = self.clock.on_timeout;
            self.hide_clock();
            on_timeout();
        }
    };

    self.hide_clock = function() {
        clearTimeout(self.clock.timer_id);
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
        self.start_move();
    };

    self.test_ron = function() {
        self.test_phase_2();
        self.last_discard = 'S1';
        self.display_ron({
            player: 0,
            hand: ['S1', 'S1', 'S2', 'S3', 'S4'],
            yaku: ['Polish Riichi', 'Ban Tan'],
            dora: 3,
            uradora_ind: 'X1',
            points: 7
        });
    };

    self.init();
    return self;
}
