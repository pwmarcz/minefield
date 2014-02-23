/* jshint undef: true */
/* global $ */

var Tiles = {};

Tiles.create = function(tile_type) {
    var newtile = $('<div class="tile"/>');
    newtile.append($("<img/>").attr('src', 'tiles/'+tile_type+'.svg'));
    newtile.attr("data-tile", tile_type);
    return newtile;
};

Tiles.add = function($elt, tile_codes) {
    $.each(tile_codes, function(i, tile_code) {
        $elt.append(Tiles.create(tile_code));
    });
};

Tiles.create_placeholder = function ($tile) {
    var tile_code = $tile.data('tile');
    return $('<div class="tile-placeholder">').attr('data-tile', tile_code);
};

Tiles.sort = function(container) {
    container.children('.tile').sort(function(tile1, tile2) {
        var code1 = $(tile1).data('tile'), code2 = $(tile2).data('tile');
        if (code1 < code2)
                return -1;
        else if (code1 > code2)
            return 1;
        else
            return 0;
    }).appendTo(container);
};
