function create_tile(tile_type)
{
    var newtile = $('<div class="tile"/>');
    newtile.append($("<img/>").attr('src', 'tiles/'+tile_type+'.svg'));
    newtile.attr("data-tile", tile_type);
    return newtile;
}

function rotate_tile(tile, direction)
{
    // TODO:
    // rotate the tile in place (right, left, up, down?)
}

function submit_hand()
{
    if ($(".hand").children().length === 13) {
        var tiles = [];
        $(".hand").children().each(function() {
            tiles.push($(this).attr("data-tile"));
        });
        socket.emit('hand', tiles);
        $('.status').text('Submitting hand...');
        $('.submit-hand').prop('disabled', true);
    }
    else {
        alert("You have to have 13 tiles on hand!");
    }
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

function set_table_stage_1(tiles, dora, east)
{
    $('.login').hide();
    $('.table').show();

    $(".hand").empty();
    $(".tiles").empty();

    // create tiles & add them to .tiles
    for (var i=0; i < tiles.length; ++i) {
        $(".tiles").append(create_tile(tiles[i]));
    }
    sort_tiles($('.tiles'));

    $('.hand').addClass("outlined");

    // TODO: place east
    $(".east-display").append($("<img/>").attr('src', 'tiles/E.svg'));

    $(".dora-display").append(create_tile(dora));

    $('.tiles').on('click', '.tile', function() {
        if ($('.hand > .tile').length >= 13)
            return;

        $(this).detach().appendTo('.hand');
        sort_tiles($('.hand'));
    });

    $('.hand').on('click', '.tile', function() {
        $(this).detach().appendTo('.tiles');
        sort_tiles($('.tiles'));
    });

    $('.submit-hand').click(function() {
        submit_hand();
    });
}

function set_table_stage_2(start)
{
    // TODO:
    // move disposable space & hand to make space for discarded tiles
    $(".hand, .tiles").removeClass("connectedSortable");
    $(".hand").removeClass("outlined");
    // display discarded tiles
    // display turn marker
}

function discarded(player, tile)
{
    // TODO
}

function your_move()
{
    // TODO
    // enable discarding
}

function test()
{
    set_table_stage_1(['M1', 'M2', 'M3', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3',
                       'M1', 'M2', 'M3', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3',
                      ], "M1", true);
}

function login()
{
    var nick = $('.login input[name=nick]').val();
    socket = connect();
    socket.emit('hello', nick);
}

function connect()
{
    socket = io.connect('/minefield');
    socket.on('wait', function() {
        $('body').removeClass('state-login').addClass('state-waiting');
    });
    socket.on('phase_one', function(data) {
        $('body').removeClass('state-login state-waiting').addClass('state-table');
        set_table_stage_1(data.tiles, data.dora_ind, data.east);
        console.log('phase_one',data);
    });
    socket.on('wait_for_phase_two', function(data) {
        $('.status').text('Waiting for opposite player...');
    });
    return socket;
}

$(function() {
    $('.login button').click(login);
});
