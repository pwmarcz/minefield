function create_table()
{
    var table = $("<div/>"),
        dora_display = $("<div/>"),
        board = $("<div/>"),
        east_display = $("<div/>");
    table.attr("id", "table");
    dora_display.attr("id", "dora_display");
    board.attr("id", "board");
    east_display.attr("id", "east_display");
    // TODO: customize looks etc.
    $('body').append(table);
    table.append(dora_display, board, east_display);
}

function create_tile(tile_type)
{
    var newtile = $('<div/>');
    // TODO: tile customization
    newtile.addClass("tile");
    newtile.append("<p>" + tile_type + "</p>");
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

function create_OK_button()
{
    var OK_button = $('<button/>');
    OK_button.attr('disabled','disabled');
    OK_button.click(function (){
            submit_hand(tiles);
        });
    return OK_button;
}

function set_table_stage_1(tiles, dora, east)
{
    // TODO: clean table

    var disposable_list = $("<ul/>"),
        hand_list = $("<ul/>");
        
    hand_list.id = "hand_list"
    hand_list.addClass("outlined");
    hand_list.append("<li class=\"placeholder\">Drop selected tiles here</li>");

    $("#table").append(disposable_list, hand_list);
    
    // TODO: create tiles & add them to disposable        
    for (var i=0; i<3; i++) {
        disposable_list.append(create_tile("bla"));
    }
    
    // dragging tiles to hand
    $("#disposable_list, #hand_list").addClass("connectedSortable");
        
    $("#disposable_list").sortable({
        connectWith: '.connectedSortable'
    }).disableSelection();
    
    $("#hand_list").sortable({
        connectWith: '.connectedSortable',
        items: "li:not(.placeholder)",        
        receive : function(event, ui){
            //ui.item.addClass("dropped");
            if ($(this).children().length > 13) { // TODO: what about the placeholder?
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

    $("#dora_display").append(create_tile(dora));
    create_OK_button();
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
    create_table();
    set_table_stage_1("", "", true);
}

$(function() {
    // TODO
    test();
});

