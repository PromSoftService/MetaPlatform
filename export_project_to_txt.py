#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT_FILE = ROOT / 'metaplatform_project_dump.txt'

PROJECT_FILES = [
  '.gitignore',
  'config/app-config.js',
  'config/platform-config.js',
  'config/project-config.js',
  'config/ui-config.js',
  'config/ipc-config.cjs',
  'config/ipc-config.js',
  'config/ipc-config.json',
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
  'renderer/modules/metagen/tables/finalizeActiveTableEditing.js',
  'renderer/modules/metagen/tables/finalizeEditingOnContextLeave.js',
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
  'renderer/runtime/documentRecordIdentity.js',
  'renderer/runtime/documentSnapshot.js',
  'renderer/runtime/appCloseCoordinator.js',
  'renderer/runtime/fileSystemBridge.js',
  'renderer/runtime/idFactory.js',
  'renderer/runtime/naming.js',
  'renderer/styles/styles.css',
  'renderer/ui/applyStaticText.js',
  'renderer/ui/createProjectTree.js',
  'renderer/ui/projectTree/treeAdapter.js',
  'renderer/ui/createWorkbenchTabs.js',
  'renderer/ui/dialogs.js',
  'renderer/ui/editorContextLifecycle.js',
  'renderer/ui/tabEditLifecycle.js',
  'renderer/ui/workbenchShell.js',
  'tests/appCloseCoordinator.test.js',
  'tests/createProjectTree.test.js',
  'tests/projectManager.save.integration.test.js',
  'tests/finalizeActiveTableEditing.test.js',
  'tests/finalizeEditingOnContextLeave.test.js',
  'tests/metagenSheetSnapshot.test.js',
  'tests/editorContextLifecycle.test.js',
  'tests/projectTreeAdapter.test.js',
  'tests/tabEditLifecycle.test.js',
  'tests/windowCloseGuard.test.js',
  'renderer/core/loggerSinks.js',
  'renderer/runtime/projectPaths.js',
  'tests/logger.test.js',
  'tests/configWiring.integration.test.js',
  'vite.config.js',
  'main/runtime/windowCloseGuard.js',
]


def export_files() -> None:
  lines: list[str] = []
  lines.append('=' * 50)
  lines.append('PROJECT EXPORT')
  lines.append('=' * 50)
  lines.append('')

  for relative_path in PROJECT_FILES:
    file_path = ROOT / relative_path

    lines.append('=' * 50)
    lines.append(f'FILE: {relative_path}')
    lines.append('=' * 50)
    lines.append('')

    if not file_path.exists():
      lines.append('[FILE NOT FOUND]')
      lines.append('')
      continue

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