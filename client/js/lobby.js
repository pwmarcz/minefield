import React from 'react';
import { connect } from 'react-redux';
import { actions } from './game';


export function Lobby({
  lobbyStatus, games, nick,
  onNickChange, onJoin, onNewGame, onCancelNewGame
}) {

  let items = games.map((item, i) => {
    if (item.type === 'game')
      return <LobbyGame nicks={item.nicks} key={i} />;
    else {
      let onJoinPlayer;
      if (lobbyStatus === 'normal') {
        onJoinPlayer = () => onJoin(item.key);
      }
      return <LobbyPlayer nick={item.nick} key={i}
                          onJoin={onJoinPlayer} />;
    }
  });

  let newGame;
  if (lobbyStatus === 'normal') {
    newGame = (
      <tr>
        <td><input name="nick"
                   placeholder="Your name"
                   value={nick}
                   onChange={onNickChange} /></td>
        <td className="vs"></td>
        <td>
          <button className="new-game" onClick={onNewGame}>New game</button>
        </td>
      </tr>
    );
  } else if (lobbyStatus === 'advertising') {
    newGame = (
      <tr>
        <td><input name="nick" value={nick} disabled /></td>
        <td className="vs"></td>
        <td>
          <button className="cancel" onClick={onCancelNewGame}>Cancel</button>
        </td>
      </tr>
    );
  }

  return (
    <div className="lobby popup">
      <h2>Minefield</h2>
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

function mapStateToProps({ lobbyStatus, games, nicks }) {
  return { lobbyStatus, games, nick: nicks.you };
}

function mapDispatchToProps(dispatch) {
  return {
    onNickChange(e) {
      dispatch(actions.setNick(e.target.value));
    },
    onJoin(key) {
      dispatch(actions.join(key));
    },
    onNewGame() {
      dispatch(actions.newGame());
    },
    onCancelNewGame() {
      dispatch(actions.cancelNewGame());
    }
  };
}

export const GameLobby = connect(mapStateToProps, mapDispatchToProps)(Lobby);


function LobbyGame({ nicks }) {
  return (
    <tr>
      <LobbyNick nick={nicks[0]} />
      <td className="vs">vs</td>
      <LobbyNick nick={nicks[1]} />
    </tr>
  );
}

function LobbyPlayer({ nick, onJoin }) {
  let join;
  if (onJoin)
    join = <button className="join" onClick={onJoin}>Join</button>;

  return (
    <tr>
      <LobbyNick nick={nick} />
      <td className="vs"></td>
      <td>
        {join}
      </td>
    </tr>
  );
}

function LobbyNick({ nick }) {
  nick = nick || 'Anonymous';
  if (nick === 'Bot')
    return <td><i>{nick}</i></td>;
  else
    return <td>{nick}</td>;
}
