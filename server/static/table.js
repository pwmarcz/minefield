
/* jshint undef: true */
/* global $ */

// data: {tiles, dora_ind, east, you}
function Table($elt, data, complete) {
    var self = {
        $elt: $elt,
        find: function(sel) { return self.$elt.find(sel); }
    };

    self.init = function() {
        self.$elt.html($('#templates > .table').html());

        add_tiles(self.find('.tiles'), data.tiles);
        sort_tiles(self.find('.tiles'));

        var $wind = $("<img/>");
        if (data.east == data.you)
            $wind.attr('src', 'tiles/E.svg').attr('title', 'East');
        else
            $wind.attr('src', 'tiles/W.svg').attr('title', 'West');
        self.find(".east-display").append($wind);

        self.find(".dora-display").append(create_tile(data.dora_ind));
    };

    self.init();
    return self;
}
