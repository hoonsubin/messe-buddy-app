package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// Legacy no-op: target schema is created by 001 (ARCH). Kept so migration
// sequence ids remain stable for existing migration logs after greenfield wipe.
func init() {
	m.Register(func(app core.App) error {
		_, err := app.FindCollectionByNameOrId("progress_events")
		return err
	}, func(app core.App) error {
		return nil
	})
}
