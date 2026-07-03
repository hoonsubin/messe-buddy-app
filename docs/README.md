# Architecture Diagrams

PlantUML sources for MesseBuddy. Render via [PlantUML](https://www.plantuml.com/plantuml) or IDE plugin.

| File | Description |
|------|-------------|
| [`c4context.puml`](c4context.puml) | C4 system context |
| [`c4container.puml`](c4container.puml) | C4 containers |
| [`c4component.puml`](c4component.puml) | C4 components |
| [`hire-lifecycle.puml`](hire-lifecycle.puml) | GM hire creation → configure → invite → player claim → progress monitoring |
| [`qr-routing.puml`](qr-routing.puml) | Deep-link / QR behavior by scanner identity |
| [`mission-validation-flow.puml`](mission-validation-flow.puml) | Four validation strategies (`gmApprove`, `qr`, `selfApprove`, `peerScan`) |
| [`ts-data-model.puml`](ts-data-model.puml) | Target TypeScript / PocketBase data model |
| [`app-class-component.puml`](app-class-component.puml) | React component class diagram (legacy — align with code incrementally) |

Authoritative product behavior is defined in [`SPECS.md`](../SPECS.md) at the repo root.
