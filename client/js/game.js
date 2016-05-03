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
  connected: false,
  status: 'lobby',
  lobbyStatus: 'normal',
  games: [],
  nicks: { you: '', opponent: '' },
  messages: [],
  beatNum: 0,
  handData: [],
  handSubmitted: false,
  tiles: null,
  player: null,
  east: null,
  'dora_ind': null,
};

const SOCKET_EVENTS = [
  'connect',
  'games',
  'room',
  'phase_one',
  'phase_two',
];


function game(state = INITIAL_GAME, action) {
  switch (action.type) {

  case 'socket_connect':
    return update(state, { connected: { $set: true }});

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

  case 'socket_phase_two':
    return update(state, { status: { $set: 'phase_two' }});

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
    return update(state, { handSubmitted: { $set: true }});
  }

  case 'flush':
    return update(state, { messages: { $set: [] }});

  case 'beat': {
    let beatNum = state.beatNum;
    if (state.status === 'lobby' && beatNum % 25 === 0)
      state = emit(state, 'get_games');
    return update(state, { beatNum: { $set: beatNum+1 }});
  }

  default:
    return state;
  }
}

function emit(state, type, ...args) {
  return update(state, { messages: { $push: [{ type, args }]}});
}

export const actions = {
  socket(event, data) {
    return { type: 'socket_' + event, data: data };
  },

  join(key) {
    return { type: 'join', key };
  },

  newGame() {
    return { type: 'new_game' };
  },

  cancelNewGame() {
    return { type: 'cancel_new_game' };
  },

  beat() {
    return { type: 'beat' };
  },

  setNick(nick) {
    return { type: 'set_nick', nick };
  },

  selectTile(idx) {
    return { type: 'select_tile', idx };
  },

  unselectTile(handIdx) {
    return { type: 'unselect_tile', handIdx };
  },

  submitHand() {
    return { type: 'submit_hand' };
  },
};

export function createSimpleGameStore() {
  return createStore(game);
}

export function startGame() {
  let middleware = applyMiddleware(loggerMiddleware);
  let store = createStore(game, middleware);

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
