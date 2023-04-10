FROM gcr.io/distroless/static
EXPOSE 8080
USER nobody

COPY webauthServer /webauthServer
COPY config.yaml /config.yaml
COPY domain.* /
ENTRYPOINT [ "/webauthServer" ]
