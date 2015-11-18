function TableX(props) {
  var doraIndTile = <Tile type={props.doraInd} />;
  var eastDisplay;
  if (props.isEast) {
    eastDisplay = <img src="tiles/E.svg" title="East" />;
  } else {
    eastDisplay = <img src="tiles/E.svg" title="West" />;
  }

  var stick, opponentStick;
  if (props.discards.length > 0) {
    stick = <div className="stick any-stick" />;
  }
  if (props.opponentDiscards.length > 0) {
    opponentStick = <div className="opponent-stick any-stick" />;
  }

  function renderTiles(tileTypes) {
    return tileTypes.map((type, i) => <Tile type={type} key={i} />);
  }

  return (
    <div className="table">
      <div className="dora-display">{doraIndTile}</div>
      <div className="east-display">{eastDisplay}</div>
      {stick}
      {opponentStick}
      <div className="discards any-discards">{renderTiles(props.discards)}</div>
      <div className="opponent-discards any-discards">{renderTiles(props.opponentDiscards)}</div>
      <div className="tiles">{renderTiles(props.tiles)}</div>
      <div className="hand">{renderTiles(props.hand)}</div>
    </div>
  );
}
