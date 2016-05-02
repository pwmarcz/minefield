import { game } from './game';
import { createStore } from 'redux';

let store = createStore(game);
console.log(store.getState());
