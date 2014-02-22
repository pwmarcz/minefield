
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

    return self;
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
    ok($('.login').not('visible'));
    deepEqual(server.receive(), {type: 'hello', data: 'Akagi'});
});
