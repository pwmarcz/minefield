import flask
import argparse
from datetime import datetime

import gevent
import socketio.server
from game_server import GameServer


app = flask.Flask(__name__, static_folder='static', static_url_path='')
# Turn off Cache-Control to prevent aggressive caching during development
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.route("/")
def hello():
    return flask.redirect('/index.html', 301)

# Legacy redirect
@app.route("/ui.html")
def ui():
    return flask.redirect('/index.html', 301)


@app.route('/socket.io/<path:remaining>')
def run_socketio(remaining):
    try:
        socketio.socketio_manage(flask.request.environ, {'/minefield': MinefieldNamespace}, flask.request)
    except:
        app.logger.error("Exception while handling socketio connection",
                         exc_info=True)
    return flask.Response()


def main():
    parser = argparse.ArgumentParser(description='Serve the Minefield Mahjong application.')
    parser.add_argument('--host', metavar='IP', type=str, default='127.0.0.1')
    parser.add_argument('--port', metavar='PORT', type=int, default=8080)
    parser.add_argument('--debug', action='store_true', default=False, help='Run Flask in debug mode')

    args = parser.parse_args()

    from gevent import monkey
    monkey.patch_all()

    app.debug = args.debug
    print 'Starting server:', args
    server = socketio.server.SocketIOServer((args.host, args.port), app, resource="socket.io")
    server.serve_forever()

if __name__ == '__main__':
    main()
