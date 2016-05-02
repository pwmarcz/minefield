
import { createStore } from 'redux';


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
    return Object.assign({}, state, {connected: true});
  case 'socket_games':
    return Object.assign({}, state, {lobby: Object.assign({}, state.lobby, {games: action.data})});
  default:
    return state;
  }
}


let store = createStore(game);
console.log(store.getState());
store.dispatch({type: 'socket_games', data: ['foo', 'bar', 'baz']})
console.log(store.getState());

export default store;
