function create_tile(tile_type)
{
    var newtile = $('<li class="tile"/>');
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
    if ($("#hand").children().length === 13) {
        var tiles = [];
        $("#hand").children().each(function() {
            tiles.push($(this).attr("data-tile"));
        });
        socket.emit('hand', tiles);
    }
    else {
        alert("You have to have 13 tiles on hand!");
        $("#submit-hand").removeAttr('disabled');
    }
}

function set_table_stage_1(tiles, dora, east)
{
    $("#hand").empty();
    $("#tiles").empty();

    // create tiles & add them to #tiles
    for (var i=0; i < tiles.length; ++i) {
        $("#tiles").append(create_tile(tiles[i]));
    }

    // dragging tiles to hand
    $("#tiles, #hand").addClass("connectedSortable");

    $("#tiles").sortable({
        connectWith: '.connectedSortable'
    }).disableSelection();

    $('#hand').addClass("outlined");

    $("#hand").sortable({
        connectWith: '.connectedSortable',
        items: "li:not(.placeholder)",
        receive : function(event, ui){
            //ui.item.addClass("dropped");
            if ($(this).children().length > 13) {
                $(ui.sender).sortable('cancel');
            }
            if ($(this).children().length === 13) {
                $("#submit-hand").removeAttr('disabled')
            }
        },
        remove: function(event, ui){
            if ($(this).children().length < 13) {
                $("#submit-hand").attr('disabled','disabled');
            }
        }
    }).disableSelection();

    // TODO: place east
    $("#east-display").append($("<img/>").attr('src', 'tiles/E.svg'));
    
    $("#dora-display").append(create_tile(dora));

    $('#submit-hand').attr('disabled', 'disabled').click(
        function() {
            submit_hand();
            $(this).attr('disabled', 'disabled');
        });
}

function set_table_stage_2(start)
{
    // TODO:
    // move disposable space & hand to make space for discarded tiles
    $("#hand, #tiles").removeClass("connectedSortable");
    $("#hand").removeClass("outlined");
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
    set_table_stage_1("", "M1", true);
}

function login()
{
    var nick = $('#login input[name=nick]').val();
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
    return socket;
}

$(function() {
    $('#login button').click(login);
});
