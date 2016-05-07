import React from 'react';
import { connect } from 'react-redux';
import { TileList } from './tile';
import { actions } from './game';


export function End({ player, doraInd, ron, draw, disconnected, aborted, onReset }) {
  if (ron) {
    return <EndRonPopup player={player} doraInd={doraInd} ron={ron} onReset={onReset} />;
  } else if (draw) {
    return (
      <div className="popup">
        <h2>Draw!</h2>
        <p>The game is a draw!</p>
        <p>
          <button onClick={onReset}>New game</button>
        </p>
      </div>
    );
  } else if (aborted) {
    return (
      <div className="popup">
        <h2>Game aborted</h2>
        <p>The game was aborted (reason: {aborted.description}).</p>
        <p>
          <button onClick={onReset}>New game</button>
        </p>
      </div>
    );
  } else if (disconnected) {
    return (
      <div className="overlay">
        <div>
          <div>Disconnected from server</div>
          <button onClick={onReset}>Reload</button>
        </div>
      </div>
    );
  } else {
    return null;
  }
}

export const GameEnd = connect(
  function mapStateToProps({ player, doraInd, ron, draw, disconnected, aborted }) {
    return { player, doraInd, ron, draw, disconnected, aborted };
  },
  function mapDispatchToProps(dispatch) {
    return {
      onReset() {
        dispatch(actions.reset());
      }
    };
  }
)(End);

export function EndRonPopup({ player, doraInd, ron, onReset }) {
  let win = player === ron.player;

  // Extract winning tile and present to the right
  let tiles = ron.hand.slice();
  tiles.splice(tiles.indexOf(ron.tile), 1);
  tiles.push(null, ron.tile);

  let limitDesc = ['?', 'mangan', 'haneman', 'baiman', 'sanbaiman', 'yakuman'][ron.limit];

  return (
    <div className="popup">
      <h2>Ron!</h2>
      <p>{win ? 'You won!' : 'You lost!'}</p>
      <TileList tiles={tiles} />
      <p>Dora:</p>
      <TileList tiles={[doraInd, ron.uradora_ind]} />
      <p>Yaku:</p>
      <ul>{ron.yaku.map(item => <li>{item}</li>)}</ul>
      <p>
        Score: {ron.points} points (<b>{limitDesc}</b>)
      </p>
      <p>
        <button onClick={onReset}>New game</button>
      </p>
    </div>
  );
}
