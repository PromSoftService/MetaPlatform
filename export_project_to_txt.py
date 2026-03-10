#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT_FILE = ROOT / "metaplatform_project_dump.txt"
IGNORED_DIRS = {".git", "node_modules", "__pycache__", "dist"}
IGNORED_FILES = {OUTPUT_FILE.name}


def _is_ignored(path: Path) -> bool:
    parts = set(path.parts)
    return bool(parts & IGNORED_DIRS) or path.name in IGNORED_FILES


def get_project_files() -> list[Path]:
    """Return project files according to current repository structure."""
    try:
        result = subprocess.run(
            ["git", "ls-files"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        files = [Path(line.strip()) for line in result.stdout.splitlines() if line.strip()]
    except Exception:
        files = [
            p.relative_to(ROOT)
            for p in ROOT.rglob("*")
            if p.is_file() and not _is_ignored(p.relative_to(ROOT))
        ]

    return sorted({p for p in files if not _is_ignored(p)})


def export_files() -> None:
    lines: list[str] = []

    for rel_file in get_project_files():
        file_path = ROOT / rel_file
        if not file_path.exists():
            continue

        lines.append("=" * 80)
        lines.append(f"FILE: {rel_file}")
        lines.append("=" * 80)
        lines.append("")

        try:
            lines.append(file_path.read_text(encoding="utf-8"))
        except UnicodeDecodeError:
            lines.append(file_path.read_text(encoding="utf-8", errors="replace"))

        lines.append("")

    OUTPUT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"Export finished: {OUTPUT_FILE}")


if __name__ == "__main__":
    export_files()
