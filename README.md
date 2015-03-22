
# Minefield Mahjong

This is a two-player version of Riichi Mahjong.

See https://pwmarcz.com/minefield/ (where the project is currently deployed) for more details.

## License

The project is available under MIT license. See COPYING for more details.

## Install and run

Required packages (as of Ubuntu 12.04):

  python-dev
  libevent-dev
  libpcre3-dev

Install Python libraries:

  $ cd server
  $ make

To develop:

  $ make watch  # watch SCSS for changes
  $ make serve

  then browse to localhost:8080.

Server make targets are:

  - make env - install server packages
  - make css - recompile SCSS
  - make watch - recompiles CSS on each change
  - make serve - serve the website in development mode
  - make serve_prod - serve the website in production mode

## Deployment

Minefield is currently a static web page plus a WebSocket (SocketIO) server.
To deploy Minefield, you need to:

1. run `make serve_prod`, which serves the WebSocket part on port 8080,

2. serve the static files under a given location, for instance `/minefield/`;

3. serve the WebSocket under the `socket.io` directory, for instance `/minefield/socket.io`.

Here's an example configuration for nginx:

    location /minefield {
        alias /path/to/minefield/server/static;
    }

    location /minefield/socket.io {
        proxy_pass http://127.0.0.1:8080/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
