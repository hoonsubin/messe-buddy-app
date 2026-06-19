package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		sessions, err := app.FindCollectionByNameOrId("sessions")
		if err != nil {
			return err
		}
		sessions.Fields.RemoveByName("bgImageUrl")
		sessions.Fields.Add(
			&core.FileField{Name: "bgImageUrl", MaxSize: 10 * 1024 * 1024},
			&core.NumberField{Name: "mapNodeScale"},
		)
		if err := app.Save(sessions); err != nil {
			return err
		}

		progressEvents, err := app.FindCollectionByNameOrId("progress_events")
		if err != nil {
			return err
		}
		progressEvents.AddIndex(
			"idx_player_mission", true, "playerId, missionId", "",
		)
		return app.Save(progressEvents)
	}, func(app core.App) error {
		return nil
	})
}
