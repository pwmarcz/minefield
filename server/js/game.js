
import thunkMiddleware from 'redux-thunk';
import { createStore, applyMiddleware } from 'redux';
import update from 'react-addons-update';


const INITIAL_GAME = {
  connected: false,
  status: 'lobby',
  lobby: {
    status: 'normal',
    games: [],
  },
  nicks: { you: '', opponent: '' },
}


function game(state = INITIAL_GAME, action) {
  switch (action.type) {
  case 'socket_connect':
    return update(state, { connected: { $set: true }});
  case 'socket_games':
    return update(state, { lobby: { games: { $set: action.data }}});
  case 'join':
    return update(state, { lobby: { status: { $set: 'joining' }}});
  case 'new_game':
    return update(state, { lobby: { status: { $set: 'advertising' }}});
  case 'cancel_new_game':
    return update(state, { lobby: { status: { $set: 'normal' }}});
  default:
    return state;
  }
}

export function socketAction(event, data) {
  return { type: 'socket_' + event, data: data };
}

export function joinAction(nick, key, socket) {
  return function(dispatch) {
    dispatch({ type: 'join' });
    socket.emit('join', nick, key);
  };
}

export function newGameAction(nick, socket) {
  return function(dispatch) {
    dispatch({ type: 'new_game' });
    socket.emit('new_game', nick);
  };
}

export function cancelNewGameAction(socket) {
  return function(dispatch) {
    dispatch({ type: 'cancel_new_game' });
    socket.emit('cancel_new_game');
  };
}

export function createGameStore() {
  return createStore(game, applyMiddleware(thunkMiddleware));
}
