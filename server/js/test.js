/* eslint-env node, mocha */

import { assert } from 'chai';
import {
  createSimpleGameStore,
  actions
} from './game';


describe('game', function() {
  beforeEach(function() {
    this.store = createSimpleGameStore();
  });

  function assertLastCall(store, type, ...args) {
    let { messages } = store.getState();
    assert.deepEqual(messages[messages.length-1], { type, args });
  }

  it('on connect', function() {
    this.store.dispatch(actions.socket('connect'));
    assert.isTrue(this.store.getState().connected);
  });

  it('on games list', function() {
    let games = ['x', 'y', 'z'];
    this.store.dispatch(actions.socket('games', games));
    assert.deepEqual(this.store.getState().lobby.games, games);
  });

  it('join', function() {
    this.store.dispatch(actions.setNick('Akagi'));
    this.store.dispatch(actions.join('XYZ'));
    assert.equal(this.store.getState().lobby.status, 'joining');
    assertLastCall(this.store, 'join', 'Akagi', 'XYZ');
  });

  it('newGame', function() {
    this.store.dispatch(actions.setNick('Akagi'));
    this.store.dispatch(actions.newGame());
    assert.equal(this.store.getState().lobby.status, 'advertising');
    assertLastCall(this.store, 'new_game', 'Akagi');
  });

  it('cancelNewGame', function() {
    this.store.dispatch(actions.newGame());
    this.store.dispatch(actions.cancelNewGame());
    assert.equal(this.store.getState().lobby.status, 'normal');
    assertLastCall(this.store, 'cancel_new_game');
  });

  it('beat', function() {
    assert.equal(this.store.getState().beatNum, 0);

    this.store.dispatch(actions.beat());
    assert.equal(this.store.getState().messages.length, 1);
    assert.equal(this.store.getState().beatNum, 1);
    assertLastCall(this.store, 'get_games');

    this.store.dispatch(actions.beat());
    assert.equal(this.store.getState().beatNum, 2);
    // second beat shouldn't produce another message
    assert.equal(this.store.getState().messages.length, 1);
  });
});
