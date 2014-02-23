
/* global module, test */
/* global ok, equal, deepEqual */
/* global Ui */

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
    ok(true);
});

test('log in', function() {
    $('input[name=nick]').val('Akagi');
    $('.login-button').click();
    disabled('.login');
    server.expect('hello', 'Akagi');

    server.send('phase_one', {
        nicks: ['Akagi', 'Washizu'],
        tiles: ['X1', 'X2', 'X3'],
        dora_ind: 'X3',
        east: 0,
        you: 1
    });

    visible('.table');
    tiles('.dora-display', ['X3']);
    tiles('.tiles', ['X1', 'X2', 'X3']);
    visible('.nicks');
    equal($('.nicks .you').text(), 'Washizu');
    equal($('.nicks .opponent').text(), 'Akagi');
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
    equal(ui.table.state, 'discard');

    $('.tiles .tile').first().click();
    tiles('.discards', ['S1']);
    server.expect('discard', 'S1');
    equal(ui.table.state, null);

    server.send('discarded', {player: 0, tile: 'S1'});
});

test('not deal when not allowed', function() {
    equal(ui.table.state, null);

    $('.tiles .tile').first().click();
    tiles('.discards', []);
    server.no_messages();
});

test('display opponent discards', function() {
    tiles('.opponent-discards', []);
    server.send('discarded', {player: 1, tile: 'S1'});
    tiles('.opponent-discards', ['S1']);
});

test('end game by draw', function() {
    server.send('draw');
    invisible('.table');
    visible('.end-draw');
});

var RON_DATA = {
    player: 0,
    hand: ['S1', 'S1', 'S2', 'S3', 'S4'],
    yaku: ['ban tan', 'tao tao'],
    dora: 3,
    uradora_ind: 'X1',
    points: 7
};

test('win game', function() {
    server.send('discarded', {player: 1, tile: 'S1'});
    server.send('ron', RON_DATA);
    invisible('.table');
    visible('.end-ron');
    equal($('.end-ron .message').text(), 'You won!');
    // winning tile should be displayed next to the hand
    tiles('.end-ron .winning-hand', ['S1', 'S2', 'S3', 'S4', 'S1']);
    // M1 is dora indicator from Ui.test_phase_1
    tiles('.end-ron .doras-ind', ['M1', RON_DATA.uradora_ind]);
    ok(/riichi/.test($('.end-ron .yaku').text()));
    ok(/ban tan/.test($('.end-ron .yaku').text()));
    ok(/tao tao/.test($('.end-ron .yaku').text()));
    ok(/dora 3/.test($('.end-ron .yaku').text()));
    equal($('.end-ron .points').text(), '7');
});
