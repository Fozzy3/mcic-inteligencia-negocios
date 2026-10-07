.PHONY: install test run pdf

PDF_OPTS = --pdf-engine=weasyprint --css=informe/pdf.css --embed-resources --standalone \
	--resource-path=informe --shift-heading-level-by=-1 --toc --toc-depth=2

install:
	uv sync

test:
	uv run pytest -q

run:
	uv run python -m bi.pipeline

# Report + appendix with every SQL step, in one PDF.
pdf:
	{ printf '\n## Anexo: código SQL del proceso\n'; \
	  for f in sql/*.sql; do printf '\n### `%s`\n\n```sql\n' "$$f"; cat "$$f"; printf '\n```\n'; done; } \
	| pandoc informe/INFORME.md - $(PDF_OPTS) -M date="$$(date +%Y-%m-%d)" -o informe/proceso.pdf
