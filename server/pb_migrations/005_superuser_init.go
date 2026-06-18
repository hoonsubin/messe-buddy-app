package migrations

import (
	"log"
	"os"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		email := os.Getenv("PB_ADMIN_EMAIL")
		password := os.Getenv("PB_ADMIN_PASSWORD")

		if email == "" || password == "" {
			log.Println(
				"[migration 005] skipping superuser creation:" +
					" PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD not set",
			)
			return nil
		}

		superusers, err := app.FindCollectionByNameOrId(
			core.CollectionNameSuperusers,
		)
		if err != nil {
			return err
		}

		existing, err := app.FindAuthRecordByEmail(
			core.CollectionNameSuperusers, email,
		)
		if err == nil && existing != nil {
			log.Printf(
				"[migration 005] superuser %q already exists, skipping",
				email,
			)
			return nil
		}

		record := core.NewRecord(superusers)
		record.Set("email", email)
		record.Set("password", password)

		if err := app.Save(record); err != nil {
			return err
		}

		log.Printf("[migration 005] superuser created: %s", email)
		return nil
	}, func(app core.App) error {
		email := os.Getenv("PB_ADMIN_EMAIL")
		if email == "" {
			return nil
		}

		record, err := app.FindAuthRecordByEmail(
			core.CollectionNameSuperusers, email,
		)
		if err != nil || record == nil {
			return nil // already deleted or never created
		}

		log.Printf("[migration 005] removing superuser: %s", email)
		return app.Delete(record)
	})
}
