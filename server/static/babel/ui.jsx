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

    var table, lobby;
    var statusMessage = '';
    if (this.state.status == 'beforeGame') {
      table = <div className="table" />;
      lobby = <Lobby items={this.state.games}
                     status={this.state.lobbyStatus}
                     onNewGame={this.onNewGame.bind(this)}
                     onJoin={this.onJoin.bind(this)}
                     onCancel={this.onCancel.bind(this)} />;
    } else {
      var tableProps = {
        isEast: this.state.player == this.state.east,
        doraInd: this.state.doraInd,
        hand: this.state.hand,
        tiles: this.state.tiles,
        discards: this.state.discards,
        opponentDiscards: this.state.opponentDiscards,
      };

      if (this.state.status == 'phaseOne') {
        table = <TablePhaseOne {...tableProps}
                               onSubmit={this.onSubmit.bind(this)} />;
        statusMessage = 'Choose your hand and press OK';
      } else if (this.state.status == 'phaseOneWait') {
        table = <Table {...tableProps} />;
        statusMessage = 'Hand selected, waiting for opponent...';
      } else if (this.state.status == 'phaseTwo') {
        table = <TablePhaseTwo {...tableProps}
                               onDiscard={this.onDiscard.bind(this)} />;
        statusMessage = 'Your move!';
      } else if (this.state.status == 'phaseTwoWait') {
        table = <Table {...tableProps} />;
      }
    }

    var clockTime = this.getClockTime();

    return (
      <div className="ui">
        <NickBar nicks={this.state.nicks} />
        {table}
        {lobby}
        {overlay}
        <StatusBar message={statusMessage} clockTime={clockTime} />
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

    this.socket.on('phase_one', (data) => {
      data.tiles.sort();
      this.setState({
        status: 'phaseOne',
        doraInd: data.dora_ind,
        player: data.you,
        east: data.east,
        tiles: data.tiles,
      });
    });

    this.socket.on('phase_two', () => {
      this.setState({
        status: 'phaseTwoWait',
        discards: [],
        opponentDiscards: [],
      });
    });

    this.socket.on('start_move', (data) => {
      if (this.state.status == 'phaseTwoWait') {
        this.setState({ status: 'phaseTwo' });
      }
      this.showClock(data.time_limit*1000);
    });

    this.socket.on('end_move', (data) => {
      this.hideClock();
    });

    this.socket.on('discarded', (data) => {
      if (data.player != this.state.player) {
        var opponentDiscards = this.state.opponentDiscards.slice();
        opponentDiscards.push(data.tile);
        this.setState({ opponentDiscards: opponentDiscards });
      };
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

  onSubmit(tiles, hand) {
    this.socket.emit('hand', hand);
    // keep clock
    this.setState({ tiles: tiles, hand: hand, status: 'phaseOneWait' });
  }

  onDiscard(discard, tiles, discards) {
    this.socket.emit('discard', discard);
    this.hideClock();
    this.setState({
      tiles: tiles,
      discards: discards,
      status: 'phaseTwoWait'
    });
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

    // handle clock

    this.setState({ beatNum: beatNum + 1 });
  }

  showClock(timeLimit) {
    this.setState({
      clock: {
        start: new Date(),
        timeLimit: timeLimit,
      }
    });
  }

  hideClock() {
    this.setState({ clock: null });
  }

  getClockTime() {
    if (this.state.clock) {
      var now = new Date();
      return this.state.clock.start.getTime()
             + this.state.clock.timeLimit
             - now.getTime();
    } else {
      return null;
    }
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

function StatusBar(props) {
  var clock;
  if (typeof props.clockTime == 'number' && props.clockTime >= 0) {
    var clockTimeSeconds = Math.ceil(props.clockTime / 1000);
    function padZeros(number, n) {
      var s = number.toString();
      while (s.length < n)
        s = '0' + s;
      return s;
    }
    var className = 'clock';
    if (clockTimeSeconds <= 10)
      className += ' warning';
    var minutes = Math.floor(clockTimeSeconds / 60);
    var seconds = padZeros(clockTimeSeconds % 60, 2);
    clock = <div className={className}>{minutes}:{seconds}</div>;
  }
  return (
    <div className="status">
      <div className="status-text">{props.message}</div>
      {clock}
    </div>
  );
}
