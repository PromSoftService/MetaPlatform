@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ============================================================
echo Creating MetaPlatform v1 project structure
echo Existing files will NOT be overwritten
echo ============================================================
echo.

REM ============================================================
REM Root
REM ============================================================
if not exist "config" mkdir "config"
if not exist "renderer" mkdir "renderer"
if not exist "project-examples" mkdir "project-examples"

if not exist "main.js" type nul > "main.js"
if not exist "preload.js" type nul > "preload.js"
if not exist "package.json" type nul > "package.json"
if not exist "vite.config.js" type nul > "vite.config.js"

REM ============================================================
REM Config
REM ============================================================
if not exist "config\app-config.js" type nul > "config\app-config.js"
if not exist "config\platform-config.js" type nul > "config\platform-config.js"
if not exist "config\project-config.js" type nul > "config\project-config.js"
if not exist "config\ui-config.js" type nul > "config\ui-config.js"

REM ============================================================
REM Renderer root
REM ============================================================
if not exist "renderer\index.html" type nul > "renderer\index.html"
if not exist "renderer\app.js" type nul > "renderer\app.js"

REM ============================================================
REM Core
REM ============================================================
if not exist "renderer\core" mkdir "renderer\core"
if not exist "renderer\core\logger.js" type nul > "renderer\core\logger.js"
if not exist "renderer\core\layout.js" type nul > "renderer\core\layout.js"
if not exist "renderer\core\commandBus.js" type nul > "renderer\core\commandBus.js"
if not exist "renderer\core\moduleRegistry.js" type nul > "renderer\core\moduleRegistry.js"
if not exist "renderer\core\projectManager.js" type nul > "renderer\core\projectManager.js"
if not exist "renderer\core\platformCommands.js" type nul > "renderer\core\platformCommands.js"

REM ============================================================
REM Runtime
REM ============================================================
if not exist "renderer\runtime" mkdir "renderer\runtime"
if not exist "renderer\runtime\naming.js" type nul > "renderer\runtime\naming.js"
if not exist "renderer\runtime\fileSystemBridge.js" type nul > "renderer\runtime\fileSystemBridge.js"
if not exist "renderer\runtime\documentLoader.js" type nul > "renderer\runtime\documentLoader.js"

REM ============================================================
REM UI
REM ============================================================
if not exist "renderer\ui" mkdir "renderer\ui"
if not exist "renderer\ui\applyStaticText.js" type nul > "renderer\ui\applyStaticText.js"
if not exist "renderer\ui\createWorkbenchTabs.js" type nul > "renderer\ui\createWorkbenchTabs.js"
if not exist "renderer\ui\createProjectTree.js" type nul > "renderer\ui\createProjectTree.js"
if not exist "renderer\ui\workbenchShell.js" type nul > "renderer\ui\workbenchShell.js"
if not exist "renderer\ui\dialogs.js" type nul > "renderer\ui\dialogs.js"

REM ============================================================
REM Editors
REM ============================================================
if not exist "renderer\editors" mkdir "renderer\editors"
if not exist "renderer\editors\shared" mkdir "renderer\editors\shared"
if not exist "renderer\editors\metagen" mkdir "renderer\editors\metagen"
if not exist "renderer\editors\metalab" mkdir "renderer\editors\metalab"
if not exist "renderer\editors\metaview" mkdir "renderer\editors\metaview"

if not exist "renderer\editors\shared\editorHost.js" type nul > "renderer\editors\shared\editorHost.js"
if not exist "renderer\editors\metagen\createMetaGenEditor.js" type nul > "renderer\editors\metagen\createMetaGenEditor.js"
if not exist "renderer\editors\metalab\createMetaLabEditor.js" type nul > "renderer\editors\metalab\createMetaLabEditor.js"
if not exist "renderer\editors\metaview\createMetaViewEditor.js" type nul > "renderer\editors\metaview\createMetaViewEditor.js"

