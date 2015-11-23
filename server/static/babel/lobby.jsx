class Lobby extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.setState({ nick: localStorage.getItem('nick') || '' });
  }

  render() {
    var items = this.props.items.map((item, i) => {
      if (item.type == 'game')
        return <LobbyGame nicks={item.nicks} key={i} />;
      else {
        var onJoin;
        if (this.props.status == 'normal') {
          onJoin = () => {
            if (this.props.onJoin)
              this.props.onJoin(this.state.nick, item.key);
          }
        }
        return <LobbyPlayer nick={item.nick}
                            key={i}
                            onJoin={onJoin} />;
      }
    });

    var newGame;
    if (this.props.status == 'normal') {
      var onNewGame = () => {
        if (this.props.onNewGame)
          this.props.onNewGame(this.state.nick);
      }
      newGame = (
        <tr>
          <td><input name="nick"
                     placeholder="Your name"
                     value={this.state.nick}
                     onChange={this.onNickChange.bind(this)} /></td>
          <td className="vs"></td>
          <td>
            <button className="new-game" onClick={onNewGame}>New game</button>
          </td>
        </tr>
      );
    } else if (this.props.status == 'advertising' || this.props.status == 'joining') {
      newGame = (
        <tr>
          <td><input name="nick" value={this.state.nick} disabled /></td>
          <td className="vs"></td>
          <td>
            <button className="cancel" onClick={this.props.onCancel}>Cancel</button>
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
  }

  onNickChange(event) {
    var newNick = event.target.value;
    this.setState({ nick: newNick });
    localStorage.setItem('nick', newNick);
  }
}

function LobbyGame(props) {
  return (
    <tr>
      <LobbyNick nick={props.nicks[0]} />
      <td className="vs">vs</td>
      <LobbyNick nick={props.nicks[1]} />
    </tr>
  );
}

function LobbyPlayer(props) {
  var join;
  if (props.onJoin)
    join = <button className="join" onClick={props.onJoin}>Join</button>;

  return (
    <tr>
      <LobbyNick nick={props.nick} />
      <td className="vs"></td>
      <td>
        {join}
      </td>
    </tr>
  );
}

function LobbyNick(props) {
  var nick = props.nick || 'Anonymous';
  if (props.nick == 'Bot')
    return <td><i>{nick}</i></td>;
  else
    return <td>{nick}</td>;
}
