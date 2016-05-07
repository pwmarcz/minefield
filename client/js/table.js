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
      <TileList className="discards any-discards" tiles={discards} />
      <TileList className="opponent-discards any-discards" tiles={opponentDiscards} />
      <TileList onTileClick={onTileClick} className="tiles" tiles={tiles} />
      <TileList onTileClick={onHandTileClick} className="hand" tiles={hand} />
      {submitButton}
    </div>
  );
}

export const GameTablePhaseOne = connect(
  function mapStateToProps({ doraInd, player, east, tiles, handData, move }) {
    let yourTurn = move && move.type === 'hand';
    return {
      doraInd,
      isEast: player === east,
      tiles: tiles,
      hand: handData.map(a => a.tile),
      canClickTile: yourTurn && handData.length < 13,
      canClickHandTile: yourTurn,
      showSubmit: yourTurn,
      canSubmit: yourTurn && handData.length === 13,
    };
  },
  function mapDispatchToProps(dispatch) {
    return {
      onTileClick(idx, tile) {
        dispatch(actions.selectTile(idx));
      },
      onHandTileClick(idx, tile) {
        dispatch(actions.unselectTile(idx));
      },
      onSubmit() {
        dispatch(actions.submitHand());
      }
    };
  })(Table);

export const GameTablePhaseTwo = connect(
  function mapStateToProps({ doraInd, player, east, tiles, discards, opponentDiscards, handData, move }) {
    let yourTurn = move && move.type === 'discard';
    return {
      doraInd,
      isEast: player === east,
      tiles,
      discards,
      opponentDiscards,
      hand: handData.map(a => a.tile),
      canClickTile: yourTurn,
    };
  },
  function mapDispatchToProps(dispatch) {
    return {
      onTileClick(idx, tile) {
        dispatch(actions.discard(idx));
      }
    };
  })(Table);
