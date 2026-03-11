#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT_FILE = ROOT / 'metaplatform_project_dump.txt'
IGNORED_DIRS = {'.git', 'node_modules', '__pycache__', 'dist', '.idea', '.vscode'}
IGNORED_FILES = {OUTPUT_FILE.name, 'codex.patch'}


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


def export_files() -> None:
  lines: list[str] = []
  lines.append('=' * 50)
  lines.append('PROJECT EXPORT')
  lines.append('=' * 50)
  lines.append('')

  for rel_file in get_project_files():
    file_path = ROOT / rel_file

    lines.append('=' * 50)
    lines.append(f'FILE: {rel_file.as_posix()}')
    lines.append('=' * 50)
    lines.append('')

    try:
      content = file_path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
      content = file_path.read_text(encoding='utf-8', errors='replace')

    lines.append(content)
    lines.append('')

  OUTPUT_FILE.write_text('\n'.join(lines), encoding='utf-8')
  print(f'Export finished: {OUTPUT_FILE}')


if __name__ == '__main__':
  export_files()
