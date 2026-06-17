#!/usr/bin/env python3
"""
wireframe-mcp: A local stdio MCP server that substitutes Wirekitty.

Pipeline:
  1. Agent calls generate_wireframe() with a description + optional HTML
  2. Server writes the wireframe to ./designs/<screen>.html
  3. Server opens it in the default browser for human review
  4. Agent calls approve_wireframe() or reject_wireframe() to gate implementation
  5. Approval marker written to ./designs/approved/<screen>.approved
"""

import json
import subprocess
import sys
import os
import re
import datetime
from pathlib import Path
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("wireframe-mcp")

DESIGNS_DIR = Path(os.environ.get("WIREFRAME_DESIGNS_DIR", "./designs"))
APPROVED_DIR = DESIGNS_DIR / "approved"
DESIGNS_DIR.mkdir(parents=True, exist_ok=True)
APPROVED_DIR.mkdir(parents=True, exist_ok=True)


def _safe_name(name: str) -> str:
    return re.sub(r"[^a-z0-9-]", "-", name.lower().strip()).strip("-")


def _open_browser(path: Path):
    try:
        if sys.platform == "linux":
            subprocess.Popen(["xdg-open", str(path)],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(path)],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif sys.platform == "win32":
            os.startfile(str(path))
    except Exception:
        pass


