package middleware

import (
	"github.com/valyala/fasthttp"
	"go.uber.org/zap"

	"github.com/go-webauthn/example/internal/configuration"
)

type RequestCtx struct {
	*fasthttp.RequestCtx

	Log    *zap.Logger
	Config *configuration.Config
}

type Middleware func(next RequestHandler) (handler RequestHandler)

type RequestHandlerMiddleware = func(handler RequestHandler) fasthttp.RequestHandler

type RequestHandler = func(ctx *RequestCtx)
