
# Minefield Mahjong

[![Build Status](https://travis-ci.org/pwmarcz/minefield.svg?branch=master)](https://travis-ci.org/pwmarcz/minefield)

This is a two-player version of Riichi Mahjong.

See http://pwmarcz.pl/minefield/ (where the project is currently deployed) for more details.

## License

The project is available under MIT license. See COPYING for more details.

## Install

For frontend, node.js and yarn is required.

For backend, Rust and Cargo.

Install libraries:

    $ make

Make targets are:

  - `make static` - recompile static assets
  - `make watch` - recompile static assets on each change
  - `make serve` - serve the website in development mode
  - `make bot` - run bot

## Run (in developer mode)

    $ make watch
    $ make serve

then browse to `localhost:8080`.

## Test

  - `make test` - run server tests
  - `make test_js` - run JavaScript tests
  - `make watch_test_js` - run JavaScript tests on each change

## Old server (Python)

  - `make env` - build virtualenv
  - `make test_py` - run tests
  - `make serve_py`- serve the website in development mode

## Deploy

Minefield is currently a static web page plus a WebSocket server.
To deploy Minefield, you need to:

  - copy files (see `make sync`),
  - run `minefield-server` (and possibly `minefield-bot`)
  - serve the static files under a given location, for instance `/minefield/`,
  - serve the WebSocket under the `ws` path, for instance `/minefield/ws`.

Here's an example configuration for nginx:

    location /minefield {
        /path/to/minefield/client/static;
    }

    location /minefield/socket.io {
        proxy_pass http://127.0.0.1:8080/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Prevent dropping idle connections
        proxy_read_timeout 7d;
    }
