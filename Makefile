
REMOTE ?= pwmarcz.pl:_minefield/

TO_SYNC = client/static \
	server-rs/target/release/minefield-bot \
	server-rs/target/release/minefield-server

.PHONY: all
all: env node static

.PHONY: env
env:
	[ -e server/env/bin/python ] || virtualenv --python=python3 server/env/
	[ -e server/env/bin/pip-sync ] || server/env/bin/pip install -q -r server/requirements.txt
	server/env/bin/pip-sync server/requirements.txt

.PHONY: node
node:
	cd client && yarn

.PHONY: static
static:
	cd client && node_modules/.bin/webpack

.PHONY: test
test:
	server/env/bin/pytest server/*.py -v

.PHONY: test_js
test_js:
	cd client && node_modules/.bin/mocha js/test.js --require @babel/register --ui tdd

.PHONY: watch_test_js
watch_test_js:
	cd client && node_modules/.bin/mocha js/test.js --require @babel/register --ui tdd --watch

.PHONY: watch
watch:
	cd client && ./node_modules/.bin/webpack --watch

.PHONY: serve
serve:
	server/env/bin/python server/server.py --debug --host 0.0.0.0 --port 8080

.PHONY: serve_prod
serve_prod:
	server/env/bin/python server/server.py --host 127.0.0.1 --port 8080

.PHONY: rust_prod
rust_prod:
	cd server-rs && cargo build --release

	cp server-rs/target/release/minefield-bot build/
	cp server-rs/target/release/minefield-server build/

.PHONY: deploy
deploy: static rust_prod sync

.PHONY: sync
sync:
	rsync -rva $(TO_SYNC) $(REMOTE)
