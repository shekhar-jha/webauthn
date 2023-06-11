package server

import (
	"github.com/valyala/fasthttp"
	"net"
	"strings"

	"github.com/go-webauthn/example/internal/configuration"
	"github.com/go-webauthn/example/internal/handler"
	"github.com/go-webauthn/example/internal/middleware"
)

func Run(config *configuration.Config) (err error) {
	efs := handler.NewEmbeddedFS(handler.EmbeddedFSConfig{
		Prefix:     "public_html",
		IndexFiles: []string{"index.html"},
		TemplatedFiles: map[string]handler.TemplatedEmbeddedFSFileConfig{
			"index.html": {
				Data: struct{ ExternalURL string }{config.ExternalURL.String()},
			},
		},
	}, assets)

	if err = efs.Load(); err != nil {
		return err
	}

	r := middleware.NewRouter(config)

	r.GET("/", middleware.CORS(efs.Handler()))
	r.GET("/{filepath:*}", middleware.CORS(efs.Handler()))

	r.OPTIONS("/debug", middleware.CORS(handler.Nil))
	r.GET("/debug", middleware.CORS(handler.DebugGET))

	r.OPTIONS("/api/webauthn/credential/parse", middleware.CORS(handler.Nil))
	r.POST("/api/webauthn/credential/parse", middleware.CORS(handler.ParseCredentialCreationResponse))
	r.OPTIONS("/api/webauthn/assertion/parse", middleware.CORS(handler.Nil))
	r.POST("/api/webauthn/assertion/parse", middleware.CORS(handler.ParseCredentialRequestResponse))

	server := &fasthttp.Server{
		Handler:               r.Handler,
		NoDefaultServerHeader: true,
	}

	if strings.ToLower(config.SSLEnabled) == "yes" {
		return server.ListenAndServeTLS(config.ListenAddress, config.SSLCertFile, config.SSLKeyFile)
	} else {
		listener, err := net.Listen("tcp", config.ListenAddress)
		if err != nil {
			return err
		}
		return server.Serve(listener)
	}
}
