# wireframe-mcp

A local `stdio` MCP server that substitutes Wirekitty in your agentic web development pipeline.
Zero external dependencies, no API keys, fully self-hosted, GitOps-friendly.

## How it fits the pipeline

```
Cline receives feature task
        ↓
generate_wireframe()     → HTML saved to ./designs/, opens in browser
        ↓
Human reviews & edits    → edit the HTML file directly if needed
        ↓
approve_wireframe()      → writes ./designs/approved/<screen>.approved
  or reject_wireframe()  → agent revises and re-generates
        ↓
Agent implements         → uses wireframe file as layout reference
        ↓
Playwright smoke tests
```

## Tools

| Tool | Description |
|---|---|
| `generate_wireframe` | Generate HTML wireframe, open browser, block implementation |
| `approve_wireframe` | Write approval marker — agent may now implement |
| `reject_wireframe` | Log rejection with reason — agent must revise |
| `check_approval` | Verify approval status before coding |
| `list_wireframes` | Overview of all wireframes and their state |

## Setup

```bash
# with uv (recommended)
uv venv && uv pip install -e .

# or pip
pip install -e .
```

## Cline / Claude Code MCP config

```json
"wireframe": {
  "command": "uv",
  "args": [
    "--directory", "/absolute/path/to/wireframe-mcp",
    "run", "python", "wireframe_mcp/server.py"
  ],
  "env": {
    "WIREFRAME_DESIGNS_DIR": "./designs"
  },
  "type": "stdio"
}
```

**Plain venv alternative:**
```json
"wireframe": {
  "command": "/path/to/wireframe-mcp/.venv/bin/python",
  "args": ["/path/to/wireframe-mcp/wireframe_mcp/server.py"],
  "env": { "WIREFRAME_DESIGNS_DIR": "./designs" },
  "type": "stdio"
}
```

## .clinerules enforcement

```markdown
## Wireframe-First Rule

Before writing ANY implementation code for a new screen or feature:

1. Call generate_wireframe(screen_name="...", description="...", html_content="...")
   - Provide a full wireframe HTML layout in html_content
   - Use semantic placeholder blocks — no real component code
2. Wait for the user to review the wireframe in their browser
3. Do NOT proceed until check_approval() returns "status": "approved"
4. Reference the approved wireframe path when writing components

Never skip this workflow. Never implement a screen without an approved wireframe.
```

## Environment

| Variable | Default | Description |
|---|---|---|
| `WIREFRAME_DESIGNS_DIR` | `./designs` | Where wireframes and markers are stored |

## designs/ layout

```
designs/
├── checkout-flow.html          ← wireframe (edit freely)
├── checkout-flow.rejected      ← rejection log
├── dashboard.html
└── approved/
    ├── checkout-flow.approved  ← gate marker (agent reads this)
    └── dashboard.approved
```

Commit `designs/` to your repo — wireframes travel with the code.
