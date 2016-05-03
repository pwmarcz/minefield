import React from 'react';
import { connect } from 'react-redux';
import { Lobby } from './lobby';


export function Ui({ connected, status, nicks }) {
  let overlay;
  if (!connected) {
    overlay = <Overlay message="Connecting to server" />;
  }

  let table, popup;
  if (status === 'lobby') {
    // empty table
    table = <div className="table" />;
    popup = <Lobby />;
  }

  return (
    <div className='ui'>
      {overlay}
      <NickBar you={nicks.you} opponent={nicks.opponent} />
      {table}
      {popup}
      <StatusBar clockTime={420*1000} message='todo' />
    </div>
  );
}

function mapStateToProps({ connected, status, nicks }) {
  return { connected, status, nicks };
}

export const GameUi = connect(mapStateToProps)(Ui);


function Overlay({ message }) {
  return (
    <div className="overlay main-part">
      <div className="message">{message}</div>
    </div>
  );
}


function NickBar({ you, opponent }) {
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

function StatusBar({ clockTime, message }) {
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

function padZeros(number, n) {
  var s = number.toString();
  while (s.length < n)
    s = '0' + s;
  return s;
}
