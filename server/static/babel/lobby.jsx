class Lobby extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      nick: this.props.nick || '',
      status: 'normal',
    }
  }

  render() {
    var items = this.props.items.map((item, i) => {
      if (item.type == 'game')
        return <LobbyGame nicks={item.nicks} />;
      else {
        var onJoin;
        if (this.state.status == 'normal')
          onJoin = this.onJoin.bind(this, item.key);

        return <LobbyPlayer nick={item.nick}
                            key={i}
                            onJoin={onJoin} />;
      }
    });

    var newGame;
    if (this.state.status == 'normal') {
      newGame = (
        <tr>
          <td><input name="nick"
                     placeholder="Your name"
                     value={this.state.nick}
                     onChange={this.onNickChange.bind(this)} /></td>
          <td className="vs"></td>
          <td>
            <button className="new-game" onClick={this.onNewGame.bind(this)}>New game</button>
          </td>
        </tr>
      );
    } else if (this.state.status == 'advertising' || this.state.status == 'joining') {
      newGame = (
        <tr>
          <td><input name="nick" value={this.state.nick} disabled /></td>
          <td className="vs"></td>
          <td>
            <button className="cancel" onClick={this.onCancel.bind(this)}>Cancel</button>
          </td>
        </tr>
      );
    }

    return (
      <div className="lobby popup">
        <h2>Minefield <sup className="note">beta</sup></h2>
        <div className="games">
          <div className="scroll">
            <table>
              <tbody>
                {items}
              </tbody>
            </table>
           </div>
        </div>
        <br />
        <table>
          <tbody>
            {newGame}
          </tbody>
        </table>
      </div>
    );

    function LobbyGame(props) {
      return (
        <tr>
          <Nick nick={props.nicks[0]} />
          <td className="vs">vs</td>
          <Nick nick={props.nicks[1]} />
        </tr>
      );
    }

    function LobbyPlayer(props) {
      var join;
      if (props.onJoin)
        join = <button className="join" onClick={props.onJoin}>Join</button>;

      return (
        <tr>
          <Nick nick={props.nick} />
          <td className="vs"></td>
          <td>
            {join}
          </td>
        </tr>
      );
    }

    function Nick(props) {
      var nick = props.nick || 'Anonymous';
      if (props.nick == 'Bot')
        return <td><i>{nick}</i></td>;
      else
        return <td>{nick}</td>;
    }
  }

  onNickChange(event) {
    this.setState({ nick: event.target.value });
  }

  onNewGame() {
    this.setState({ status: 'advertising' });
  }

  onCancel() {
    this.setState({ status: 'normal' });
  }

  onJoin(key) {
    debugger;
    this.setState({ status: 'joining' });
  }
}
