import React from 'react';
import { connect } from 'react-redux';
import { TileList } from './tile';


export function EndPopup({ player, doraInd, ron, draw }) {
  if (ron) {
    return <EndRonPopup player={player} doraInd={doraInd} ron={ron} />;
  } else if (draw) {
    return <EndDrawPopup />;
  } else {
    return <div />;
  }
}

export const GameEndPopup = connect(
  function mapStateToProps({ player, doraInd, ron, draw }) {
    return { player, doraInd, ron, draw };
  },
  function mapDispatchToProps() {
    // TODO new game
    return {};
  }
)(EndPopup);

export function EndRonPopup({ player, doraInd, ron }) {
  // TODO display winning tile separately
  let win = player === ron.player;
  let tiles = ron.hand;
  let limitDesc = ['?', 'mangan', 'haneman', 'baiman', 'sanbaiman', 'yakuman'][ron.limit];

  return (
    <div className="popup">
      <h2>Ron!</h2>
      <p>{win ? 'You won!' : 'You lost!'}</p>
      <TileList tiles={tiles} />
      <p>
        Dora:
        <TileList tiles={[doraInd, ron.uradora_ind]} />
      </p>
      <p>
        Yaku:
        <ul>{ron.yaku.map(item => <li>{item}</li>)}</ul>
      </p>
      <p>
        Score: {ron.points} points (<b>{limitDesc}</b>)
      </p>
      {/* TODO reload */}
      <p>
        <button>New game</button>
      </p>
    </div>
  );
}

export function EndDrawPopup() {
  return (
    <div className="popup">
      <h2>Draw!</h2>
      <p>The game is a draw!</p>
      {/* TODO reload */}
      <p>
        <button>New game</button>
      </p>
    </div>
  );
}
