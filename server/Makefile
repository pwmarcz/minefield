
.PHONY: all css watch

all: css

css: static/css/default.auto.css static/css/sprites.auto.css

watch: css
	pyscss --no-compress --suffix=auto -w static/scss/ -o static/css/

serve: css
	python server.py --debug --host 0.0.0.0 --port 8080

serve_prod: css
	python server.py --host 127.0.0.1 --port 8080

static/css/%.auto.css: static/scss/%.scss
	pyscss --no-compress -o $@ $<

test:
	nosetests *.py -v
