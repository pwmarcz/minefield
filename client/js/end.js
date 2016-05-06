import React from 'react';
import { connect } from 'react-redux';
import { TileList } from './tile';
import { actions } from './game';


export function EndPopup({ player, doraInd, ron, draw, onReset }) {
  if (ron) {
    return <EndRonPopup player={player} doraInd={doraInd} ron={ron} onReset={onReset} />;
  } else if (draw) {
    return <EndDrawPopup onReset={onReset} />;
  } else {
    return <div />;
  }
}

export const GameEndPopup = connect(
  function mapStateToProps({ player, doraInd, ron, draw }) {
    return { player, doraInd, ron, draw };
  },
  function mapDispatchToProps(dispatch) {
    return {
      onReset() {
        dispatch(actions.reset());
      }
    };
  }
)(EndPopup);

export function EndRonPopup({ player, doraInd, ron, onReset }) {
  // TODO display winning tile separately
  let win = player === ron.player;
  let tiles = ron.hand;
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

export function EndDrawPopup({ onReset }) {
  return (
    <div className="popup">
      <h2>Draw!</h2>
      <p>The game is a draw!</p>
      <p>
        <button onClick={onReset}>New game</button>
      </p>
    </div>
  );
}
