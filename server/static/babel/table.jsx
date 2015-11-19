function TableX(props) {
  var doraIndTile = <Tile type={props.doraInd} />;
  var eastDisplay;
  if (props.isEast) {
    eastDisplay = <img src="tiles/E.svg" title="East" />;
  } else {
    eastDisplay = <img src="tiles/E.svg" title="West" />;
  }

  var stick, opponentStick;
  if (props.discards && props.discards.length > 0) {
    stick = <div className="stick any-stick" />;
  }
  if (props.opponentDiscards && props.opponentDiscards.length > 0) {
    opponentStick = <div className="opponent-stick any-stick" />;
  }

  return (
    <div className="table">
      <div className="dora-display">{doraIndTile}</div>
      <div className="east-display">{eastDisplay}</div>
      {stick}
      {opponentStick}
      <TileList className="discards any-discards" types={props.discards} />
      <TileList className="opponent-discards any-discards" types={props.opponentDiscards} />
      <TileList onTileClick={props.onTileClick} className="tiles" types={props.tiles} />
      <TileList onTileClick={props.onHandTileClick} className="hand" types={props.hand} />
    </div>
  );
}
