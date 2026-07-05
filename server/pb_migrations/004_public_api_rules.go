package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		open := types.Pointer("")
		names := []string{
			"sessions",
			"players",
			"milestones",
			"missions",
			"form_schemas",
			"progress_events",
			"buddy_profiles",
			"library_resources",
			"milestone_resources",
			"templates",
		}
		for _, name := range names {
			collection, err := app.FindCollectionByNameOrId(name)
			if err != nil {
				return err
			}
			collection.ListRule = open
			collection.ViewRule = open
			collection.CreateRule = open
			collection.UpdateRule = open
			collection.DeleteRule = open
			if err := app.Save(collection); err != nil {
				return err
			}
		}
		return nil
	}, func(app core.App) error {
		return nil
	})
}
