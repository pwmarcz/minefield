
.PHONY: all css test watch serve serve_prod env

all: env css

env:
	[ -e env/bin/python ] || virtualenv env/
	env/bin/pip install -q -r requirements.txt

css: static/css/default.auto.css static/css/sprites.auto.css

test:
	env/bin/nosetests *.py -v

watch: css
	env/bin/pyscss --no-compress --suffix=auto -w static/scss/ -o static/css/

serve: css
	env/bin/python server.py --debug --host 0.0.0.0 --port 8080

serve_prod: env css
	env/bin/python server.py --host 127.0.0.1 --port 8080

serve_bot:
	env/bin/python bot_connect.py --host 127.0.0.1 --port 8080 --nick Bot

static/css/%.auto.css: static/scss/%.scss
	env/bin/pyscss --no-compress -o $@ $<
