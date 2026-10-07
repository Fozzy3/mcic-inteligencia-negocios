.PHONY: install test run fuentes informe presentacion pdf clean

# Carpeta del manual de marca UD (Times New Roman y Cambria). Las fuentes no se versionan.
MARCA ?= $(HOME)/repos/ud/maestria/mcic/.UniversidadDistrital-manual-marca

install:
	uv sync

test:
	uv run pytest -q

run:
	uv run python -m bi.pipeline

fuentes/times.ttf:
	mkdir -p fuentes
	cp "$(MARCA)"/fuentes/times*.ttf "$(MARCA)"/fuentes/cambria* fuentes/

fuentes: fuentes/times.ttf

informe: fuentes
	cd informe && tectonic -Z search-path=.. informe.tex

presentacion: fuentes
	cd presentacion && tectonic -Z search-path=.. presentacion.tex

pdf: informe presentacion

clean:
	rm -f informe/*.aux informe/*.log informe/*.toc informe/*.out presentacion/*.aux presentacion/*.log \
	      presentacion/*.nav presentacion/*.snm presentacion/*.toc presentacion/*.out
