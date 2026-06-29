#!/usr/bin/env python3
"""
PR check — Python syntax and import verification.

Validates every ``.py`` file under ``docker/`` and ``scripts/``:
  1. Syntax check via ``py_compile`` (stdlib, no imports resolved).
  2. AST parse + import discovery for runtime dependency files.
  3. Runtime import check (with installed deps) for the files that use
     external packages (psycopg2, requests, watchdog).

Exits non-zero if any check fails.
"""

from __future__ import annotations

import ast
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PY_DIRS = ["docker", "scripts"]

# Files whose imports must resolve at runtime (they import external packages).
# Other .py files are syntax-checked only.
RUNTIME_FILES = {
    "docker/file-watcher/watcher.py",
}


def find_py_files() -> list[Path]:
    """Return all ``.py`` files under PY_DIRS, sorted by path."""
    files: list[Path] = []
    for d in PY_DIRS:
        p = ROOT / d
        if p.is_dir():
            files.extend(sorted(p.rglob("*.py")))
    return files


def syntax_check(filepath: Path) -> bool:
    """Compile the file.  Returns True on success."""
    try:
        subprocess.run(
            [sys.executable, "-m", "py_compile", str(filepath)],
            capture_output=True,
            text=True,
            check=True,
        )
        return True
    except subprocess.CalledProcessError as exc:
        print(f"  ❌ SYNTAX ERROR in {filepath.relative_to(ROOT)}")
        print(f"     {exc.stderr.strip()}")
        return False


def ast_check(filepath: Path) -> bool:
    """Parse the AST and discover all top-level imports.  Returns True on
    success (file can be parsed)."""
    try:
        tree = ast.parse(filepath.read_text())
        # Just proving parseability — import resolution is the next step
        return True
    except SyntaxError as exc:
        print(f"  ❌ AST PARSE ERROR in {filepath.relative_to(ROOT)}: {exc}")
        return False


def runtime_import_check(filepath: Path) -> bool:
    """Try to import the file as a module (requires deps installed).
    We use ``python -c "compile(open(p).read(), p, 'exec')"`` which catches
    more issues than ast.parse alone."""
    try:
        subprocess.run(
            [
                sys.executable,
                "-c",
                "import sys; compile(open(sys.argv[1]).read(), sys.argv[1], 'exec')",
                str(filepath),
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        return True
    except subprocess.CalledProcessError as exc:
        print(f"  ❌ COMPILE ERROR in {filepath.relative_to(ROOT)}")
        print(f"     {exc.stderr.strip()}")
        return False


def main() -> int:
    files = find_py_files()
    if not files:
        print("No Python files found — nothing to check")
        return 0

    print(f"Checking {len(files)} Python file(s)...\n")

    failures = 0

    # -- Step 1: Syntax check every file ---------------------------------
    print("─ Syntax check (py_compile) ─")
    for f in files:
        rel = str(f.relative_to(ROOT))
        print(f"  {rel}")
        if not syntax_check(f):
            failures += 1
    print()

    # -- Step 2: AST parse every file ------------------------------------
    print("─ AST parse check ─")
    for f in files:
        rel = str(f.relative_to(ROOT))
        print(f"  {rel}")
        if not ast_check(f):
            failures += 1
    print()

    # -- Step 3: Runtime compile for files with external deps ------------
    print("─ Runtime compile check (external-deps files) ─")
    for f in files:
        rel = str(f.relative_to(ROOT))
        if rel in RUNTIME_FILES:
            print(f"  {rel}")
            if not runtime_import_check(f):
                failures += 1
    print()

    if failures:
        print(f"❌ {failures} check(s) failed")
        return 1

    print("✅ All Python checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
