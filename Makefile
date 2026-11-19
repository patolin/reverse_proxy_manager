.PHONY: run stop test

run:
	docker compose up --build -d

stop:
	docker compose down

test:
	npm test
