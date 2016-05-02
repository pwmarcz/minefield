
// import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import { createStore, applyMiddleware } from 'redux';
import update from 'react-addons-update';


const loggerMiddleware = createLogger();

const INITIAL_GAME = {
  connected: false,
  status: 'lobby',
  lobby: {
    status: 'normal',
    games: [],
  },
  nicks: { you: '', opponent: '' },
  messages: [],
}

const SOCKET_EVENTS = [
  'connect', 'games',
]


function game(state = INITIAL_GAME, action) {
  switch (action.type) {
  case 'socket_connect':
    return update(state, { connected: { $set: true }});
  case 'socket_games':
    return update(state, { lobby: { games: { $set: action.data }}});
  case 'join':
    state = emit(state, 'join', action.nick, action.key);
    return update(state, { lobby: { status: { $set: 'joining' }}});
  case 'new_game':
    state = emit(state, 'new_game', action.nick);
    return update(state, { lobby: { status: { $set: 'advertising' }}});
  case 'cancel_new_game':
    state = emit(state, 'cancel_new_game');
    return update(state, { lobby: { status: { $set: 'normal' }}});

  default:
    return state;
  }
}

function emit(state, type, ...args) {
  return update(state, { messages: { $push: [{ type, args }]}});
}

export function socketAction(event, data) {
  return { type: 'socket_' + event, data: data };
}

export function joinAction(nick, key) {
  return { type: 'join', nick, key };
}

export function newGameAction(nick) {
  return { type: 'new_game', nick };
}

export function cancelNewGameAction() {
  return { type: 'cancel_new_game' };
}

export function createGameStore(logging) {
  let middleware = undefined;
  if (logging)
    middleware = applyMiddleware(loggerMiddleware);
  return createStore(game, middleware);
}

export function useSocket(store, socket) {
  function listen(dispatch) {
    let { messages } = store.getState();
    if (messages.length > 0) {
      messages.forEach(({ type, args }) => socket.emit(type, ...args));
      dispatch({ type: 'flush' });
    }
  }

  SOCKET_EVENTS.forEach((event) => {
    socket.on(event, (data) => store.dispatch(socketAction(event, data)));
  });

  store.subscribe(listen);
}
