
/* jshint undef: true */
/* global console, alert */
/* global $ */
/* global io */

function Ui($elt, socket) {
    var self = {
        $elt: $elt
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

        self.$elt.on('click', '.tiles .tile', function() {
            if (self.find('.hand > .tile').length >= 13)
                return;

            $(this).detach().appendTo('.hand');
            sort_tiles(self.find('.hand'));
        });

        self.$elt.on('click', '.hand .tile', function() {
            $(this).detach().appendTo('.tiles');
            sort_tiles(self.find('.tiles'));
        });

        self.$elt.on('click', '.submit-hand', function() {
            self.submit_hand();
        });

        self.set_status('Enter nick and press Login');
    };

    self.init_network = function() {
        if (!self.socket)
            self.socket = io.connect('/minefield');

        self.socket.on('phase_one', function(data) {
            self.set_table_phase_1(data.tiles, data.dora_ind, data.east);
            console.log('phase_one',data);
            self.set_status('Choose your hand and press OK');
        });
        self.socket.on('wait_for_phase_two', function(data) {
            self.set_status('Player accepted, waiting for match');
        });
    };

    self.login = function() {
        var nick = self.find('.login input[name=nick]').val();
        self.socket.emit('hello', nick);

        self.find('.login').hide();

        self.set_status('Logging in');
    };

    self.set_status = function(status) {
        self.find('.status').text(status);
    };

    self.submit_hand = function() {
        if (self.find(".hand").children().length === 13) {
            var tiles = [];
            self.find(".hand").children().each(function() {
                tiles.push($(this).attr("data-tile"));
            });
            self.socket.emit('hand', tiles);
            self.set_status('Submitting hand');
            self.find('.submit-hand').prop('disabled', true);
        }
        else {
            alert("You have to have 13 tiles on hand!");
        }
    };

    self.set_table_phase_1 = function(tiles, dora, east) {
        self.find('.login').hide();
        self.find('.table').show();

        self.find(".hand").empty();
        self.find(".tiles").empty();

        // create tiles & add them to .tiles
        for (var i=0; i < tiles.length; ++i) {
            self.find(".tiles").append(create_tile(tiles[i]));
        }
        sort_tiles(self.find('.tiles'));

        self.find('.hand').addClass("outlined");

        // TODO: place east
        self.find(".east-display").append($("<img/>").attr('src', 'tiles/E.svg'));

        self.find(".dora-display").append(create_tile(dora));
    };

    self.set_table_phase_2 = function (start)
    {
        // TODO:
        // move disposable space & hand to make space for discarded tiles
        self.find(".hand, .tiles").removeClass("connectedSortable");
        self.find(".hand").removeClass("outlined");
        // display discarded tiles
        // display turn marker
    };

    self.test = function() {
        self.set_table_phase_1(
            ['M1', 'M2', 'M3', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3',
             'M1', 'M2', 'M3', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3',
            ], "M1", true);
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
