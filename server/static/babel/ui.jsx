

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
