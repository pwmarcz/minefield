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
  lobby: {
    status: 'normal',
    games: [],
  },
  nicks: { you: '', opponent: '' },
  messages: [],
  beatNum: 0,
};

const SOCKET_EVENTS = [
  'connect', 'games',
];


function game(state = INITIAL_GAME, action) {
  switch (action.type) {

  case 'socket_connect':
    return update(state, { connected: { $set: true }});

  case 'socket_games':
    return update(state, { lobby: { games: { $set: action.data }}});

  case 'set_nick':
    return update(state, { nicks: { you: { $set: action.nick }}});

  case 'join':
    state = emit(state, 'join', state.nicks.you, action.key);
    return update(state, { lobby: { status: { $set: 'joining' }}});

  case 'new_game':
    state = emit(state, 'new_game', state.nicks.you);
    return update(state, { lobby: { status: { $set: 'advertising' }}});

  case 'cancel_new_game':
    state = emit(state, 'cancel_new_game');
    return update(state, { lobby: { status: { $set: 'normal' }}});

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
    return { type: 'set_nick', nick: nick };
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
