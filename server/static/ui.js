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
        var tiles = "";
        $("#hand").children().each(function() {
            tiles += $(this).attr("data-tile");
        });
        alert(tiles); // TODO: submit
    }
    else {
        alert("You have to have 13 tiles on hand!");
    }
}

function set_table_stage_1(tiles, dora, east)
{    
    $("#hand").empty();
    $("#tiles").empty();
    
    // TODO: create tiles & add them to #tiles

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
    $("#dora-display").append($("<img/>").attr('src', 'tiles/E.svg'));


    $("#dora-display").append(create_tile(dora));

    $('#submit-hand').attr('disabled', 'disabled').click(
        function() {
            submit_hand();
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
    socket.on('phase_one', function() {
        $('body').removeClass('state-login state-waiting').addClass('state-table');
    });
    return socket;
}

$(function() {
    $('#login button').click(login);
    // TODO
    test();
});
