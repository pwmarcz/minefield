// vendored old version of socket.io
/* global io */

import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import { createStore, applyMiddleware } from 'redux';
import update from 'react-addons-update';
import { assert } from 'chai';


const FILTERED_ACTIONS = [
  'beat', 'socket_games', 'flush'
];

const loggerMiddleware = createLogger({
  predicate: (getState, action) => (FILTERED_ACTIONS.indexOf(action.type) === -1)
});

const INITIAL_GAME = {
  // -- General --
  connected: false,
  messages: [], // messages to be sent via socket
  status: 'lobby',
  nicks: { you: '', opponent: '' },
  roomKey: '',
  beatNum: 0,
  move: null,

  // -- Lobby --
  lobbyStatus: 'normal',
  games: [],

  // -- Game conditions --
  player: null,
  east: null,
  doraInd: null,

  // -- Tiles on the table --
  handData: [],
  tiles: null,
  discards: [],
  opponentDiscards: [],

  // -- Game end --
  ron: null,
  draw: false,
  disconnected: false,
  aborted: null,
};

const SOCKET_EVENTS = [
  'connect',
  'disconnect',
  'abort',
  'games',
  'room',
  'phase_one',
  'phase_two',
  'start_move',
  'discarded',
  'ron',
  'draw',
  'hand',
];


function reduceGame(state = INITIAL_GAME, action) {
  state = reduceGameGeneral(state, action);
  state = reduceGameLobby(state, action);
  state = reduceGamePhaseOne(state, action);
  state = reduceGamePhaseTwo(state, action);
  return state;
}

function reduceGameGeneral(state, action) {
  switch (action.type) {

  case 'socket_connect':
    return update(state, { connected: { $set: true }, roomKey: { $set: '' }});

  case 'socket_disconnect':
    return update(state, { disconnected: { $set: true }});

  case 'socket_abort':
    return update(state, { aborted: { $set: action.data }, roomKey: { $set: '' }});

  case 'socket_start_move':
    return update(state, {
      move: { $set: {
        type: action.data.type,
        deadline: state.beatNum + action.data.time_limit * 10,
      }}
    });

  case 'rejoin':
    state = emit(state, 'rejoin', action.roomKey);
    return update(state, { roomKey: { $set: action.roomKey }});

  case 'beat': {
    return update(state, { beatNum: { $set: state.beatNum+1 }});
  }

  case 'flush':
    return update(state, { messages: { $set: [] }});

  default:
    return state;
  }
}

function reduceGameLobby(state, action) {
  switch(action.type) {

  case 'socket_games':
    return update(state, { games: { $set: action.data }});

  case 'socket_room': {
    let { you, nicks, key } = action.data;
    return update(state, {
      player: { $set: you },
      nicks: { $set: {
        you: nicks[you],
        opponent: nicks[1-you]
      }},
      roomKey: { $set: key },
    });
  }

  case 'beat':
    if (state.status === 'lobby' && state.beatNum % 25 === 1)
      return emit(state, 'get_games');
    else
      return state;

  case 'set_nick':
    return update(state, { nicks: { you: { $set: action.nick }}});

  case 'join':
    state = emit(state, 'join', state.nicks.you, action.key);
    return update(state, { lobbyStatus: { $set: 'joining' }});

  case 'new_game':
    state = emit(state, 'new_game', state.nicks.you);
    return update(state, { lobbyStatus: { $set: 'advertising' }});

  case 'cancel_new_game':
    state = emit(state, 'cancel_new_game');
    return update(state, { lobbyStatus: { $set: 'normal' }});

  default:
    return state;
  }
}

function reduceGamePhaseOne(state, action) {
  switch(action.type) {

  case 'socket_phase_one': {
    let { tiles, 'dora_ind': doraInd, you, east } = action.data;
    tiles = tiles.slice();
    tiles.sort();
    return update(state, {
      status: { $set: 'phase_one' },
      tiles: { $set: tiles },
      doraInd: { $set: doraInd },
      player: { $set: you },
      east: { $set: east }
    });
  }

  case 'socket_hand':
    if (action.data.replay) {
      return replayHand(state, action.data.hand);
    } else {
      return state;
    }

  case 'select_tile':
    return selectTiles(state, [action.idx]);

  case 'unselect_tile': {
    let handIdx = action.handIdx;
    let { tile, idx } = state.handData[handIdx];
    let handData = state.handData.slice();
    handData.splice(handIdx, 1);
    return update(state, {
      tiles: { [idx]: { $set: tile }},
      handData: { $set: handData }
    });
  }

  case 'submit_hand':
    return submitHand(state);

  case 'beat':
    if (state.move && state.move.type === 'hand' && state.move.deadline <= state.beatNum) {
      state = selectFullHand(state);
      return submitHand(state);
    } else {
      return state;
    }

  default:
    return state;
  }
}

function selectFullHand(state) {
  let remaining = 13 - state.handData.length;
  if (remaining === 0)
    return state;

  let toSelect = [];
  for (let idx = 0; toSelect.length < remaining && idx < 34; ++idx) {
    if (state.tiles[idx] !== null) {
      toSelect.push(idx);
    }
  }

  return selectTiles(state, toSelect);
}

