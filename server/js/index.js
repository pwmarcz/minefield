import React from 'react';
import ReactDOM from 'react-dom';
import { createGameStore, useSocket, startBeat } from './game';
import { Ui, GameUi } from './ui';

let path = window.location.pathname;
path = path.substring(1, path.lastIndexOf('/')+1);

let socket = io.connect('/minefield', {
  reconnect: false,
  resource: path+'socket.io',
  'sync disconnect on unload': true,
});

let store = createGameStore(true);
useSocket(store, socket);
startBeat(store);

ReactDOM.render(<GameUi store={store} />, document.getElementById('ui'));
