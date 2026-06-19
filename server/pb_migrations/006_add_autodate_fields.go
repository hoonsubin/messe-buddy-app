package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// Adds AutodateField (created + updated) to all collections.
// PocketBase v0.39+ no longer auto-creates these fields, so any collection
// created before this migration is applied will be missing them, causing
// sort=created or sort=-created to return 400.
func init() {
	collectionNames := []string{
		"sessions",
		"players",
		"milestones",
		"missions",
		"form_schemas",
		"progress_events",
		"buddy_profiles",
		"resources",
		"templates",
	}

	m.Register(func(app core.App) error {
		for _, name := range collectionNames {
			col, err := app.FindCollectionByNameOrId(name)
			if err != nil {
				return err
			}
			if col.Fields.GetByName("created") == nil {
				col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
			}
			if col.Fields.GetByName("updated") == nil {
				col.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
			}
			if err := app.Save(col); err != nil {
				return err
			}
		}
		// Remove Required from missions.xpValue and missions.order so that 0
		// is a valid value (PocketBase Required on NumberField rejects 0).
		missions, err := app.FindCollectionByNameOrId("missions")
		if err != nil {
			return err
		}
		if f := missions.Fields.GetByName("xpValue"); f != nil {
			if nf, ok := f.(*core.NumberField); ok {
				nf.Required = false
			}
		}
		if f := missions.Fields.GetByName("order"); f != nil {
			if nf, ok := f.(*core.NumberField); ok {
				nf.Required = false
			}
		}
		return app.Save(missions)
	}, func(app core.App) error {
		return nil
	})
}
