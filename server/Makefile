
.PHONY: all
all: env node bundles

.PHONY: env
env:
	[ -e env/bin/python ] || virtualenv env/
	env/bin/pip install -q -r requirements.txt

.PHONY: node
node:
	npm install

.PHONY: bundles
bundles:
	node_modules/.bin/webpack

.PHONY: test
test:
	env/bin/nosetests *.py -v

.PHONY: test_js
test_js:
	node_modules/.bin/mocha js/test.js --compilers 'js:babel-register'

.PHONY: watch_test_js
watch_test_js:
	node_modules/.bin/mocha js/test.js --compilers 'js:babel-register' --watch

.PHONY: watch
watch:
	node_modules/.bin/webpack --watch

.PHONY: serve
serve: bundles
	env/bin/python server.py --debug --host 0.0.0.0 --port 8080

.PHONY: serve_prod
serve_prod: env css js
	env/bin/python server.py --host 127.0.0.1 --port 8080
