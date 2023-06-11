package middleware

import (
	"encoding/json"
	"fmt"
	"github.com/go-webauthn/example/internal/model"
	"github.com/google/uuid"
	"github.com/valyala/fasthttp"
	"go.uber.org/zap"

	"github.com/go-webauthn/example/internal/configuration"
)

func NewRequestHandlerCtxMiddleware(config *configuration.Config) (bridge RequestHandlerMiddleware) {
	return func(next RequestHandler) (handler fasthttp.RequestHandler) {
		return func(requestCtx *fasthttp.RequestCtx) {
			ctx := NewRequestCtx(requestCtx, config)

			next(ctx)
		}
	}
}

func NewRequestCtx(requestCtx *fasthttp.RequestCtx, config *configuration.Config) (ctx *RequestCtx) {
	ctx = new(RequestCtx)

	ctx.RequestCtx = requestCtx
	ctx.Config = config

	requestUUID, err := uuid.NewUUID()
	if err == nil {
		//ctx.Log = zap.L().With(zap.String("request_uuid", requestUUID.String()), zap.String("remote_ip", requestCtx.RemoteIP().String()))
		ctx.Log = zap.L().WithOptions(zap.Fields(zap.String("request_uuid", requestUUID.String()), zap.String("remote_ip", ctx.RemoteIP().String()), zap.ByteString("path", ctx.Path()), zap.ByteString("method", ctx.Method())))
	} else {
		ctx.Log = zap.L()
	}

	return ctx
}

func (ctx *RequestCtx) CreateKO(message interface{}) (ko model.MessageResponse) {
	ko = model.MessageResponse{
		Status: "KO",
	}

	switch m := message.(type) {
	case *model.ErrorJSON:
		ko.Message = m.Info()
	case error:
		ko.Message = m.Error()
	case string:
		ko.Message = m
	}

	return ko
}

func (ctx *RequestCtx) OKJSON(data interface{}) {
	response := model.DataResponse{
		Status: "OK",
		Data:   data,
	}

	responseJSON, err := json.Marshal(response)
	if err != nil {
		ctx.Log.Error("failed to marshal JSON 200 OK response", zap.Error(err))

		return
	}

	ctx.SetStatusCode(fasthttp.StatusOK)
	ctx.SetBody(responseJSON)
}

func (ctx *RequestCtx) ErrorJSON(err error, status int) {
	response := ctx.CreateKO(err)

	responseJSON, err := json.Marshal(response)
	if err != nil {
		ctx.Log.Error(fmt.Sprintf("failed to marshal JSON %d %s response", status, fasthttp.StatusMessage(status)), zap.Error(err))

		return
	}

	ctx.SetStatusCode(status)
	ctx.SetBody(responseJSON)
}

func (ctx *RequestCtx) BadRequestJSON(err error) {
	ctx.ErrorJSON(err, fasthttp.StatusBadRequest)
}