function replayHand(state, hand) {
  let tiles = state.tiles.slice();
  let toSelect = [];
  hand.forEach(tile => {
    for (let idx = 0; idx < 34; ++idx) {
      if (tiles[idx] === tile) {
        tiles[idx] = null;
        toSelect.push(idx);
        break;
      }
    }
  });
  state = selectTiles(state, toSelect);
  return update(state, { move: { $set: null }});
}

function selectTiles(state, toSelect) {
  let tiles = state.tiles.slice();
  let handData = state.handData.slice();

  toSelect.forEach(idx => {
    let tile = tiles[idx];
    tiles[idx] = null;
    handData.push({ tile, idx });
  });

  handData.sort((a, b) => a.tile.localeCompare(b.tile));
  return update(state, {
    tiles: { $set: tiles },
    handData: { $set: handData }
  });
}

function submitHand(state) {
  let hand = state.handData.map(a => a.tile);
  state = emit(state, 'hand', hand);
  return update(state, { move: { $set: null }});
}

function reduceGamePhaseTwo(state, action) {
  switch(action.type) {

  case 'socket_phase_two':
    return update(state, {
      status: { $set: 'phase_two' },
      playerTurn: { $set: state.east }
    });

  case 'socket_discarded':
    if (action.data.player === state.player) {
      if (action.data.replay) {
        return replayDiscard(state, action.data.tile);
      } else {
        return state;
      }
    } else {
      return update(state, {
        opponentDiscards: { $push: [action.data.tile] }
      });
    }

  case 'discard':
    return discard(state, action.idx);

  case 'beat': {
    if (state.move && state.move.type === 'discard' && state.move.deadline <= state.beatNum) {
      return discardAny(state);
    } else {
      return state;
    }
  }

  case 'socket_ron':
    return update(state, { ron: { $set: action.data }, roomKey: { $set: '' }});

  case 'socket_draw':
    return update(state, { draw: { $set: true }, roomKey: { $set: '' }});

  default:
    return state;
  }
}

function discardAny(state) {
  for (var idx = 0; idx < 34; ++idx) {
    if (state.tiles[idx] !== null)
      return discard(state, idx);
  }
  return state;
}

function replayDiscard(state, tile) {
  for (var idx = 0; idx < 34; ++idx) {
    if (state.tiles[idx] === tile) {
      return update(state, {
        discards: { $push: [state.tiles[idx]] },
        tiles: { [idx]: { $set: null }},
        move: { $set: null },
      });
    }
  }
  return state;
}

function discard(state, idx) {
  state = emit(state, 'discard', state.tiles[idx]);
  return update(state, {
    discards: { $push: [state.tiles[idx]] },
    tiles: { [idx]: { $set: null }},
    move: { $set: null },
  });
}

function emit(state, type, ...args) {
  return update(state, { messages: { $push: [{ type, args }] }});
}

function makeAction(type, ...argNames) {
  return function(...args) {
    let action = { type: type };
    for (let i = 0; i < argNames.length; i++) {
      action[argNames[i]] = args[i];
    }
    return action;
  };
}

export const actions = {
  socket(event, data) {
    // TODO move to tests?
    assert.include(SOCKET_EVENTS, event, event + ' not present in SOCKET_EVENTS');
    return { type: 'socket_' + event, data: data };
  },
  reset() {
    return function(dispatch) {
      window.location.reload();
    };
  },
  join: makeAction('join', 'key'),
  newGame: makeAction('new_game'),
  cancelNewGame: makeAction('cancel_new_game'),
  beat: makeAction('beat'),
  setNick: makeAction('set_nick', 'nick'),
  rejoin: makeAction('rejoin', 'roomKey'),
  selectTile: makeAction('select_tile', 'idx'),
  unselectTile: makeAction('unselect_tile', 'handIdx'),
  submitHand: makeAction('submit_hand'),
  discard: makeAction('discard', 'idx'),
};

export function createSimpleGameStore() {
  return createStore(reduceGame);
}

export function startGame() {
  let middleware = applyMiddleware(loggerMiddleware, thunkMiddleware);
  let store = createStore(reduceGame, middleware);

  let path = window.location.pathname;
  path = path.substring(1, path.lastIndexOf('/')+1);
  let socket = io.connect('/minefield', {
    reconnect: false,
    resource: path+'socket.io',
    'sync disconnect on unload': true,
  });

  setupSocket(store, socket);
  startBeat(store);
  setupBrowser(store);

  return store;
}

function setupSocket(store, socket) {
  function listen() {
    let { messages } = store.getState();
    if (messages.length > 0) {
      messages.forEach(({ type, args }) => socket.emit(type, ...args));
      store.dispatch({ type: 'flush' });
    }
  }

  SOCKET_EVENTS.forEach((event) => {
    socket.on(event, (data) => store.dispatch(actions.socket(event, data)));
  });

  store.subscribe(listen);
}

function startBeat(store) {
  window.setInterval(() => {
    store.dispatch({ type: 'beat' });
  }, 100);
}

function setupBrowser(store) {
  let nick = localStorage.getItem('nick') || '';
  let roomKey = window.location.hash.slice(1) || '';

  store.dispatch(actions.setNick(nick));
  if (roomKey) {
    store.dispatch(actions.rejoin(roomKey));
  }
  store.subscribe(function listen() {
    let nick = store.getState().nicks.you;
    localStorage.setItem('nick', nick);

    let roomKey = store.getState().roomKey;
    window.location.hash = roomKey;
  });
}
