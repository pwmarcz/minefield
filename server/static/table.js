
/* jshint undef: true */
/* global $ */
/* global Tiles */

// data: {tiles, dora_ind, east, you}
function Table($elt, data, complete) {
    var self = {
        $elt: $elt,
        find: function(sel) { return self.$elt.find(sel); }
    };

    self.init = function() {
        self.$elt.html($('#templates > .table').html());

        Tiles.add(self.find('.tiles'), data.tiles);
        Tiles.sort(self.find('.tiles'));

        var $wind = $("<img/>");
        if (data.east == data.you)
            $wind.attr('src', 'tiles/E.svg').attr('title', 'East');
        else
            $wind.attr('src', 'tiles/W.svg').attr('title', 'West');
        self.find(".east-display").append($wind);

        self.find(".dora-display").append(Tiles.create(data.dora_ind));
    };

    self.init();
    return self;
}
