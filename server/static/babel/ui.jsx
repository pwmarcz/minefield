class Ui extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: 'beforeGame',
      lobbyStatus: 'normal',
      connected: false,
      games: [],
      nicks: { you: '', opponent: '' },
      beatNum: 0,
    };
  }

  render() {
    var overlay;
    if (!this.state.connected) {
      overlay = <Overlay message="Connecting to server" />;
    }

    return (
      <div className="ui">
        <NickBar nicks={this.state.nicks} />
        <div className="table" />
        <Lobby items={this.state.games}
               status={this.state.lobbyStatus}
               onNewGame={this.onNewGame.bind(this)}
               onJoin={this.onJoin.bind(this)}
               onCancel={this.onCancel.bind(this)}
               />
        {overlay}
      </div>
    );
  }

  componentDidMount() {
    this.initNetwork();
    this.initBeat();
  }

  componentWillUnmount() {
    // TODO
  }

  initNetwork() {
    var path = window.location.pathname;
    path = path.substring(1, path.lastIndexOf('/')+1);

    this.socket = io.connect('/minefield', {
      reconnect: false,
      resource: path+'socket.io',
      'sync disconnect on unload': true,
    });
    this.socket.on('connect', () => this.setState({ connected: true }));

    this.socket.on('games', (data) => {
      this.setState({ games: data });
    });

    this.socket.on('join_failed', (data) => {
      this.setState({ lobbyStatus: 'normal' });
    });
  }

  onNewGame(nick) {
    this.socket.emit('new_game', nick);
    this.setState({ lobbyStatus: 'advertising' });
  }

  onJoin(nick, key) {
    this.socket.emit('join', nick, key);
    this.setState({ lobbyStatus: 'joining' });
  }

  onCancel() {
    this.socket.emit('cancel_new_game');
    this.setState({ lobbyStatus: 'normal' });
  }

  initBeat() {
    window.setInterval(this.beat.bind(this), 100);
  };

  beat() {
    var beatNum = this.state.beatNum;

    if (this.state.status == 'beforeGame' && this.state.connected) {
      if (beatNum % 25 == 0)
        this.socket.emit('get_games');
    }

    this.setState({ beatNum: beatNum + 1 });
  }
}

function Overlay(props) {
  return (
    <div className="overlay main-part">
      <div className="message">{props.message}</div>
    </div>
  );
}

function NickBar(props) {
  return (
    <div className="nicks">
      <span>
        You: <strong className="you">{props.you}</strong>
      </span>
      <span style={{float: 'right'}}>
        Opponent: <strong className="opponent">{props.opponent}</strong>
      </span>
    </div>
  );
}
