
.PHONY: all
all: env node static

.PHONY: env
env:
	[ -e server/env3/bin/python ] || virtualenv --python=/usr/bin/python3 server/env3/
	server/env3/bin/pip install -q -r server/requirements.txt

.PHONY: node
node:
	cd client && npm install

.PHONY: static
static:
	cd client && node_modules/.bin/webpack

.PHONY: test
test:
	server/env3/bin/nosetests server/*.py -v

.PHONY: test_js
test_js:
	cd client && node_modules/.bin/mocha js/test.js --compilers 'js:babel-register' --ui tdd

.PHONY: watch_test_js
watch_test_js:
	cd client && node_modules/.bin/mocha js/test.js --compilers 'js:babel-register' --ui tdd --watch

.PHONY: watch
watch:
	cd client && ./node_modules/.bin/webpack --watch

.PHONY: serve
serve:
	server/env3/bin/python server/server.py --debug --host 0.0.0.0 --port 8080

.PHONY: serve_prod
serve_prod:
	server/env3/bin/python server/server.py --host 127.0.0.1 --port 8080
