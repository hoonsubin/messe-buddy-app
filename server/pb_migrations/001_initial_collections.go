package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		// ── sessions ──────────────────────────────────────────────────────────
		sessions := core.NewBaseCollection("sessions")
		sessions.Fields.Add(
			&core.TextField{Name: "name", Required: true},
			&core.TextField{Name: "bgImageUrl"},
			&core.TextField{Name: "gameMakerId", Required: true},
			&core.JSONField{Name: "preBoardingChecks"},
			&core.TextField{Name: "qrSecret"},
		)
		setPublicRules(sessions)
		if err := app.Save(sessions); err != nil {
			return err
		}

		// ── players ───────────────────────────────────────────────────────────
		players := core.NewBaseCollection("players")
		players.Fields.Add(
			&core.TextField{Name: "uid", Required: true},
			&core.TextField{Name: "recoveryKey", Required: true},
			&core.TextField{Name: "sessionId", Required: true},
			&core.BoolField{Name: "tutorialComplete"},
			&core.BoolField{Name: "profileComplete"},
			&core.TextField{Name: "name"},
			&core.TextField{Name: "preferredName"},
			&core.TextField{Name: "pronouns"},
			&core.FileField{Name: "avatarUrl", MaxSize: 5 * 1024 * 1024},
			&core.TextField{Name: "role"},
			&core.TextField{Name: "team"},
			&core.TextField{Name: "startDate"},
			&core.TextField{Name: "location"},
			&core.TextField{Name: "timezone"},
			&core.JSONField{Name: "skillsConfident"},
			&core.JSONField{Name: "skillsDevelop"},
			&core.JSONField{Name: "languages"},
			&core.TextField{Name: "workStyle"},
			&core.JSONField{Name: "energizers"},
			&core.JSONField{Name: "drainers"},
		)
		players.AddIndex("idx_uid", true, "uid", "")
		players.AddIndex("idx_recoveryKey", true, "recoveryKey", "")
		setPublicRules(players)
		if err := app.Save(players); err != nil {
			return err
		}

		// ── milestones ────────────────────────────────────────────────────────
		milestones := core.NewBaseCollection("milestones")
		milestones.Fields.Add(
			&core.TextField{Name: "sessionId", Required: true},
			&core.TextField{Name: "name", Required: true},
			&core.NumberField{Name: "xPercent", Required: true},
			&core.NumberField{Name: "yPercent", Required: true},
			&core.NumberField{Name: "xpThreshold", Required: true},
			&core.NumberField{Name: "order", Required: true},
		)
		setPublicRules(milestones)
		if err := app.Save(milestones); err != nil {
			return err
		}

		// ── missions ──────────────────────────────────────────────────────────
		missions := core.NewBaseCollection("missions")
		missions.Fields.Add(
			&core.TextField{Name: "sessionId", Required: true},
			&core.TextField{Name: "milestoneId", Required: true},
			&core.TextField{Name: "title", Required: true},
			&core.EditorField{Name: "body"},
			&core.TextField{Name: "type", Required: true},
			&core.TextField{Name: "externalUrl"},
			&core.NumberField{Name: "difficulty", Required: true},
			&core.NumberField{Name: "xpValue", Required: true},
			&core.JSONField{Name: "tags"},
			&core.TextField{Name: "suggestedDueDate"},
			&core.NumberField{Name: "order", Required: true},
			&core.BoolField{Name: "isInCurrentMissions"},
			&core.TextField{Name: "validationMethod", Required: true},
		)
		setPublicRules(missions)
		if err := app.Save(missions); err != nil {
			return err
		}

		// ── form_schemas ──────────────────────────────────────────────────────
		// C-13: fields is a JSON-stringified FieldSchema[]. Parsed by parsers.ts.
		formSchemas := core.NewBaseCollection("form_schemas")
		formSchemas.Fields.Add(
			&core.TextField{Name: "missionId", Required: true},
			&core.JSONField{Name: "fields"},
		)
		formSchemas.AddIndex("idx_missionId", true, "missionId", "")
		setPublicRules(formSchemas)
		if err := app.Save(formSchemas); err != nil {
			return err
		}

		// ── progress_events ───────────────────────────────────────────────────
		// C-05: Single write path via upsertProgressEvent.
		// C-13: formResponse is JSON-stringified.
		progressEvents := core.NewBaseCollection("progress_events")
		progressEvents.Fields.Add(
			&core.TextField{Name: "sessionId", Required: true},
			&core.TextField{Name: "playerId", Required: true},
			&core.TextField{Name: "missionId", Required: true},
			&core.TextField{Name: "status", Required: true},
			&core.TextField{Name: "validatedBy"},
			&core.TextField{Name: "validatedAt"},
			&core.JSONField{Name: "formResponse"},
		)
		setPublicRules(progressEvents)
		if err := app.Save(progressEvents); err != nil {
			return err
		}

		// ── buddy_profiles ────────────────────────────────────────────────────
		buddyProfiles := core.NewBaseCollection("buddy_profiles")
		buddyProfiles.Fields.Add(
			&core.TextField{Name: "sessionId", Required: true},
			&core.TextField{Name: "assignedToPlayerId", Required: true},
			&core.TextField{Name: "name", Required: true},
			&core.TextField{Name: "role"},
			&core.TextField{Name: "tenure"},
			&core.FileField{Name: "avatarUrl", MaxSize: 5 * 1024 * 1024},
			&core.TextField{Name: "contactUrl"},
			&core.TextField{Name: "quote"},
			&core.TextField{Name: "email"},
			&core.TextField{Name: "phone"},
		)
		buddyProfiles.AddIndex(
			"idx_assignedToPlayerId", true, "assignedToPlayerId", "",
		)
		setPublicRules(buddyProfiles)
		if err := app.Save(buddyProfiles); err != nil {
			return err
		}

		// ── resources ─────────────────────────────────────────────────────────
		resources := core.NewBaseCollection("resources")
		resources.Fields.Add(
			&core.TextField{Name: "sessionId", Required: true},
			&core.TextField{Name: "title", Required: true},
			&core.TextField{Name: "description"},
			&core.TextField{Name: "type", Required: true},
			&core.URLField{Name: "url", Required: true},
			&core.BoolField{Name: "isVisibleToPlayer"},
		)
		setPublicRules(resources)
		if err := app.Save(resources); err != nil {
			return err
		}

		return nil
	}, func(app core.App) error {
		// Down: nothing to undo (collections are dropped on fresh start)
		return nil
	})
}

// setPublicRules clears all API rules — C-03: no auth system.
// The PWA enforces role-based access at the component level via mb_identity.
func setPublicRules(c *core.Collection) {
	c.ListRule = nil
	c.ViewRule = nil
	c.CreateRule = nil
	c.UpdateRule = nil
	c.DeleteRule = nil
}
