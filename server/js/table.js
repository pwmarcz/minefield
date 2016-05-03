import React from 'react';
import { connect } from 'react-redux';
import { Tile, TileList } from './tile';
import { actions } from './game';


export function Table({
  doraInd,
  isEast,
  discards,
  opponentDiscards,
  tiles,
  hand,
  showSubmit,
  canSubmit,
  onSubmit,
  canClickTile,
  onTileClick,
  canClickHandTile,
  onHandTileClick
}) {
  var doraIndTile = <Tile tile={doraInd} />;
  var eastDisplay;
  // TODO webpack image?
  if (isEast) {
    eastDisplay = <img src="tiles/E.svg" title="East" />;
  } else {
    eastDisplay = <img src="tiles/W.svg" title="West" />;
  }

  var stick, opponentStick;
  if (discards && discards.length > 0) {
    stick = <div className="stick any-stick" />;
  }
  if (opponentDiscards && opponentDiscards.length > 0) {
    opponentStick = <div className="opponent-stick any-stick" />;
  }

  var submitButton;
  if (showSubmit) {
    if (canSubmit) {
      submitButton = <button className="submit-hand" onClick={onSubmit}>OK</button>;
    } else {
      submitButton = <button className="submit-hand" disabled>OK</button>;
    }
  }

  if (!canClickTile)
    onTileClick = null;
  if (!canClickHandTile)
    onHandTileClick = null;

  return (
    <div className="table">
      <div className="dora-display">{doraIndTile}</div>
      <div className="east-display">{eastDisplay}</div>
      {stick}
      {opponentStick}
      <TileList className="discards any-discards" types={discards} />
      <TileList className="opponent-discards any-discards" types={opponentDiscards} />
      <TileList onTileClick={onTileClick} className="tiles" tiles={tiles} />
      <TileList onTileClick={onHandTileClick} className="hand" tiles={hand} />
      {submitButton}
    </div>
  );
}

function mapStateToProps({ doraInd, player, east, tiles, handData }) {
  return {
    doraInd,
    isEast: player === east,
    tiles: tiles,
    hand: handData.map(a => a.tile),
    canClickTile: handData.length < 13,
    canClickHandTile: true,
    showSubmit: true,
    canSubmit: handData.length === 13,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    onTileClick(idx, tile) {
      dispatch(actions.selectTile(idx));
    },
    onHandTileClick(idx, tile) {
      dispatch(actions.unselectTile(idx));
    },
  };
}

export const GameTablePhaseOne = connect(mapStateToProps, mapDispatchToProps)(Table);
