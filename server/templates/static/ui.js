function create_tile(tile_type)
{
    var newtile = $('<li class="tile"/>');
    newtile.append($("<img/>").attr('src', 'static/tiles/'+tile_type+'.svg'));
    return newtile;
}

function rotate_tile(tile, direction)
{
    // TODO:
    // rotate the tile in place (right, left, up, down?)
}

function submit_hand()
{
    if ($("#hand_list").children().length == 13) {
        var tiles = "";
        // TODO: get all items from #hand_list
        alert(tiles); // make clicking alert trigger set_table_stage_2 for testing purposes
    }
    else {
        // TODO: error message?
    }
}

function set_table_stage_1(tiles, dora, east)
{
    // TODO: clean table
    $('#hand').addClass("outlined");

    // TODO: create tiles & add them to disposable
    for (var i=0; i<9; i++) {
        $('#tiles').append(create_tile("M"+(i+1)));
    }
    for (var i=0; i<9; i++) {
        $('#tiles').append(create_tile("S"+(i+1)));
    }
    

    // dragging tiles to hand
    $("#tiles, #hand").addClass("connectedSortable");

    $("#tiles").sortable({
        connectWith: '.connectedSortable'
    }).disableSelection();

    $("#hand").sortable({
        connectWith: '.connectedSortable',
        items: "li:not(.placeholder)",
        receive : function(event, ui){
            //ui.item.addClass("dropped");
            if ($(this).children().length > 13) {
                $(ui.sender).sortable('cancel');
            }
            if ($(this).children().length == 13) {
                $("#OK_button").removeAttr('disabled')
            }
        },
        remove: function(event, ui){
            if ($(this).children().length < 13) {
                OK_button.attr('disabled','disabled');
            }
        }
    }).disableSelection();

    // TODO: display & place east

    $("#dora-display").append(create_tile(dora));

    $('#submit-hand').attr('disabled', 'disabled').click(
        function() {
            submit_hand(tiles);
        });
}

function set_table_stage_2(start)
{
    // TODO:
    // make tiles undraggable & sort them
    // move disposable space & hand to make space for board
    hand_list.removeClass("outlined");
    // display board
    // display turn marker
    // hide OK button
}

function test()
{
    set_table_stage_1("", "M1", true);
}

$(function() {
    // TODO
    test();
});

