// Phase 1 shell — form mission view. Submit logic wired in Phase 3.
// TODO(Phase 4): wire with real identity and adapter data.
import TopBar from "../components/shared/TopBar.tsx";
import FormShell from "../components/form/FormShell.tsx";
import {
  MOCK_FORM_SCHEMAS,
  MOCK_MISSIONS,
  MOCK_PLAYERS,
} from "../adapters/mock/mockData.ts";

// Phase 1: hard-wire profile setup mission for visual shell preview.
const MISSION = MOCK_MISSIONS[0]!;
const SCHEMA = MOCK_FORM_SCHEMAS[0]!;
// TODO(Phase 4): replace hard-wired player with identity-resolved player
const PLAYER = MOCK_PLAYERS[1]!;

const FormPage = () => (
  <div
    data-testid="form-page"
    data-page="form"
    style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100dvh",
      background: "hsl(var(--color-bg))",
    }}
  >
    <TopBar
      playerName={PLAYER.name}
      totalXP={83}
      role={PLAYER.role}
    />

    <main
      style={{
        flex: 1,
        paddingTop: "var(--topbar-h)",
        display: "flex",
        justifyContent: "center",
        padding:
          "calc(var(--topbar-h) + var(--space-6)) var(--space-4) var(--space-8)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "36rem" }}>
        <FormShell
          missionTitle={MISSION.title}
          fields={SCHEMA.fields}
          values={{}}
          errors={{}}
          isSubmitting={false}
          onFieldChange={() => undefined}
          onSubmit={() => undefined}
        />
      </div>
    </main>
  </div>
);

export default FormPage;
