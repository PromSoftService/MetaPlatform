#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent

PROJECT_FILES = [
  '.gitignore',
  'config/app-config.js',
  'config/platform-config.js',
  'config/project-config.js',
  'config/ui-config.js',
  'create_project_structure.py',
  'export_project_to_txt.py',
  'main.js',
  'package.json',
  'preload.cjs',
  'project-examples/demo-feedmill/metagen/conveyors.yaml',
  'project-examples/demo-feedmill/metagen/pumps.yaml',
  'project-examples/demo-feedmill/metagen/новый_компонент.yaml',
  'project-examples/demo-feedmill/metalab/startup_scenario.yaml',
  'project-examples/demo-feedmill/metaview/main_screen.yaml',
  'project-examples/demo-feedmill/project.yaml',
  'renderer/app.js',
  'renderer/core/commandBus.js',
  'renderer/core/layout.js',
  'renderer/core/logger.js',
  'renderer/core/moduleRegistry.js',
  'renderer/core/platformCommands.js',
  'renderer/core/projectManager.js',
  'renderer/editors/metagen/createMetaGenEditor.js',
  'renderer/editors/metalab/createMetaLabEditor.js',
  'renderer/editors/metaview/createMetaViewEditor.js',
  'renderer/editors/shared/editorHost.js',
  'renderer/index.html',
  'renderer/modules/metagen/metagenCommands.js',
  'renderer/modules/metagen/metagenConfig.js',
  'renderer/modules/metagen/metagenDocumentFactory.js',
  'renderer/modules/metagen/metagenGeneratorBridge.js',
  'renderer/modules/metagen/metagenModule.js',
  'renderer/modules/metagen/metagenSchema.js',
  'renderer/modules/metagen/tables/createMetaGenDataSheet.js',
  'renderer/modules/metagen/tables/createMetaGenParamsSheet.js',
  'renderer/modules/metagen/tables/createMetaGenSimpleSheet.js',
  'renderer/modules/metagen/tables/metaGenParamsTableAutoStyle.js',
  'renderer/modules/metagen/tables/sheetSnapshot.js',
  'renderer/modules/metalab/metalabCommands.js',
  'renderer/modules/metalab/metalabConfig.js',
  'renderer/modules/metalab/metalabDocumentFactory.js',
  'renderer/modules/metalab/metalabModule.js',
  'renderer/modules/metaview/metaviewCommands.js',
  'renderer/modules/metaview/metaviewConfig.js',
  'renderer/modules/metaview/metaviewDocumentFactory.js',
  'renderer/modules/metaview/metaviewModule.js',
  'renderer/runtime/documentLoader.js',
  'renderer/runtime/fileSystemBridge.js',
  'renderer/runtime/idFactory.js',
  'renderer/runtime/naming.js',
  'renderer/styles/styles.css',
  'renderer/ui/applyStaticText.js',
  'renderer/ui/createProjectTree.js',
  'renderer/ui/createWorkbenchTabs.js',
  'renderer/ui/dialogs.js',
  'renderer/ui/workbenchShell.js',
  'tests/projectManager.save.integration.test.js',
  'vite.config.js',
]


def ensure_project_structure() -> tuple[int, int]:
  created_dirs = 0
  created_files = 0
  created_dir_paths: set[Path] = set()

  for relative_path in PROJECT_FILES:
    file_path = ROOT / relative_path
    parent_dir = file_path.parent

    if not parent_dir.exists():
      parent_dir.mkdir(parents=True, exist_ok=True)

    if parent_dir != ROOT and parent_dir not in created_dir_paths:
      created_dirs += 1
      created_dir_paths.add(parent_dir)

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