REM ============================================================
REM Modules
REM ============================================================
if not exist "renderer\modules" mkdir "renderer\modules"

REM ----- MetaGen
if not exist "renderer\modules\metagen" mkdir "renderer\modules\metagen"
if not exist "renderer\modules\metagen\tables" mkdir "renderer\modules\metagen\tables"

if not exist "renderer\modules\metagen\metagenConfig.js" type nul > "renderer\modules\metagen\metagenConfig.js"
if not exist "renderer\modules\metagen\metagenModule.js" type nul > "renderer\modules\metagen\metagenModule.js"
if not exist "renderer\modules\metagen\metagenDocumentFactory.js" type nul > "renderer\modules\metagen\metagenDocumentFactory.js"
if not exist "renderer\modules\metagen\metagenCommands.js" type nul > "renderer\modules\metagen\metagenCommands.js"
if not exist "renderer\modules\metagen\metagenGeneratorBridge.js" type nul > "renderer\modules\metagen\metagenGeneratorBridge.js"
if not exist "renderer\modules\metagen\metagenSchema.js" type nul > "renderer\modules\metagen\metagenSchema.js"
if not exist "renderer\modules\metagen\tables\createMetaGenParamsSheet.js" type nul > "renderer\modules\metagen\tables\createMetaGenParamsSheet.js"
if not exist "renderer\modules\metagen\tables\createMetaGenDataSheet.js" type nul > "renderer\modules\metagen\tables\createMetaGenDataSheet.js"
if not exist "renderer\modules\metagen\tables\metaGenParamsTableAutoStyle.js" type nul > "renderer\modules\metagen\tables\metaGenParamsTableAutoStyle.js"

REM ----- MetaLab
if not exist "renderer\modules\metalab" mkdir "renderer\modules\metalab"
if not exist "renderer\modules\metalab\metalabConfig.js" type nul > "renderer\modules\metalab\metalabConfig.js"
if not exist "renderer\modules\metalab\metalabModule.js" type nul > "renderer\modules\metalab\metalabModule.js"
if not exist "renderer\modules\metalab\metalabDocumentFactory.js" type nul > "renderer\modules\metalab\metalabDocumentFactory.js"
if not exist "renderer\modules\metalab\metalabCommands.js" type nul > "renderer\modules\metalab\metalabCommands.js"

REM ----- MetaView
if not exist "renderer\modules\metaview" mkdir "renderer\modules\metaview"
if not exist "renderer\modules\metaview\metaviewConfig.js" type nul > "renderer\modules\metaview\metaviewConfig.js"
if not exist "renderer\modules\metaview\metaviewModule.js" type nul > "renderer\modules\metaview\metaviewModule.js"
if not exist "renderer\modules\metaview\metaviewDocumentFactory.js" type nul > "renderer\modules\metaview\metaviewDocumentFactory.js"
if not exist "renderer\modules\metaview\metaviewCommands.js" type nul > "renderer\modules\metaview\metaviewCommands.js"

REM ============================================================
REM Styles
REM ============================================================
if not exist "renderer\styles" mkdir "renderer\styles"
if not exist "renderer\styles\styles.css" type nul > "renderer\styles\styles.css"

REM ============================================================
REM Demo project
REM ============================================================
if not exist "project-examples\demo-feedmill" mkdir "project-examples\demo-feedmill"
if not exist "project-examples\demo-feedmill\metagen" mkdir "project-examples\demo-feedmill\metagen"
if not exist "project-examples\demo-feedmill\metalab" mkdir "project-examples\demo-feedmill\metalab"
if not exist "project-examples\demo-feedmill\metaview" mkdir "project-examples\demo-feedmill\metaview"
if not exist "project-examples\demo-feedmill\generated" mkdir "project-examples\demo-feedmill\generated"

REM ============================================================
REM Demo YAML files (create only if missing)
REM Using PowerShell because YAML is unreliable through plain ECHO
REM ============================================================

