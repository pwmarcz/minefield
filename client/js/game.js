// vendored old version of socket.io
/* global io */

// import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import { createStore, applyMiddleware } from 'redux';
import update from 'react-addons-update';


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
};

const SOCKET_EVENTS = [
  'connect',
  'games',
  'room',
  'phase_one',
  'phase_two',
  'start_move',
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
    return update(state, { connected: { $set: true }});

  case 'socket_start_move':
    return update(state, {
      move: { $set: {
        type: action.data.type,
        deadline: state.beatNum + action.data.time_limit * 10,
      }}
    });

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
    let { you, nicks } = action.data;
    return update(state, {
      player: { $set: you },
      nicks: { $set: {
        you: nicks[you],
        opponent: nicks[1-you]
      }}});
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

  case 'select_tile': {
    let idx = action.idx;
    let tile = state.tiles[idx];
    let newHandData = state.handData.slice();
    newHandData.push({tile, idx});
    newHandData.sort((a, b) => a.tile.localeCompare(b.tile));
    return update(state, {
      tiles: { [idx]: { $set: null }},
      handData: { $set: newHandData }
    });
  }

  case 'unselect_tile': {
    let handIdx = action.handIdx;
    let { tile, idx } = state.handData[handIdx];
    let newHandData = state.handData.slice();
    newHandData.splice(handIdx, 1);
    return update(state, {
      tiles: { [idx]: { $set: tile }},
      handData: { $set: newHandData }
    });
  }

  case 'submit_hand': {
    let hand = state.handData.map(a => a.tile);
    state = emit(state, 'hand', hand);
    return update(state, { move: { $set: null }});
  }

  default:
    return state;
  }
}

function reduceGamePhaseTwo(state, action) {
  switch(action.type) {

  case 'socket_phase_two':
    return update(state, {
      status: { $set: 'phase_two' },
      playerTurn: { $set: state.east }
    });

  case 'discard':
    state = emit(state, 'discard', state.tiles[action.idx]);
    return update(state, {
      discards: { $push: [state.tiles[action.idx]] },
      tiles: { [action.idx]: { $set: null }},
      move: { $set: null },
    });

  default:
    return state;
  }
}

function emit(state, type, ...args) {
  return update(state, { messages: { $push: [{ type, args }]}});
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
    return { type: 'socket_' + event, data: data };
  },
  join: makeAction('join', 'key'),
  newGame: makeAction('new_game'),
  cancelNewGame: makeAction('cancel_new_game'),
  beat: makeAction('beat'),
  setNick: makeAction('set_nick', 'nick'),
  selectTile: makeAction('select_tile', 'idx'),
  unselectTile: makeAction('unselect_tile', 'handIdx'),
  submitHand: makeAction('submit_hand'),
  discard: makeAction('discard', 'idx'),
};

export function createSimpleGameStore() {
  return createStore(reduceGame);
}

export function startGame() {
  let middleware = applyMiddleware(loggerMiddleware);
  let store = createStore(reduceGame, middleware);

  let path = window.location.pathname;
  path = path.substring(1, path.lastIndexOf('/')+1);
  let socket = io.connect('/minefield', {
    reconnect: false,
    resource: path+'socket.io',
    'sync disconnect on unload': true,
  });

  useSocket(store, socket);
  startBeat(store);
  useLocalStorage(store);

  return store;
}

function useSocket(store, socket) {
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

function useLocalStorage(store) {
  let nick = localStorage.getItem('nick') || '';
  store.dispatch(actions.setNick(nick));
  store.subscribe(function listen() {
    let nick = store.getState().nicks.you;
    localStorage.setItem('nick', nick);
  });
}
