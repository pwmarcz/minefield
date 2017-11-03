
.PHONY: all
all: env node static

.PHONY: env
env:
	[ -e server/env/bin/python ] || virtualenv --python=python3 server/env/
	server/env/bin/pip install -q -r server/requirements.txt

.PHONY: node
node:
	cd client && yarn

.PHONY: static
static:
	cd client && node_modules/.bin/webpack

.PHONY: test
test:
	server/env/bin/nosetests server/*.py -v

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
	server/env/bin/python server/server.py --debug --host 0.0.0.0 --port 8080

.PHONY: serve_prod
serve_prod:
	server/env/bin/python server/server.py --host 127.0.0.1 --port 8080
