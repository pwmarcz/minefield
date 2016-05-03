import React from 'react';
import ReactDOM from 'react-dom';
import { startGame } from './game';
import { GameUi } from './ui';
import { Provider } from 'react-redux';


let store = startGame();

ReactDOM.render(<Provider store={store}><GameUi /></Provider>,
                document.getElementById('ui'));
