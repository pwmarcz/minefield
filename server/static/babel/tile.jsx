class Tile extends React.Component {
  render() {
    if (this.props.type) {
      return <div className="tile"
                  data-tile={this.props.type}
                  title={Tile.getTitle(this.props.type)}
                  onClick={this.props.onClick} />;
    } else {
      return <div className="tile-placeholder" />;
    }
  }

  static getTitle(type) {
    var suit = type[0];
    var number = type[1];

    switch (suit) {
      case 'M':
        return number + ' Man';
      case 'P':
        return number + ' Pin';
      case 'S':
        return number + ' Sou';
      case 'X':
        return ['Ton', 'Nan', 'Xia', 'Pei', 'Haku', 'Hatsu', 'Chun'][number-1];
    }
  }
}

function TileList(props) {
  var tiles;
  var types = props.types || [];
  var className = props.className || '';

  if (props.onTileClick) {
    tiles = types.map((type, i) => (
      <Tile type={type} key={i} onClick={() => props.onTileClick(i, type)} />
    ));
    className += ' tiles-clickable';
  } else {
    tiles = types.map((type, i) => (
      <Tile type={type} key={i} />
    ));
  }

  return <div className={className}>{tiles}</div>;
}
