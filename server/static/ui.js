
/* jshint undef: true */
/* global console, alert */
/* global $ */
/* global io */

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
            self.find('.opponent-discards').append(create_tile(data.tile));
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
        $tile.replaceWith(create_tile_placeholder($tile));
        $tile.appendTo(self.find('.hand'));
        sort_tiles(self.find('.hand'));
    };

    self.remove_tile_from_hand = function($tile) {
        var tile_code = $tile.data('tile');
        $tile.detach();
        $tile.replaceAll(self.find('.tiles .tile-placeholder[data-tile='+tile_code+']').first());
    };

    self.discard_tile = function($tile) {
        var tile_code = $tile.data('tile');
        self.socket.emit('discard', tile_code);
        $tile.detach().appendTo(self.find('.discards'));
        // (don't sort tiles)
        self.my_move = false;
        self.set_status('');
    };

    self.set_table_phase_1 = function(data) {
        self.state = 'phase_1';
        self.player = data.you;

        self.find('.login').hide();
        self.find('.table').show();

        self.find(".hand").empty();
        self.find(".tiles").empty();

        // create tiles & add them to .tiles
        for (var i=0; i < data.tiles.length; ++i) {
            self.find(".tiles").append(create_tile(data.tiles[i]));
        }
        sort_tiles(self.find('.tiles'));

        var $wind = $("<img/>");
        if (data.player == data.you)
            $wind.attr('src', 'tiles/E.svg');
        else
            $wind.attr('src', 'tiles/W.svg');
        self.find(".east-display").append($wind);

        self.find(".dora-display").append(create_tile(data.dora_ind));

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

    self.init();
    return self;
}


function create_tile(tile_type)
{
    var newtile = $('<div class="tile"/>');
    newtile.append($("<img/>").attr('src', 'tiles/'+tile_type+'.svg'));
    newtile.attr("data-tile", tile_type);
    return newtile;
}

function create_tile_placeholder($tile) {
    var tile_code = $tile.data('tile');
    return $('<div class="tile-placeholder">').attr('data-tile', tile_code);
}

function sort_tiles(container) {
    container.children('.tile').sort(function(tile1, tile2) {
        var code1 = $(tile1).data('tile'), code2 = $(tile2).data('tile');
        if (code1 < code2)
                return -1;
        else if (code1 > code2)
            return 1;
        else
            return 0;
    }).appendTo(container);
}
