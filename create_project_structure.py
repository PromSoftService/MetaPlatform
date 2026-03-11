#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
IGNORED_DIRS = {'.git', 'node_modules', '__pycache__', 'dist', '.idea', '.vscode'}
IGNORED_FILES = {'metaplatform_project_dump.txt', 'codex.patch'}


def _is_ignored(path: Path) -> bool:
  return any(part in IGNORED_DIRS for part in path.parts) or path.name in IGNORED_FILES


def get_project_files() -> list[Path]:
  """Return tracked + untracked project files from current repository state."""
  try:
    result = subprocess.run(
      ['git', 'ls-files', '--cached', '--others', '--exclude-standard'],
      cwd=ROOT,
      check=True,
      capture_output=True,
      text=True
    )
    files = [Path(line.strip()) for line in result.stdout.splitlines() if line.strip()]
  except Exception:
    files = [
      p.relative_to(ROOT)
      for p in ROOT.rglob('*')
      if p.is_file() and not _is_ignored(p.relative_to(ROOT))
    ]

  existing_files = [p for p in files if (ROOT / p).exists() and not _is_ignored(p)]
  return sorted(set(existing_files))


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
    'Project structure is ready. '
    f'Created directories: {created_dirs}, created files: {created_files}.'
  )


if __name__ == '__main__':
  main()
