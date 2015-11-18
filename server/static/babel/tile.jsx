class Tile extends React.Component {
  render() {
    return <div className="tile" data-tile={this.props.type} title={Tile.getTitle(this.props.type)} />;
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
