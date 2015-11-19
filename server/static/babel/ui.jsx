
class UiStageOne extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tiles: props.tiles,
      hand: [],
      handIndices: [],
    }
  }

  render() {
    var onTileClick;
    if (this.state.hand.length < 13) {
      onTileClick = this.onTileClick.bind(this);
    }

    return (
      <div className="ui">
        <TableX doraInd={this.props.doraInd}
                isEast={this.props.isEast}
                tiles={this.state.tiles}
                hand={this.state.hand}
                onTileClick={onTileClick}
                onHandTileClick={this.onHandTileClick.bind(this)} />
      </div>
    );
  }

  onTileClick(i, type) {
    var tiles = this.state.tiles.slice();
    var hand = this.state.hand.slice();
    var handIndices = this.state.handIndices.slice();
    hand.push(tiles[i]);
    handIndices.push(i);
    tiles[i] = '';
    this.setState({tiles: tiles, hand: hand, handIndices: handIndices});
  }

  onHandTileClick(i, type) {
    var tiles = this.state.tiles.slice();
    var hand = this.state.hand.slice();
    var handIndices = this.state.handIndices.slice();
    var j = handIndices.pop();
    tiles[j] = hand.pop();
    this.setState({tiles: tiles, hand: hand, handIndices: handIndices});
  }
}
