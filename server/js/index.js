import React from 'react';
import ReactDOM from 'react-dom';
import { startGame } from './game';
import { GameUi } from './ui';


let store = startGame();

ReactDOM.render(<GameUi store={store} />, document.getElementById('ui'));
