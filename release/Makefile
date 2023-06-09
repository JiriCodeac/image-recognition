#!/usr/bin/env bash
root_project = ..
build = build
release = release
appname = forester

BG =\n\033[0;36m-- # Beginning
NC =\033[0m\n# No Color

DOCKER_REPO ?= 520207147319.dkr.ecr.eu-central-1.amazonaws.com/forester

$(shell git config --global --add safe.directory '*')

version := $(shell git describe --tags --match="v*")

.PHONY: all
all: app

.PHONY: npm
npm:
	@(printf "${BG}Installing NPM dependencies${NC}")
	    cd $(root_project) && npm install --ci --no-audit

.PHONY: pip
pip:
	@(printf "${BG}Installing PIP dependencies${NC}")
		#pip3 install -U pip setuptools
		#cd $(root_project) && pip3 install -r requirements.txt --target=requirements

.PHONY: app
app: pip npm
	@(printf "${BG}Preparing build directory${NC}")
		mkdir -p $(build)

	@(printf "${BG}Preparing build directory${NC}")
		mkdir -p $(build)/app $(build)/node_modules $(build)/requirements

	@(printf "${BG}Generating version file${NC}")
		echo "VERSION=$(version)" >$(build)/version.txt
		echo "BUILD_DATE=$(shell date --utc +%FT%TZ)" >>$(build)/version.txt

	@(printf "${BG}Copying app to build directory${NC}")
		cp -r $(root_project)/app/* $(build)/app/
		cp -r $(root_project)/node_modules/* $(build)/node_modules/
		#cp -r $(root_project)/requirements/* $(build)/requirements/
		cp $(root_project)/local.ts $(build)/
		cp $(root_project)/tsconfig.json $(build)/

.PHONY: package
package: app
	@(printf "${BG}Package version $(version) is ready${NC}")
		#echo $(version) >target/latest.version

	# ToDo

.PHONY: qa
qa:
	@(printf "${BG}Prepare log directory${NC}")
		mkdir -p /www/log

	@(printf "${BG}Running tests${NC}")
		cd $(root_project) && export FORCE_COLOR=1 && npm test || true
		#cd $(root_project) && python3 -m unittest tests/**/*.py

.PHONY: release
release:
	@(printf "${BG}Prepare Docker container${NC}")
		echo "" > $(root_project)/release-docker.sh
		chmod +x $(root_project)/release-docker.sh
		echo "CMD [\"node\", \"node_modules/ts-node/dist/bin.js\", \"local.ts\"]" >> ../Dockerfile
		echo "ADD release/$(build) /var/task" >> ../Dockerfile
		echo "WORKDIR /var/task" >> ../Dockerfile
		echo "docker buildx build --push --tag ${DOCKER_REPO}:$(version) --tag ${DOCKER_REPO}:latest ." >> $(root_project)/release-docker.sh
