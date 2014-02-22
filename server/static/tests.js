
/* jshint undef: true */
/* global $, console */
/* global Ui */
/* global module, test */
/* global ok, equal, deepEqual */

// A mock server for socket.io.
function Server() {
    console.log('init server');
    var self = {
        received: [],
        handlers: {}
    };

    self.socket = {
        on: function(type, handler) {
            self.handlers[type] = handler;
        },
        emit: function(type, data) {
            console.debug('receive', type, data);
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

    self.no_messages = function() {
        ok(self.received.length === 0, 'not expecting any messages');
    };

    return self;
}

function invisible(sel) {
    ok($(sel).not(':visible'), sel+' shouldn\'t be visible');
}

function visible(sel) {
    ok($(sel).is(':visible'), sel+' should be visible');
}

function disabled(sel) {
    ok($(sel).not(':enabled'), sel+' shouldn\'t be enabled');
}

function enabled(sel) {
    ok($(sel).is(':enabled'), sel+' should be enabled');
}

function tiles(sel, expected_tile_codes) {
    var tile_codes = $.map($(sel).find('.tile'), function(tile) { return $(tile).data('tile'); });
    deepEqual(tile_codes, expected_tile_codes, 'expected specific tiles at '+sel);
}

var ui, server;

function init_tests() {
    server = Server();
    ui = Ui($('#qunit-fixture .ui'), server.socket);
}

module(
    'login stage',
    {
        setup: init_tests
    });

test('initialize', function() {
    equal(ui.state, 'login');
});

test('log in', function() {
    $('input[name=nick]').val('Akagi');
    $('.login-button').click();
    invisible('.login');
    server.expect('hello', 'Akagi');

    server.send('phase_one', {
        tiles: ['X1', 'X2', 'X3'],
        dora_ind: 'X3'});
    equal(ui.state, 'phase_1');

    visible('.table');
    tiles('.dora-display', ['X3']);
    tiles('.tiles', ['X1', 'X2', 'X3']);
});


module(
    'phase one',
    {
        setup: function() {
            init_tests();
            ui.test_phase_1();
        }
    });

test('submit hand', function() {
    for (var i = 0; i < 13; i++) {
        disabled('.submit-hand');
        $('.tiles .tile').first().click();
    }
    enabled('.submit-hand');

    // TODO try removing (possibly split this test case?)

    $('.submit-hand').click();
    disabled('.submit-hand');

    // TODO try removing again
    server.expect('hand', ['M1', 'M1', 'M2', 'M2', 'M3', 'M3',
                           'P1', 'P1', 'P2', 'P2', 'P3', 'P3',
                           'S1']);

    server.send('wait_for_phase_two');
    server.send('phase_two');

    equal(ui.state, 'phase_2');
    visible('.discards');
    visible('.opponent-discards');
});

module(
    'phase two',
    {
        setup: function() {
            init_tests();
            ui.test_phase_2();
        }
    });

test('deal when allowed', function() {
    server.send('your_move');
    equal(ui.my_move, true);

    $('.tiles .tile').first().click();
    tiles('.discards', ['S1']);
    server.expect('discard', 'S1');
    equal(ui.my_move, false);

    server.send('discarded', {player: 0, tile: 'S1'});
});

test('not deal when not allowed', function() {
    equal(ui.my_move, false);

    $('.tiles .tile').first().click();
    tiles('.discards', []);
    server.no_messages();
});

test('display opponent discards', function() {
    tiles('.opponent-discards', []);
    server.send('discarded', {player: 1, tile: 'S1'});
    tiles('.opponent-discards', ['S1']);
});

// TODO test winning!
