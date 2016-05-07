
# Minefield Mahjong

[![Build Status](https://travis-ci.org/pwmarcz/minefield.svg?branch=master)](https://travis-ci.org/pwmarcz/minefield)

This is a two-player version of Riichi Mahjong.

See http://pwmarcz.pl/minefield/ (where the project is currently deployed) for more details.

## License

The project is available under MIT license. See COPYING for more details.

## Install

Required packages (as of Ubuntu 14.04):

    python-dev
    libevent-dev
    libpcre3-dev
    nodejs
    npm

You also need a recent Node.js version.

Install libraries:

    $ cd server
    $ make

Make targets are:

  - `make static` - recompile static assets
  - `make watch` - recompile static assets on each change
  - `make serve` - serve the website in development mode
  - `make serve_prod` - serve the website in production mode

## Run (in developer mode)

    $ make watch
    $ make serve

then browse to `localhost:8080`.

## Test

  - `make test` - run Python (server) tests
  - `make test_js` - run JavaScript tests
  - `make watch_test_js` - run JavaScript tests on each change

## Deploy

Minefield is currently a static web page plus a WebSocket (SocketIO) server.
To deploy Minefield, you need to:

  - run `make serve_prod`, which serves the WebSocket part on port 8080,
  - serve the static files under a given location, for instance `/minefield/`,
  - serve the WebSocket under the `socket.io` directory, for instance `/minefield/socket.io`.

Here's an example configuration for nginx:

    location /minefield {
        /path/to/minefield/client/static;
    }

    location /minefield/socket.io {
        proxy_pass http://127.0.0.1:8080/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
