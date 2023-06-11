package handler

import (
	"bytes"

	"github.com/go-webauthn/example/internal/middleware"
	"github.com/go-webauthn/example/internal/model"
	"github.com/go-webauthn/webauthn/protocol"
)

func ParseCredentialCreationResponse(ctx *middleware.RequestCtx) {
	parsedResponse, err := protocol.ParseCredentialCreationResponseBody(bytes.NewReader(ctx.PostBody()))
	if err != nil {
		ctx.Log.Error("failed to parse credential creation response body", model.ProtoErrToFields(err)...)
		ctx.BadRequestJSON(model.NewErrorJSON().WithError(err).WithInfo("Bad Request."))
		return
	}
	ctx.OKJSON(parsedResponse)
}

func ParseCredentialRequestResponse(ctx *middleware.RequestCtx) {
	parsedResponse, err := protocol.ParseCredentialRequestResponseBody(bytes.NewReader(ctx.PostBody()))
	if err != nil {
		ctx.Log.Error("failed to parse credential request response body", model.ProtoErrToFields(err)...)
		ctx.BadRequestJSON(model.NewErrorJSON().WithError(err).WithInfo("Bad Request."))
		return
	}
	ctx.OKJSON(parsedResponse)
}
