package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// PocketBase Required on NumberField rejects 0 (zero-default). Milestone order
// uses 0 for the first chapter — mirror missions fix in 006_add_autodate_fields.
func init() {
	m.Register(func(app core.App) error {
		milestones, err := app.FindCollectionByNameOrId("milestones")
		if err != nil {
			return err
		}
		if f := milestones.Fields.GetByName("order"); f != nil {
			if nf, ok := f.(*core.NumberField); ok {
				nf.Required = false
			}
		}
		return app.Save(milestones)
	}, func(app core.App) error {
		return nil
	})
}
