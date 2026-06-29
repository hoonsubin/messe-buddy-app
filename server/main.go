package main

import (
	"crypto/rand"
	"embed"
	"encoding/hex"
	"log"
	"os"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"

	_ "messe-buddy-pb/pb_migrations"
)

//go:embed pb_migrations
var migrationsDir embed.FS

func main() {
	app := pocketbase.New()

	// Register migrations from embedded directory.
	// PB_AUTO_MIGRATE=true (default) runs all migrations on startup.
	// Set PB_AUTO_MIGRATE=false in .env to skip auto-migration.
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Dir:         "pb_migrations",
		Automigrate: os.Getenv("PB_AUTO_MIGRATE") != "false",
	})

	// qrSecret generation hook — fires after each session create.
	// Generates a random 64-char hex string if qrSecret is empty.
	// This is the HMAC secret for QR payload signing (C-16).
	app.OnRecordCreate("sessions").BindFunc(func(e *core.RecordEvent) error {
		if e.Record.GetString("qrSecret") == "" {
			b := make([]byte, 32)
			if _, err := rand.Read(b); err != nil {
				return err
			}
			e.Record.Set("qrSecret", hex.EncodeToString(b))
		}
		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