def _build_html(screen_name: str, description: str, provided_html: str | None) -> str:
    if provided_html and provided_html.strip().lower().startswith("<!doctype"):
        return provided_html

    content = provided_html or ""
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wireframe: {screen_name}</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: system-ui, sans-serif; background: #f5f5f0; color: #1a1a1a; }}

    .wf-banner {{
      position: sticky; top: 0; z-index: 100;
      background: #1a1a2e; color: #ccc;
      padding: 10px 20px; display: flex; align-items: center;
      justify-content: space-between; gap: 16px; font-size: 13px;
      border-bottom: 2px solid #4a4aff;
    }}
    .wf-banner strong {{ color: #fff; font-size: 14px; }}
    .wf-badge {{
      background: #4a4aff; color: #fff; border-radius: 4px;
      padding: 2px 8px; font-size: 11px; font-weight: 700;
      letter-spacing: .05em; text-transform: uppercase;
    }}

    .wf-body {{ padding: 24px; }}
    .wf-meta {{
      background: #fff; border: 1px solid #ddd; border-radius: 6px;
      padding: 16px 20px; margin-bottom: 16px;
    }}
    .wf-meta h1 {{ font-size: 18px; margin-bottom: 6px; }}
    .wf-meta p  {{ font-size: 13px; color: #555; }}

    .wf-note {{
      background: #fff9e6; border-left: 3px solid #f5c400;
      padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #7a6500;
      border-radius: 0 4px 4px 0;
    }}
    .wf-frame {{
      background: #fff; border: 1px dashed #bbb; border-radius: 8px;
      padding: 24px; min-height: 400px;
      font-size: 13px; color: #888; white-space: pre-wrap; line-height: 1.7;
    }}
  </style>
</head>
<body>
  <div class="wf-banner">
    <div><span class="wf-badge">Wireframe Review</span>&nbsp; <strong>{screen_name}</strong></div>
    <div>Generated {ts} — call approve_wireframe() or reject_wireframe() in your agent</div>
  </div>
  <div class="wf-body">
    <div class="wf-meta">
      <h1>{screen_name}</h1>
      <p>{description}</p>
    </div>
    <div class="wf-note">
      &#9888; Wireframe pending review. No implementation code has been written.
      Approve or reject via the agent to continue.
    </div>
    <div class="wf-frame">{content if content else "[ Agent did not provide HTML layout — edit this file directly ]"}</div>
  </div>
</body>
</html>"""


@mcp.tool
def generate_wireframe(
    screen_name: str,
    description: str,
    html_content: str = "",
    open_browser: bool = True,
) -> str:
    """
    Generate an HTML wireframe for a screen or feature. Saves to designs/ and
    opens in the default browser for human review. DO NOT write implementation
    code after calling this — wait for approve_wireframe() to confirm approval.

    Args:
        screen_name:  Short identifier for the screen (e.g. "checkout-flow")
        description:  What this screen does, key interactions, who uses it
        html_content: Optional HTML layout for the wireframe. Can be partial
                      placeholder blocks or a full scaffold. If omitted, a
                      blank annotated template is generated.
        open_browser: Open the file in the browser immediately (default True)
    """
    name = _safe_name(screen_name)
    html = _build_html(screen_name, description, html_content or None)

    path = DESIGNS_DIR / f"{name}.html"
    path.write_text(html, encoding="utf-8")

    # Clear any stale approval/rejection on re-generate
    for ext in [".approved", ".rejected"]:
        stale = (APPROVED_DIR if ext == ".approved" else DESIGNS_DIR) / f"{name}{ext}"
        if stale.exists():
            stale.unlink()

    if open_browser:
        _open_browser(path)

    return json.dumps({
        "status": "awaiting_review",
        "screen": screen_name,
        "file": str(path.resolve()),
        "next_steps": (
            f"Wireframe saved to {path} and opened in browser. "
            f"After human review, call approve_wireframe(screen_name='{screen_name}') "
            f"to proceed, or reject_wireframe(screen_name='{screen_name}', reason='...') to revise."
        ),
        "instruction": "DO NOT write any implementation code until approve_wireframe() is called."
    }, indent=2)


@mcp.tool
def approve_wireframe(screen_name: str, notes: str = "") -> str:
    """
    Approve a wireframe. Writes a marker file to designs/approved/ that acts
    as the implementation gate. The agent may implement the screen only after
    this tool returns successfully.

    Args:
        screen_name: Must match the screen_name used in generate_wireframe()
        notes:       Optional implementation hints or reviewer comments
    """
    name = _safe_name(screen_name)
    src = DESIGNS_DIR / f"{name}.html"

    if not src.exists():
        return json.dumps({
            "status": "error",
            "message": f"No wireframe found for '{screen_name}'. Call generate_wireframe() first."
        })

    marker = APPROVED_DIR / f"{name}.approved"
    marker.write_text(json.dumps({
        "screen": screen_name,
        "approved_at": datetime.datetime.now().isoformat(),
        "wireframe_file": str(src.resolve()),
        "notes": notes
    }, indent=2), encoding="utf-8")

    return json.dumps({
        "status": "approved",
        "screen": screen_name,
        "marker_file": str(marker.resolve()),
        "wireframe_file": str(src.resolve()),
        "notes": notes,
        "instruction": (
            f"Approved. You may now implement '{screen_name}'. "
            f"Use {src} as your layout reference throughout implementation."
        )
    }, indent=2)


@mcp.tool
def reject_wireframe(screen_name: str, reason: str) -> str:
    """
    Reject a wireframe and request revision. Clears any approval.
    The agent must call generate_wireframe() again with a revised layout.

    Args:
        screen_name: Must match the screen_name used in generate_wireframe()
        reason:      Specific feedback on what needs to change
    """
    name = _safe_name(screen_name)

    stale_approval = APPROVED_DIR / f"{name}.approved"
    if stale_approval.exists():
        stale_approval.unlink()

    log = DESIGNS_DIR / f"{name}.rejected"
    log.write_text(json.dumps({
        "screen": screen_name,
        "rejected_at": datetime.datetime.now().isoformat(),
        "reason": reason
    }, indent=2), encoding="utf-8")

    return json.dumps({
        "status": "rejected",
        "screen": screen_name,
        "reason": reason,
        "instruction": (
            f"Wireframe rejected. Call generate_wireframe(screen_name='{screen_name}', ...) "
            f"again with a revised layout that addresses: {reason}"
        )
    }, indent=2)


@mcp.tool
def check_approval(screen_name: str) -> str:
    """
    Check whether a wireframe has been approved. Call this before writing
    any implementation code to confirm the gate has been cleared.

    Args:
        screen_name: The screen to check
    """
    name = _safe_name(screen_name)
    marker = APPROVED_DIR / f"{name}.approved"

    if marker.exists():
        data = json.loads(marker.read_text(encoding="utf-8"))
        return json.dumps({"status": "approved", **data}, indent=2)

    if (DESIGNS_DIR / f"{name}.html").exists():
        return json.dumps({
            "status": "pending",
            "screen": screen_name,
            "instruction": "Wireframe exists but is not yet approved. Do not implement. Wait for human approval."
        }, indent=2)

    return json.dumps({
        "status": "not_found",
        "screen": screen_name,
        "instruction": "No wireframe found. Call generate_wireframe() first."
    }, indent=2)


@mcp.tool
def list_wireframes() -> str:
    """
    List all wireframes and their approval status. Useful for getting an
    overview of the design state before starting multi-screen implementations.
    """
    results = []
    for html_file in sorted(DESIGNS_DIR.glob("*.html")):
        slug = html_file.stem
        approved = (APPROVED_DIR / f"{slug}.approved").exists()
        rejected  = (DESIGNS_DIR / f"{slug}.rejected").exists()
        status = "approved" if approved else ("rejected" if rejected else "pending_review")
        results.append({
            "file": html_file.name,
            "screen": slug,
            "status": status,
            "path": str(html_file.resolve())
        })

    return json.dumps({"count": len(results), "wireframes": results}, indent=2)


if __name__ == "__main__":
    mcp.run()
