/* eslint-env node, mocha */

import { assert } from 'chai';
import {
  createSimpleGameStore,
  actions
} from './game';


const SAMPLE_TILES = [
  'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9',
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9',
];

suite('game', function() {
  setup(function() {
    this.store = createSimpleGameStore();
  });

  function assertLastCall(store, type, ...args) {
    let { messages } = store.getState();
    assert.deepEqual(messages[messages.length-1], { type, args });
  }

  test('on connect', function() {
    this.store.dispatch(actions.socket('connect'));
    assert.isTrue(this.store.getState().connected);
  });

  test('beat', function() {
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

  suite('lobby', function() {
    test('on games list', function() {
      let games = ['x', 'y', 'z'];
      this.store.dispatch(actions.socket('games', games));
      assert.deepEqual(this.store.getState().games, games);
    });

    test('join', function() {
      this.store.dispatch(actions.setNick('Akagi'));
      this.store.dispatch(actions.join('XYZ'));
      assert.equal(this.store.getState().lobbyStatus, 'joining');
      assertLastCall(this.store, 'join', 'Akagi', 'XYZ');
    });

    test('newGame', function() {
      this.store.dispatch(actions.setNick('Akagi'));
      this.store.dispatch(actions.newGame());
      assert.equal(this.store.getState().lobbyStatus, 'advertising');
      assertLastCall(this.store, 'new_game', 'Akagi');
    });

    test('cancelNewGame', function() {
      this.store.dispatch(actions.newGame());
      this.store.dispatch(actions.cancelNewGame());
      assert.equal(this.store.getState().lobbyStatus, 'normal');
      assertLastCall(this.store, 'cancel_new_game');
    });

  });

  suite('phase one', function() {
    test('starting phase one', function() {
      this.store.dispatch(actions.socket(
        'room', { key: 'K', you: 1, nicks: ['Akagi', 'Washizu'] }));
      assert.equal(this.store.getState().player, 1);
      assert.deepEqual(this.store.getState().nicks,
                       { you: 'Washizu', opponent: 'Akagi' });

      this.store.dispatch(actions.socket(
        'phase_one', {
          tiles: ['X3', 'X2', 'X1'],
          'dora_ind': 'X3',
          east: 0,
          you: 0
        }));

      assert.equal(this.store.getState().status, 'phase_one');
      assert.equal(this.store.getState().doraInd, 'X3');
      assert.equal(this.store.getState().east, 0);
      assert.equal(this.store.getState().player, 0);
      // the tiles should be sorted
      assert.deepEqual(this.store.getState().tiles, ['X1', 'X2', 'X3']);
    });

    test('selecting a hand', function() {
      this.store.dispatch(actions.socket(
        'room', { key: 'K', you: 0, nicks: ['Akagi', 'Washizu'] }));
      this.store.dispatch(actions.socket(
        'phase_one', {
          tiles: SAMPLE_TILES, 'dora_ind': 'X3', east: 0, you: 0
        }));

      // M8, M3, P4
      this.store.dispatch(actions.selectTile(7));
      this.store.dispatch(actions.selectTile(2));
      this.store.dispatch(actions.selectTile(12));
      assert.deepEqual(
        this.store.getState().handData.map(a => a.tile),
        ['M3', 'M8', 'P4']);
      assert.equal(this.store.getState().tiles[7], null);
      assert.equal(this.store.getState().tiles[2], null);
      assert.equal(this.store.getState().tiles[12], null);

      this.store.dispatch(actions.unselectTile(0));
      assert.deepEqual(
        this.store.getState().handData.map(a => a.tile),
        ['M8', 'P4']);
      assert.equal(this.store.getState().tiles[2], 'M3');
    });

    test('submitting a hand', function() {
      this.store.dispatch(actions.socket(
        'room', { key: 'K', you: 0, nicks: ['Akagi', 'Washizu'] }));
      this.store.dispatch(actions.socket(
        'phase_one', {
          tiles: SAMPLE_TILES, 'dora_ind': 'X3', east: 0, you: 0
        }));

      this.store.dispatch(actions.socket('start_move', { type: 'hand' }));

      for (let i = 0; i < 13; i++) {
        this.store.dispatch(actions.selectTile(i));
      }

      this.store.dispatch(actions.submitHand());
      assert.equal(this.store.getState().move, null);
      assertLastCall(this.store, 'hand', SAMPLE_TILES.slice(0, 13));

      this.store.dispatch(actions.socket('phase_two'));
      assert.equal(this.store.getState().status, 'phase_two');
    });
  });

  suite('phase two', function() {
    setup(function() {
      this.store.dispatch(actions.socket(
        'room', { key: 'K', you: 0, nicks: ['Akagi', 'Washizu'] }));
      this.store.dispatch(actions.socket(
        'phase_one', {
          tiles: SAMPLE_TILES, 'dora_ind': 'X3', east: 0, you: 0
        }));
      for (let i = 0; i < 13; i++) {
        this.store.dispatch(actions.selectTile(i));
      }
      this.store.dispatch(actions.submitHand());
      this.store.dispatch(actions.socket('phase_two'));
    });

    test('discard', function() {
      assert.isNull(this.store.getState().move);
      this.store.dispatch(actions.socket('start_move', { type: 'discard' }));
      assert.isNotNull(this.store.getState().move);
      this.store.dispatch(actions.discard(13));
      assertLastCall(this.store, 'discard', SAMPLE_TILES[13]);
      assert.isNull(this.store.getState().move);
      assert.deepEqual(this.store.getState().discards, [SAMPLE_TILES[13]]);

      // 'discarded' message shouldn't result in additional tile
      this.store.dispatch(actions.socket('discarded', { player: 0, tile: SAMPLE_TILES[13] }));
      assert.deepEqual(this.store.getState().discards, [SAMPLE_TILES[13]]);
    });

    test('opponent discard', function() {
      this.store.dispatch(actions.socket('discarded', { player: 1, tile: 'X1' }));
      assert.deepEqual(this.store.getState().opponentDiscards, ['X1']);
    });

    describe('game end', function() {
      test('ron', function() {
        let ronInfo = {
          player: 0,
          yaku: ['kokushi'],
          yakuman: true,
          hand: 'M1 M9 P1 P1 P9 S1 S9 X1 X2 X3 X4 X5 X6 X7'.split(),
          points: 32000,
          limit: 5,
          dora: 0,
          'uradora_ind': 'M2',
        };
        this.store.dispatch(actions.socket('ron', ronInfo));
        assert.deepEqual(this.store.getState().ron, ronInfo);
      });
    });
  });
});
