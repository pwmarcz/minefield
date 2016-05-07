import React from 'react';
import { connect } from 'react-redux';
import { BEATS_PER_SECOND } from './game';


export function StatusBar({ clockTime, message }) {
  var clock;
  if (typeof clockTime === 'number' && clockTime >= 0) {
    var clockTimeSeconds = Math.ceil(clockTime / 1000);
    var className = 'clock';
    if (clockTimeSeconds <= 10)
      className += ' warning';
    var minutes = Math.floor(clockTimeSeconds / 60);
    var seconds = padZeros(clockTimeSeconds % 60, 2);
    clock = <div className={className}>{minutes}:{seconds}</div>;
  }
  return (
    <div className="status">
      <div className="status-text">{message}</div>
      {clock}
    </div>
  );
}

export const GameStatusBar = connect(
  function mapStateToProps({ status, move, beatNum }) {
    let clockTime, message;
    if (move) {
      clockTime = (move.deadline - beatNum)*1000/BEATS_PER_SECOND;
      if (move.type === 'hand') {
        message = 'Choose your hand and press OK';
      } else if (move.type === 'discard') {
        message = 'Your turn!';
      }
    } else {
      switch (status) {
      case 'joining':
        message = 'Starting game';
        break;
      case 'advertising':
        message = 'Waiting for opponent';
        break;
      case 'phase_one':
        message = 'Waiting for opponent\'s hand';
        break;
      }
    }

    return { clockTime, message };
  }
)(StatusBar);


function padZeros(number, n) {
  var s = number.toString();
  while (s.length < n)
    s = '0' + s;
  return s;
}
