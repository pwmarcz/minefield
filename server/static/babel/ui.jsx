
class UiStageOne extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tiles: props.tiles,
      handData: [],
    }
  }

  render() {
    var onTileClick;
    var hand = this.state.handData.map(h => h.type);
    if (hand.length < 13) {
      onTileClick = this.onTileClick.bind(this);
    }

    return (
      <div className="ui">
        <TableX doraInd={this.props.doraInd}
                isEast={this.props.isEast}
                tiles={this.state.tiles}
                hand={hand}
                onTileClick={onTileClick}
                onHandTileClick={this.onHandTileClick.bind(this)} />
      </div>
    );
  }

  onTileClick(i, type) {
    var tiles = this.state.tiles.slice();
    var handData = this.state.handData.slice();
    handData.push({ type: tiles[i], index: i });
    tiles[i] = '';
    handData.sort((h1, h2) => {
      if (h1.type < h2.type) {
        return -1;
      } else if (h1.type == h2.type) {
        return 0;
      } else {
        return 1;
      }
    });
    this.setState({tiles: tiles, handData: handData});
  }

  onHandTileClick(i, type) {
    var tiles = this.state.tiles.slice();
    var handData = this.state.handData.slice();
    var h = handData[i];
    handData.splice(i, 1);
    tiles[h.index] = h.type;
    this.setState({tiles: tiles, handData: handData});
  }
}
