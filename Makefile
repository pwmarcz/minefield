
REMOTE ?= pwmarcz.pl:_minefield/

TO_SYNC = client/static \
	server-rs/target/release/minefield-bot \
	server-rs/target/release/minefield-server

.PHONY: all
all: node static rust

## Client (JS)

.PHONY: node
node:
	cd client && yarn

.PHONY: static
static:
	cd client && node_modules/.bin/webpack

.PHONY: watch
watch:
	cd client && ./node_modules/.bin/webpack --watch

.PHONY: test_js
test_js:
	cd client && node_modules/.bin/mocha js/test.js --require @babel/register --ui tdd

## Server (Rust)

.PHONY: rust
rust:
	cd server-rs && cargo build

.PHONY: rust_prod
rust_prod:
	cd server-rs && cargo build --release

.PHONY: serve
serve:
	cd server-rs/minefield-server && cargo run -- --static-path ../../client/static

.PHONY: bot
bot:
	cd server-rs/minefield-bot && cargo run -- --spawn

.PHONY:
test:
	cd server-rs/ && cargo test

## Server (Python)

.PHONY: env
env:
	[ -e server-py/env/bin/python ] || virtualenv --python=python3 server-py/env/
	[ -e server-py/env/bin/pip-sync ] || server-py/env/bin/pip install -q -r server-py/requirements.txt
	server-py/env/bin/pip-sync server-py/requirements.txt

.PHONY: test_py
test_py:
	server-py/env/bin/pytest server-py/*.py -v

.PHONY: serve_py
serve_py:
	server-py/env/bin/python server-py/server.py --debug --host 0.0.0.0 --port 8080

## Deploy

.PHONY: deploy
deploy: static rust_prod sync

.PHONY: sync
sync:
	rsync -rva $(TO_SYNC) $(REMOTE)
