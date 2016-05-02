import { assert } from 'chai';
import { createStore } from 'redux';

import {
  createGameStore,
  socketAction,
  joinAction,
  newGameAction,
  cancelNewGameAction
} from './game';


describe('game', function() {
  beforeEach(function() {
    this.store = createGameStore();
  });

  function assertLastCall(store, type, ...args) {
    let { messages } = store.getState();
    assert.deepEqual(messages[messages.length-1], { type, args });
  }

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
    this.store.dispatch(joinAction('Akagi', 'XYZ'));
    assert.equal(this.store.getState().lobby.status, 'joining');
    assertLastCall(this.store, 'join', 'Akagi', 'XYZ');
  });

  it('newGame', function() {
    this.store.dispatch(newGameAction('Akagi'));
    assert.equal(this.store.getState().lobby.status, 'advertising');
    assertLastCall(this.store, 'new_game', 'Akagi');
  });

  it('cancelNewGame', function() {
    this.store.dispatch(newGameAction('Akagi'));
    this.store.dispatch(cancelNewGameAction());
    assert.equal(this.store.getState().lobby.status, 'normal');
    assertLastCall(this.store, 'cancel_new_game');
  });
});
