
import React from 'react';

export function Ui(props) {
  return (
    <div className='ui'>
      <NickBar you='Akagi' opponent='Washizu' />
      <div className='table' />
      <StatusBar clockTime={420*1000} message='Hello' />
    </div>
  )
}

function NickBar({you, opponent}) {
  return (
    <div className="nicks">
      <span>
        You: <strong className="you">{you}</strong>
      </span>
      <span style={{float: 'right'}}>
        Opponent: <strong className="opponent">{opponent}</strong>
      </span>
    </div>
  );
}

function StatusBar({clockTime, message}) {
  var clock;
  if (typeof clockTime == 'number' && clockTime >= 0) {
    var clockTimeSeconds = Math.ceil(clockTime / 1000);
    function padZeros(number, n) {
      var s = number.toString();
      while (s.length < n)
        s = '0' + s;
      return s;
    }
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
