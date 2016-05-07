import React from 'react';
import { connect } from 'react-redux';
import { GameLobby } from './lobby';
import { GameTablePhaseOne, GameTablePhaseTwo } from './table';
import { GameEnd } from './end';
import { GameStatusBar } from './status';


export function Ui({ connected, status, ron, draw, nicks }) {
  let overlay;
  if (!connected) {
    overlay = <Overlay message="Connecting to server" />;
  }

  let table, lobby;
  if (status === 'lobby') {
    // empty table
    table = <div className="table" />;
    lobby = <GameLobby />;
  } else if (status === 'phase_one') {
    table = <GameTablePhaseOne />;
  } else if (status === 'phase_two') {
    table = <GameTablePhaseTwo />;
  }

  return (
    <div className='ui'>
      {overlay}
      <NickBar you={nicks.you} opponent={nicks.opponent} />
      {table}
      {lobby}
      <GameEnd />
      <GameStatusBar />
    </div>
  );
}

function mapStateToProps({ connected, status, ron, draw, nicks, move, beatNum }) {
  return { connected, status, ron, draw, nicks };
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
      <span style={{ float: 'right' }}>
        Opponent: <strong className="opponent">{opponent}</strong>
      </span>
    </div>
  );
}
