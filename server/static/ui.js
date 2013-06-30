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
                $("#submit-hand").removeAttr('disabled')
            }
        },
        remove: function(event, ui){
            if ($(this).children().length < 13) {
                $("#submit-hand").attr('disabled','disabled');
            }
        }
    }).disableSelection();

    // TODO: display & place east

    $("#dora-display").append(create_tile(dora));

    $('#submit-hand').attr('disabled', 'disabled').click(
        function() {
            submit_hand();
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
    // hide 
}

function test()
{
    set_table_stage_1("", "M1", true);
}

$(function() {
    // TODO
    test();
});
