import React from 'react';
import { connect } from 'react-redux';
import { Tile, TileList } from './tile';


export function Table({
  doraInd,
  isEast,
  discards,
  opponentDiscards,
  tiles,
  hand,
  showSubmit,
  onSubmit,
  onTileClick,
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
    if (onSubmit) {
      submitButton = <button className="submit-hand" onClick={onSubmit}>OK</button>;
    } else {
      submitButton = <button className="submit-hand" disabled>OK</button>;
    }
  }

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
    hand: handData.map(a => a.tile)
  };
}

export const GameTablePhaseOne = connect(mapStateToProps)(Table);
