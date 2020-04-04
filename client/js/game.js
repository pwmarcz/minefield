// vendored old version of socket.io
/* global io */

import thunkMiddleware from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { createStore, applyMiddleware } from 'redux';
import update from 'react-addons-update';
import { Socket } from './socket';


export const DISCARD_DELAY = 1000;

export const BEATS_PER_SECOND = 1;

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
        move_type: action.data.move_type,
        deadline: state.beatNum + action.data.time_limit * BEATS_PER_SECOND,
      }}
    });

  case 'rejoin':
    state = emit(state, 'rejoin', {'key': action.roomKey});
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
    return update(state, { games: { $set: action.data.games }});

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
    if (state.status === 'lobby' && state.beatNum % (3*BEATS_PER_SECOND) === 1)
      return emit(state, 'get_games');
    else
      return state;

  case 'set_nick':
    return update(state, { nicks: { you: { $set: action.nick }}});

  case 'join':
    state = emit(state, 'join', {'nick': state.nicks.you, 'key': action.key});
    return update(state, { lobbyStatus: { $set: 'joining' }});

  case 'new_game':
    state = emit(state, 'new_game', {'nick': state.nicks.you});
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
    if (state.move && state.move.move_type === 'hand' && state.move.deadline <= state.beatNum) {
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
    let idx = tiles.indexOf(tile);
    if (idx !== -1) {
      tiles[idx] = null;
      toSelect.push(idx);
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
  state = emit(state, 'hand', {'hand': hand});
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
    if (state.move && state.move.move_type === 'discard' && state.move.deadline <= state.beatNum) {
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
  state = emit(state, 'discard', {'tile': state.tiles[idx]});
  return update(state, {
    discards: { $push: [state.tiles[idx]] },
    tiles: { [idx]: { $set: null }},
    move: { $set: null },
  });
}

function emit(state, type, msg = {}) {
  msg.type = type;
  return update(state, { messages: { $push: [msg] }});
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
  socket(type, data = {}) {
    delete data.type;
    return { type: 'socket_' + type, data };
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
  let middleware = applyMiddleware(loggerMiddleware, thunkMiddleware, delayMiddleware);
  let store = createStore(reduceGame, middleware);

  let socket = new Socket();
  setupSocket(store, socket);
  startBeat(store);
  setupBrowser(store);

  let path = window.location.pathname;
  path = path.substring(1, path.lastIndexOf('/')+1);
  let socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  let socketHost = window.location.host;
  let socketPath = path + 'ws';
  socket.connect(socketProtocol + '//' + socketHost + '/' + socketPath);

  return store;
}

const delayMiddleware = store => next => action => {
  if (shouldDelay(action)) {
    setTimeout(() => next(action), DISCARD_DELAY);
  } else {
    return next(action);
  }
};

function shouldDelay(action) {
  return (action.type === 'socket_ron' || action.type === 'socket_draw' ||
          action.type === 'socket_start_move') &&
         !(action.data && action.data.replay);
}

function setupSocket(store, socket) {
  function listen() {
    let { messages } = store.getState();
    if (messages.length > 0) {
      messages.forEach((msg) => socket.emit(msg));
      store.dispatch({ type: 'flush' });
    }
  }

  SOCKET_EVENTS.forEach((event) => {
    socket.on(event, (type, data) => store.dispatch(actions.socket(type, data)));
  });

  store.subscribe(listen);
}

function startBeat(store) {
  window.setInterval(() => {
    store.dispatch({ type: 'beat' });
  }, 1000/BEATS_PER_SECOND);
}

function setupBrowser(store) {
  let nick = localStorage.getItem('nick') || '';
  let roomKey = window.location.hash.slice(1) || '';
  // HACK: Set room key only once, so that user can edit it if they want.
  let lastRoomKey = roomKey;

  store.dispatch(actions.setNick(nick));
  if (roomKey) {
    store.dispatch(actions.rejoin(roomKey));
  }
  store.subscribe(function listen() {
    let nick = store.getState().nicks.you;
    localStorage.setItem('nick', nick);

    let roomKey = store.getState().roomKey;
    if (roomKey !== lastRoomKey) {
      window.location.hash = roomKey;
      lastRoomKey = roomKey;
    }
  });
}
