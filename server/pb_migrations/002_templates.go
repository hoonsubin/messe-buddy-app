package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		templates := core.NewBaseCollection("templates")
		templates.Fields.Add(
			&core.TextField{Name: "name", Required: true},
			&core.JSONField{Name: "data"}, // Full TemplateExport JSON
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		templates.AddIndex("idx_name", true, "name", "")
		setPublicRules(templates)

		return app.Save(templates)
	}, func(app core.App) error {
		return nil
	})
}