if not exist "project-examples\demo-feedmill\project.yaml" powershell -NoProfile -Command ^
  "$p='project-examples\demo-feedmill\project.yaml';" ^
  "$content=@'
kind: metaplatform.project
version: 1

project:
  id: demo_feedmill
  name: Demo Feedmill
  description: Demo project for MetaPlatform

modules:
  - MetaGen
  - MetaLab
  - MetaView

paths:
  metagen: metagen
  metalab: metalab
  metaview: metaview
  generated: generated
'@;" ^
  "Set-Content -Path $p -Value $content -Encoding UTF8"

if not exist "project-examples\demo-feedmill\metagen\pumps.yaml" powershell -NoProfile -Command ^
  "$p='project-examples\demo-feedmill\metagen\pumps.yaml';" ^
  "$content=@'
kind: metagen.component
version: 1

component:
  id: pumps
  name: Pumps
  type: template
  module: MetaGen
  description: Demo Pumps document

params:
  format: header-plus-rows
  header: []
  rows: []

data:
  format: table
  columns: []
  rows: []

instances:
  format: list
  rows: []

code:
  format: template-text
  language: st-template
  text: // Demo ST template

generation:
  engine: python
  entrypoint: gen_v2.py
  mode: external
  output:
    language: st
    fileName: pumps.st
'@;" ^
  "Set-Content -Path $p -Value $content -Encoding UTF8"

if not exist "project-examples\demo-feedmill\metagen\valves.yaml" powershell -NoProfile -Command ^
  "$p='project-examples\demo-feedmill\metagen\valves.yaml';" ^
  "$content=@'
kind: metagen.component
version: 1

component:
  id: valves
  name: Valves
  type: template
  module: MetaGen
  description: Demo Valves document

params:
  format: header-plus-rows
  header: []
  rows: []

data:
  format: table
  columns: []
  rows: []

instances:
  format: list
  rows: []

code:
  format: template-text
  language: st-template
  text: // Demo Valves template

generation:
  engine: python
  entrypoint: gen_v2.py
  mode: external
  output:
    language: st
    fileName: valves.st
'@;" ^
  "Set-Content -Path $p -Value $content -Encoding UTF8"

if not exist "project-examples\demo-feedmill\metagen\conveyors.yaml" powershell -NoProfile -Command ^
  "$p='project-examples\demo-feedmill\metagen\conveyors.yaml';" ^
  "$content=@'
kind: metagen.component
version: 1

component:
  id: conveyors
  name: Conveyors
  type: template
  module: MetaGen
  description: Demo Conveyors document

params:
  format: header-plus-rows
  header: []
  rows: []

data:
  format: table
  columns: []
  rows: []

instances:
  format: list
  rows: []

code:
  format: template-text
  language: st-template
  text: // Demo Conveyors template

generation:
  engine: python
  entrypoint: gen_v2.py
  mode: external
  output:
    language: st
    fileName: conveyors.st
'@;" ^
  "Set-Content -Path $p -Value $content -Encoding UTF8"

if not exist "project-examples\demo-feedmill\metalab\startup_scenario.yaml" powershell -NoProfile -Command ^
  "$p='project-examples\demo-feedmill\metalab\startup_scenario.yaml';" ^
  "$content=@'
kind: metalab.scenario
version: 1
'@;" ^
  "Set-Content -Path $p -Value $content -Encoding UTF8"

if not exist "project-examples\demo-feedmill\metaview\main_screen.yaml" powershell -NoProfile -Command ^
  "$p='project-examples\demo-feedmill\metaview\main_screen.yaml';" ^
  "$content=@'
kind: metaview.screen
version: 1
'@;" ^
  "Set-Content -Path $p -Value $content -Encoding UTF8"

echo.
echo ============================================================
echo MetaPlatform v1 structure created
echo Existing files preserved
echo ============================================================
echo.
pause