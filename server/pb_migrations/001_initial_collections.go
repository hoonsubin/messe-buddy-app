package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		// ── sessions ──────────────────────────────────────────────────────────
		sessions := core.NewBaseCollection("sessions")
		sessions.Fields.Add(
			&core.TextField{Name: "name", Required: true},
			&core.FileField{Name: "bgImageUrl", MaxSize: 10 * 1024 * 1024},
			&core.NumberField{Name: "mapNodeScale"},
			&core.TextField{Name: "gameMakerId", Required: true},
			&core.TextField{Name: "gmRecoveryKey", Required: true},
			&core.JSONField{Name: "preBoardingChecks"},
			&core.TextField{Name: "qrSecret"},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		sessions.AddIndex("idx_gmRecoveryKey", true, "gmRecoveryKey", "")
		setPublicRules(sessions)
		if err := app.Save(sessions); err != nil {
			return err
		}

		// ── players (onboarding identities — no GM rows) ──────────────────────
		players := core.NewBaseCollection("players")
		players.Fields.Add(
			&core.TextField{Name: "uid"},
			&core.TextField{Name: "recoveryKey"},
			&core.TextField{Name: "inviteToken", Required: true},
			&core.TextField{Name: "sessionId", Required: true},
			&core.TextField{Name: "claimStatus", Required: true},
			&core.BoolField{Name: "tutorialComplete"},
			&core.BoolField{Name: "profileComplete"},
			&core.TextField{Name: "name"},
			&core.TextField{Name: "preferredName"},
			&core.TextField{Name: "pronouns"},
			&core.FileField{Name: "avatarUrl", MaxSize: 5 * 1024 * 1024},
			&core.TextField{Name: "jobTitle"},
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
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		players.AddIndex("idx_uid", true, "uid", "")
		players.AddIndex("idx_recoveryKey", true, "recoveryKey", "")
		players.AddIndex("idx_inviteToken", true, "inviteToken", "")
		setPublicRules(players)
		if err := app.Save(players); err != nil {
			return err
		}

		// ── milestones ────────────────────────────────────────────────────────
		milestones := core.NewBaseCollection("milestones")
		milestones.Fields.Add(
			&core.TextField{Name: "sessionId", Required: true},
			&core.TextField{Name: "playerId", Required: true},
			&core.TextField{Name: "name", Required: true},
			&core.NumberField{Name: "xPercent", Required: true},
			&core.NumberField{Name: "yPercent", Required: true},
			&core.NumberField{Name: "xpThreshold", Required: true},
			&core.NumberField{Name: "order", Required: true},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		milestones.AddIndex("idx_milestones_playerId", false, "playerId", "")
		setPublicRules(milestones)
		if err := app.Save(milestones); err != nil {
			return err
		}

		// ── missions ──────────────────────────────────────────────────────────
		missions := core.NewBaseCollection("missions")
		missions.Fields.Add(
			&core.TextField{Name: "sessionId", Required: true},
			&core.TextField{Name: "playerId", Required: true},
			&core.TextField{Name: "milestoneId", Required: true},
			&core.TextField{Name: "title", Required: true},
			&core.EditorField{Name: "body"},
			&core.TextField{Name: "type", Required: true},
			&core.TextField{Name: "externalUrl"},
			&core.NumberField{Name: "xpValue", Required: true},
			&core.JSONField{Name: "tags"},
			&core.TextField{Name: "suggestedDueDate"},
			&core.NumberField{Name: "order", Required: true},
			&core.BoolField{Name: "isInCurrentMissions"},
			&core.TextField{Name: "validationMethod", Required: true},
			&core.NumberField{Name: "peerScanTarget"},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		missions.AddIndex("idx_missions_playerId", false, "playerId", "")
		setPublicRules(missions)
		if err := app.Save(missions); err != nil {
			return err
		}

		// ── form_schemas ──────────────────────────────────────────────────────
		formSchemas := core.NewBaseCollection("form_schemas")
		formSchemas.Fields.Add(
			&core.TextField{Name: "missionId", Required: true},
			&core.JSONField{Name: "fields"},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		formSchemas.AddIndex("idx_missionId", true, "missionId", "")
		setPublicRules(formSchemas)
		if err := app.Save(formSchemas); err != nil {
			return err
		}

		// ── progress_events ───────────────────────────────────────────────────
		progressEvents := core.NewBaseCollection("progress_events")
		progressEvents.Fields.Add(
			&core.TextField{Name: "sessionId", Required: true},
			&core.TextField{Name: "playerId", Required: true},
			&core.TextField{Name: "missionId", Required: true},
			&core.TextField{Name: "status", Required: true},
			&core.TextField{Name: "validatedBy"},
			&core.TextField{Name: "validatedAt"},
			&core.JSONField{Name: "formResponse"},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		progressEvents.AddIndex(
			"idx_player_mission", true, "playerId, missionId", "",
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
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		buddyProfiles.AddIndex(
			"idx_assignedToPlayerId", true, "assignedToPlayerId", "",
		)
		setPublicRules(buddyProfiles)
		if err := app.Save(buddyProfiles); err != nil {
			return err
		}

		// ── library_resources (company-wide catalog) ────────────────────────
		libraryResources := core.NewBaseCollection("library_resources")
		libraryResources.Fields.Add(
			&core.TextField{Name: "resourceKey", Required: true},
			&core.TextField{Name: "title", Required: true},
			&core.TextField{Name: "description"},
			&core.TextField{Name: "type", Required: true},
			&core.URLField{Name: "url", Required: true},
			&core.TextField{Name: "tags"},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		libraryResources.AddIndex("idx_resourceKey", true, "resourceKey", "")
		setPublicRules(libraryResources)
		if err := app.Save(libraryResources); err != nil {
			return err
		}

		// ── milestone_resources (per-player milestone attachments) ────────────
		milestoneResources := core.NewBaseCollection("milestone_resources")
		milestoneResources.Fields.Add(
			&core.TextField{Name: "sessionId", Required: true},
			&core.TextField{Name: "playerId", Required: true},
			&core.TextField{Name: "milestoneId", Required: true},
			&core.TextField{Name: "libraryResourceId", Required: true},
			&core.BoolField{Name: "isVisibleToPlayer"},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		milestoneResources.AddIndex("idx_milestoneId", false, "milestoneId", "")
		setPublicRules(milestoneResources)
		if err := app.Save(milestoneResources); err != nil {
			return err
		}

		return nil
	}, func(app core.App) error {
		return nil
	})
}

// setPublicRules opens all API rules — C-03: no auth system.
func setPublicRules(c *core.Collection) {
	open := types.Pointer("")
	c.ListRule = open
	c.ViewRule = open
	c.CreateRule = open
	c.UpdateRule = open
	c.DeleteRule = open
}
