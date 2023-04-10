#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

INIT_DIR=$(pwd)
IMG_NAME="jhash_webauthn"
cd "${SCRIPT_DIR}" || exit 1

echo "Cleaning up..."
rm -rf internal/server/public_html/*
rm Docker/server
echo "Copying html files"
cp -R just_html/* internal/server/public_html/
echo "Building server...."
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o Docker/webauthServer ./cmd/server
cp config.yaml Docker/

echo "Stopping and deleting container & images..."
docker stop "$(docker ps -a -q --filter "ancestor=${IMG_NAME}")"
docker rm "$(docker ps -a -q --filter "ancestor=${IMG_NAME}")"
docker rmi "${IMG_NAME}"
echo "Building new image..."
docker build -t "${IMG_NAME}" Docker
echo "Starting new container..."
docker run -d -p 8080:8080 -h "${IMG_NAME}" --name "${IMG_NAME}" ${IMG_NAME}

cd "${INIT_DIR}" || exit 2