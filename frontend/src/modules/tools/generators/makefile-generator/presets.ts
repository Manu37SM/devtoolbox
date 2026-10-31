export const PRESETS: Record<string, string> = {
  node: `NPM ?= npm
install: # Install dependencies
    $(NPM) ci
build: install # Build the project
    $(NPM) run build
test: install # Run the test suite
    $(NPM) test
lint: install # Lint the code
    $(NPM) run lint
dev: install # Start the dev server
    $(NPM) run dev
clean: # Remove build output and dependencies
    rm -rf node_modules dist build .next coverage`,
  python: `PYTHON ?= python3
VENV ?= .venv
venv: # Create the virtual environment
    $(PYTHON) -m venv $(VENV)
install: venv # Install dependencies
    $(VENV)/bin/pip install -r requirements.txt
test: install # Run the tests
    $(VENV)/bin/python -m pytest
lint: install # Lint with ruff
    $(VENV)/bin/python -m ruff check .
run: install # Run the app
    $(VENV)/bin/python -m app
clean: # Remove the virtualenv and caches
    rm -rf $(VENV) .pytest_cache .ruff_cache __pycache__`,
  go: `BINARY ?= app
build: # Compile the binary
    go build -o bin/$(BINARY) ./...
test: # Run the tests with the race detector
    go test -race -count=1 ./...
vet: # Run go vet
    go vet ./...
fmt: # Format the code
    gofmt -s -w .
run: build # Build and run
    ./bin/$(BINARY)
clean: # Remove build output
    rm -rf bin`,
  maven: `MVN ?= mvn
build: # Compile and package without tests
    $(MVN) -B -DskipTests package
test: # Run unit tests
    $(MVN) -B test
verify: # Run unit and integration tests
    $(MVN) -B verify
run: # Run the Spring Boot app
    $(MVN) spring-boot:run
clean: # Remove target/
    $(MVN) -B clean`,
  docker: `IMAGE ?= myapp
TAG ?= latest
build: # Build the image
    docker build -t $(IMAGE):$(TAG) .
run: build # Run the container on port 8080
    docker run --rm -p 8080:8080 $(IMAGE):$(TAG)
push: build # Push the image
    docker push $(IMAGE):$(TAG)
shell: build # Open a shell in the image
    docker run --rm -it --entrypoint sh $(IMAGE):$(TAG)
up: # Start docker compose
    docker compose up -d
down: # Stop docker compose
    docker compose down`,
  c: `CC ?= cc
CFLAGS ?= -Wall -Wextra -O2
SRC := $(wildcard src/*.c)
OBJ := $(SRC:src/%.c=build/%.o)
all: bin/app # Build everything
bin/app: $(OBJ)
    @mkdir -p bin
    $(CC) $(CFLAGS) -o $@ $^
build/%.o: src/%.c
    @mkdir -p build
    $(CC) $(CFLAGS) -c $< -o $@
clean: # Remove build output
    rm -rf build bin`,
};
