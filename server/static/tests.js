
/* jshint undef: true */
/* global $, console */
/* global Ui */
/* global module, test */
/* global ok, equal, deepEqual */

// A mock server for socket.io.
function Server() {
    var self = {
        received: [],
        handlers: {}
    };

    self.socket = {
        on: function(type, handler) {
            self.handlers[type] = handler;
        },
        emit: function(type, data) {
            console.debug('send', type, data);
            self.received.push({type: type, data: data});
        }
    };

    self.send = function(type, data) {
        console.debug('send', type, data);
        ok(self.handlers[type], 'expecting event handler for message '+type);
        self.handlers[type](data);
    };

    self.receive = function() {
        return self.received.shift();
    };

    self.expect = function(type, data) {
        var message = self.receive();
        ok(message, 'expecting a message: '+type);
        if (message) {
            equal(message.type, type, type);
            deepEqual(message.data, data, data);
        }
    };

    return self;
}

function invisible(sel) {
    ok($(sel).not(':visible'), sel+' shouldn\'t be visible');
}

function visible(sel) {
    ok($(sel).is(':visible'), sel+' should be visible');
}

function tiles(sel, expected_tile_codes) {
    function get_code(tile) {
        console.log(tile, tile.src);
        return /(..).svg/.exec(tile.src)[1];
    }
    var tile_codes = $.map($(sel).find('.tile img'), get_code);
    deepEqual(tile_codes, expected_tile_codes, 'expected specific tiles at '+sel);
}

var ui, server;

module(
    'login stage',
    {
        setup: function() {
            server = Server();
            ui = Ui($('#qunit-fixture.ui'), server.socket);
        }
    });

test('initialize', function() {
    ok(true);
});

test('log in', function() {
    $('input[name=nick]').val('Akagi');
    $('.login-button').click();
    invisible('.login');
    server.expect('hello', 'Akagi');

    server.send('phase_one', {
        tiles: ['X1', 'X2', 'X3'],
        dora_ind: 'X3'});
    visible('.table');

    tiles('.dora-display', ['X3']);
    tiles('.tiles', ['X1', 'X2', 'X3']);
});
