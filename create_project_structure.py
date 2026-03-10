#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IGNORED_DIRS = {".git", "node_modules", "__pycache__", "dist"}
IGNORED_FILES = {"metaplatform_project_dump.txt"}


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


def ensure_project_structure() -> tuple[int, int]:
    created_dirs = 0
    created_files = 0

    for rel_file in get_project_files():
        file_path = ROOT / rel_file

        if not file_path.parent.exists():
            file_path.parent.mkdir(parents=True, exist_ok=True)
            created_dirs += 1

        if not file_path.exists():
            file_path.touch()
            created_files += 1

    return created_dirs, created_files


def main() -> None:
    created_dirs, created_files = ensure_project_structure()
    print(
        "Project structure is ready. "
        f"Created directories: {created_dirs}, created files: {created_files}."
    )


if __name__ == "__main__":
    main()
