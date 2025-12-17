.PHONY: commit

commit:
	@if [ ! -f .commit-msg ]; then echo "Error: .commit-msg not found"; exit 1; fi
	@MSG=$$(cat .commit-msg); \
	rm .commit-msg; \
	git add .; \
	git commit -m "$$MSG"; \
	git status
