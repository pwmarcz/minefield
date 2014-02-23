
/* jshint undef: true */
/* global console, alert */
/* global $ */
/* global io */
/* global Table, Tiles */

function Ui($elt, socket) {
    var self = {
        $elt: $elt,
        state: 'login',
    };

    if (socket)
        self.socket = socket;

    self.init = function() {
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

        function update_submit() {
            self.find('.submit-hand').prop(
                'disabled',
                self.find('.hand > .tile').length < 13);
        }

        update_submit();

        self.$elt.on('click', '.tiles .tile', function() {
            if (self.state == 'phase_1') {
                if (self.find('.hand > .tile').length >= 13)
                    return;

                self.add_tile_to_hand($(this));
                update_submit();
            } else if (self.state == 'phase_2' && self.my_move) {
                self.discard_tile($(this));
            }
        });

        self.$elt.on('click', '.hand .tile', function() {
            if (self.state == 'phase_1') {
                self.remove_tile_from_hand($(this));
                update_submit();
            }
        });

        self.$elt.on('click', '.submit-hand', function() {
            if (self.state == 'phase_1')
                self.submit_hand();
        });

        self.set_status('Enter nick and press Login');
    };

    self.init_network = function() {
        if (!self.socket)
            self.socket = io.connect('/minefield');

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
            self.set_status('Your turn!');
            self.my_move = true;
        });
        self.socket.on('discarded', function(data) {
            // We display our own discards immediately
            if (data.player == self.player)
                return;
            self.find('.opponent-discards').append(Tiles.create(data.tile));
        });
        self.socket.on('draw', function(data) {
            self.find('.table').hide();
            self.find('.end-draw').show();
        });
        self.socket.on('ron', function(data) {
            self.display_ron(data);
        });
    };

    self.login = function() {
        self.state = 'login_wait';

        var nick = self.find('.login input[name=nick]').val();
        self.socket.emit('hello', nick);

        self.find('.login').hide();

        self.set_status('Logging in');
    };

    self.set_status = function(status) {
        self.find('.status').text(status);
    };

    self.submit_hand = function() {
        self.state = 'phase_1_wait';

        var tiles = [];
        self.find(".hand").children().each(function() {
            tiles.push($(this).attr("data-tile"));
        });
        self.socket.emit('hand', tiles);
        self.set_status('Submitting hand');
        self.find('.submit-hand').prop('disabled', true);
    };

    self.add_tile_to_hand = function($tile) {
        $tile.replaceWith(Tiles.create_placeholder($tile));
        $tile.appendTo(self.find('.hand'));
        Tiles.sort(self.find('.hand'));
    };

    self.remove_tile_from_hand = function($tile) {
        var tile_code = $tile.data('tile');
        $tile.detach();
        $tile.replaceAll(self.find('.tiles .tile-placeholder[data-tile='+tile_code+']').first());
    };

    self.discard_tile = function($tile) {
        var tile_code = $tile.data('tile');
        self.socket.emit('discard', tile_code);
        $tile.replaceWith(Tiles.create_placeholder($tile));
        $tile.appendTo(self.find('.discards'));
        // (don't sort tiles)
        self.my_move = false;
        self.set_status('');
    };

    self.set_table_phase_1 = function(data) {
        self.state = 'phase_1';
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

        self.set_status('Choose your hand and press OK');
    };

    self.set_table_phase_2 = function ()
    {
        self.state = 'phase_2';
        self.my_move = false;
        self.find('.table').removeClass('phase-one').addClass('phase-two');
        // TODO:
        // move disposable space & hand to make space for discarded tiles
        // display discarded tiles
        // display turn marker
        self.set_status('');
    };

    self.display_ron = function(data) {
        self.find('.table').hide();
        self.find('.end-ron').show();
        if (data.player == self.player)
            self.find('.end-ron .message').text('You won!');
        else
            self.find('.end-ron .message').text('You lost!');
        Tiles.add(self.find('.end-ron .winning-hand'), data.hand);
        Tiles.add(self.find('.end-ron .doras-ind'),
                  [self.dora_ind, data.uradora_ind]);

        function add_yaku(yaku) {
            self.find('.end-ron .yaku').append($('<li>').text(yaku));
        }
        $.each(data.yaku, function(i, yaku) { add_yaku(yaku); });
        if (data.dora > 0)
            add_yaku('Dora '+data.dora);

        $('.end-ron .points').text(data.points);
    };

    self.test_phase_1 = function() {
        self.set_table_phase_1({
            tiles: ['M1', 'M2', 'M3', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3',
                    'M1', 'M2', 'M3', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3'],
            dora_ind: 'M1',
            east: 0,
            you: 0});
    };

    self.test_phase_2 = function() {
        self.test_phase_1();
        // add as many tiles as will fit
        self.find('.tiles .tile').click();
        self.set_table_phase_2();
    };

    self.test_ron = function() {
        self.test_phase_2();
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
