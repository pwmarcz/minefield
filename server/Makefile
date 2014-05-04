
.PHONY: all css watch

all: css

css: static/css/default.auto.css static/css/sprites.auto.css

watch: css
	pyscss --no-compress --suffix=auto -w static/scss/ -o static/css/

serve: css
	python server.py

static/css/%.auto.css: static/scss/%.scss
	pyscss --no-compress -o $@ $<
