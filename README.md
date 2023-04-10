# WebAuthn Dev Mode

This is a simple HTML + javascript application to help developer understand the core webauthn capabilities.

Most of the go code and original structure comes from `https://github.com/go-webauthn/example` with significant
rework to simplify web UI while bringing all the intricacies of the standard to the surface. The go code has been
enhanced
to support additional scenarios identified during the d

## Requirements

The following requirements are needed to build the project:

- go (1.20)

## Steps

The following steps allow you to run the project (tested on Mac):

- Create a copy of `config.example.yaml` to `config.yaml` and update the configuration
- Run `build.sh` to build code, create and run image.
- Setup HTTPS Access.
    - Configure HTTPS proxy to answer requests on your desired domain
    - If SSL needs to be enabled on the server
        - Create SSL CA files, if needed for local setup
        - Generate and sign the key & certs for domain
        - Import the CA to device CA store (keychain on Mac, Windows User Certificate store), if needed
- Visit the domain.

