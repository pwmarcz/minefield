
/* jshint undef: true */
/* global console, alert */
/* global $ */
/* global io */

function Ui($elt) {
    this.$elt = $elt;
    this.init_elements();
    this.init_network();
}

Ui.prototype.find = function(sel) {
    return this.$elt.find(sel);
};

Ui.prototype.init_elements = function() {
    var that = this;

    this.$elt.on('click', '.login button', function() {
        that.login();
    });

    this.$elt.on('click', '.tiles .tile', function() {
        if (this.find('.hand > .tile').length >= 13)
            return;

        $(this).detach().appendTo('.hand');
        sort_tiles(this.find('.hand'));
    });

    this.$elt.on('click', '.hand tile', function() {
        $(this).detach().appendTo('.tiles');
        sort_tiles(this.find('.tiles'));
    });

    this.$elt.on('click', '.submit-hand', function() {
        that.submit_hand();
    });

    this.set_status('Enter nick and press Login');
};

Ui.prototype.init_network = function() {
    var that = this;

    this.socket = io.connect('/minefield');
    this.socket.on('phase_one', function(data) {
        that.set_table_stage_1(data.tiles, data.dora_ind, data.east);
        console.log('phase_one',data);
        this.set_status('Choose your hand and press OK');
    });
    this.socket.on('wait_for_phase_two', function(data) {
        this.set_status('Player accepted, waiting for match');
    });
};

Ui.prototype.login = function() {
    var nick = this.find('.login input[name=nick]').val();
    this.socket.emit('hello', nick);

    this.find('.login').hide();

    this.set_status('Logging in');
};

Ui.prototype.set_status = function(status) {
    this.find('.status').text(status);
};

Ui.prototype.submit_hand = function() {
    if (this.find(".hand").children().length === 13) {
        var tiles = [];
        this.find(".hand").children().each(function() {
            tiles.push($(this).attr("data-tile"));
        });
        this.socket.emit('hand', tiles);
        this.find('.status').text('Submitting hand...');
        this.find('.submit-hand').prop('disabled', true);
    }
    else {
        alert("You have to have 13 tiles on hand!");
    }
};

Ui.prototype.set_table_stage_1 = function(tiles, dora, east) {
    this.find('.login').hide();
    this.find('.table').show();

    this.find(".hand").empty();
    this.find(".tiles").empty();

    // create tiles & add them to .tiles
    for (var i=0; i < tiles.length; ++i) {
        this.find(".tiles").append(create_tile(tiles[i]));
    }
    sort_tiles(this.find('.tiles'));

    this.find('.hand').addClass("outlined");

    // TODO: place east
    this.find(".east-display").append($("<img/>").attr('src', 'tiles/E.svg'));

    this.find(".dora-display").append(create_tile(dora));
};

Ui.prototype.set_table_stage_2 = function (start)
{
    // TODO:
    // move disposable space & hand to make space for discarded tiles
    this.find(".hand, .tiles").removeClass("connectedSortable");
    this.find(".hand").removeClass("outlined");
    // display discarded tiles
    // display turn marker
};

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

Ui.prototype.test = function() {
    this.set_table_stage_1(
        ['M1', 'M2', 'M3', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3',
         'M1', 'M2', 'M3', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3',
        ], "M1", true);
};
