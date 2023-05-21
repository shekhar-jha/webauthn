
# Required commands
REQUIRED_EXECUTABLES := go docker rm echo mkdir cp touch

# Location of Make file
ROOT_DIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
# Working directory
INITIAL_DIR:=$(shell pwd)
# Build directory for executable
BUILD_DIR:=${ROOT_DIR}/build/exe
EXE_NAME:=webauthServer
EXE_PATH:=${BUILD_DIR}/${EXE_NAME}
# Golang files
GO_FILES:=$(shell find ${ROOT_DIR}/ -type f -name '*.go')
# Build directory for docker image
DOCKER_DIR:=${ROOT_DIR}/build/docker
# Source directory for docker assets
DOCKER_SRC_DIR:=${ROOT_DIR}/Docker
# All files with docker image directory as path
DOCKER_FILES:=$(patsubst ${DOCKER_SRC_DIR}/%,${DOCKER_DIR}/%,$(wildcard ${DOCKER_SRC_DIR}/*))
# Source for static web content
WEB_STATIC:=${ROOT_DIR}/just_html
# Destination for static web content
WEB_STATIC_INTERNAL:=${ROOT_DIR}/internal/server/public_html
# All static web content files with destination directory as path
HTML_FILES:=$(patsubst ${WEB_STATIC}/%,${WEB_STATIC_INTERNAL}/%,$(wildcard ${WEB_STATIC}/*))
# Name of image to create
IMG_NAME="jhash_webauthn"
# Identifier of containers created from the image
CONTAINER_NAMES:=$(shell docker ps -a -q --filter "ancestor=${IMG_NAME}")
# Image id of existing image
EXISTING_IMAGE_ID:=$(shell docker images -q "${IMG_NAME}")

.DEFAULT_GOAL:=local


.PHONY: clean
clean: docker-cleanup
	@rm -rf ${ROOT_DIR}/build

.PHONY: pre-req
pre-req: check_executables
	@echo "*** Starting build...."
	@echo "*** Root directory: ${ROOT_DIR}"
	@echo "*** Initial working directory: ${INITIAL_DIR}"

${BUILD_DIR}:
	@mkdir -p "${BUILD_DIR}"

${DOCKER_DIR}:
	@mkdir -p "${DOCKER_DIR}"

.PHONY: build
build: ${EXE_PATH}
	@echo "*** Done build"

${WEB_STATIC_INTERNAL}/%: ${WEB_STATIC}/%
	cp $< $@

${DOCKER_DIR}/%.yaml: ${ROOT_DIR}/%.yaml
	cp $< $@

${DOCKER_DIR}/%: ${DOCKER_SRC_DIR}/%
	cp $< $@

${DOCKER_DIR}/${EXE_NAME}: ${EXE_PATH}
	cp $< $@

.ONESHELL:
.SHELLFLAGS = -e
${EXE_PATH}: ${BUILD_DIR} ${ROOT_DIR}/cmd ${ROOT_DIR}/internal ${GO_FILES} ${HTML_FILES}
	@echo "*** Building server...."
	@CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o "${EXE_PATH}" "${ROOT_DIR}"/cmd/server

.PHONY: package
package: ${ROOT_DIR}/build/package

${ROOT_DIR}/build/package: ${DOCKER_DIR} ${DOCKER_DIR}/${EXE_NAME} ${DOCKER_DIR}/config.yaml ${DOCKER_FILES}
ifneq ($?, "")
ifneq ("${CONTAINER_NAMES}","")
	@echo "*** Stopping and deleting container & image for ${IMG_NAME}..."
	@docker stop ${CONTAINER_NAMES}
	@docker rm ${CONTAINER_NAMES}
endif
endif
ifneq ("${EXISTING_IMAGE_ID}", "")
	@echo "*** Deleting image"
	@docker rmi "${IMG_NAME}"
	@echo "*** Deleted image"
endif
	@echo "*** Building new image"
	docker build -t "${IMG_NAME}" "${DOCKER_DIR}"
	@touch ${ROOT_DIR}/build/package

${ROOT_DIR}/build/run_docker: ${ROOT_DIR}/build/package
	@echo $?
ifneq ($?, "")
	@echo "Starting new container..."
	@docker run -d -p 8080:8080 -h "${IMG_NAME}" --name "${IMG_NAME}" ${IMG_NAME}
else
	@echo "Nothing to do since no update"
endif
	@touch ${ROOT_DIR}/build/run_docker

.PHONY: docker-cleanup
docker-cleanup:
ifeq ("${CONTAINER_NAMES}","")
	@echo "*** Nothing to do for image ${IMG_NAME}"
else
	@echo "*** Stopping and deleting container & image for ${IMG_NAME}..."
	@docker stop ${CONTAINER_NAMES}
	@docker rm ${CONTAINER_NAMES}
	@docker rmi "${IMG_NAME}"
	@echo "*** Deleted image"
endif

.PHONY: docker-start
docker-start: ${ROOT_DIR}/build/run_docker
	@echo "Starting new container..."
	@docker run -d -p 8080:8080 -h "${IMG_NAME}" --name "${IMG_NAME}" ${IMG_NAME}

# Check if required executables are available
.PHONY: check_executables
check_executables:
	@for exe in $(REQUIRED_EXECUTABLES); do \
  		$$(command -v $$exe &>/dev/null); \
        NOT_EXIST=$$? ; \
		if [ $$NOT_EXIST -eq 1 ]; then \
			echo "Error: '$$exe' executable not found or not executable."; \
			exit 1; \
		fi \
	done

.PHONY: local
local: pre-req ${ROOT_DIR}/build/run_docker
	@echo "*** Completing local build"
