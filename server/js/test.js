import { assert } from 'chai';
import { createStore } from 'redux';

import {
  createGameStore,
  socketAction,
  joinAction,
  newGameAction,
  cancelNewGameAction
} from './game';


class FakeSocket {
  constructor() {
    this.calls = [];
  }

  emit(type, ...args) {
    this.calls.push({type, args});
  }

  getLastCall() {
    return this.calls[this.calls.length-1];
  }

  assertLastCall(type, ...args) {
    assert.deepEqual(this.getLastCall(), {type, args});
  }
};


describe('game', function() {
  beforeEach(function() {
    this.store = createGameStore();
    this.socket = new FakeSocket();
  });

  it('on connect', function() {
    this.store.dispatch(socketAction('connect'));
    assert.isTrue(this.store.getState().connected);
  });

  it('on games list', function() {
    let games = ['x', 'y', 'z'];
    this.store.dispatch(socketAction('games', games));
    assert.deepEqual(this.store.getState().lobby.games, games);
  });

  it('join', function() {
    this.store.dispatch(joinAction('Akagi', 'XYZ', this.socket));
    assert.equal(this.store.getState().lobby.status, 'joining');
    this.socket.assertLastCall('join', 'Akagi', 'XYZ');
  });

  it('newGame', function() {
    this.store.dispatch(newGameAction('Akagi', this.socket));
    assert.equal(this.store.getState().lobby.status, 'advertising');
    this.socket.assertLastCall('new_game', 'Akagi');
  });

  it('cancelNewGame', function() {
    this.store.dispatch(newGameAction('Akagi', this.socket));
    this.store.dispatch(cancelNewGameAction(this.socket));
    assert.equal(this.store.getState().lobby.status, 'normal');
    this.socket.assertLastCall('cancel_new_game');
  });
});
