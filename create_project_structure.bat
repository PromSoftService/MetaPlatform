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
if not exist "preload.cjs" type nul > "preload.cjs"
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
if not exist "renderer\core\platformCommands.js" type nul > "renderer\core\platformCommands.js"
if not exist "renderer\core\commandBus.js" type nul > "renderer\core\commandBus.js"
if not exist "renderer\core\moduleRegistry.js" type nul > "renderer\core\moduleRegistry.js"
if not exist "renderer\core\projectManager.js" type nul > "renderer\core\projectManager.js"

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
REM Demo project structure
REM ============================================================
if not exist "project-examples\demo-feedmill" mkdir "project-examples\demo-feedmill"
if not exist "project-examples\demo-feedmill\metagen" mkdir "project-examples\demo-feedmill\metagen"
if not exist "project-examples\demo-feedmill\metalab" mkdir "project-examples\demo-feedmill\metalab"
if not exist "project-examples\demo-feedmill\metaview" mkdir "project-examples\demo-feedmill\metaview"
if not exist "project-examples\demo-feedmill\generated" mkdir "project-examples\demo-feedmill\generated"

REM ============================================================
REM Demo YAML files
REM ============================================================

if not exist "project-examples\demo-feedmill\project.yaml" (
  > "project-examples\demo-feedmill\project.yaml" (
    echo kind: metaplatform.project
    echo version: 1
    echo.
    echo project:
    echo   id: demo_feedmill
    echo   name: Demo Feedmill
    echo   description: Demo project for MetaPlatform
    echo.
    echo modules:
    echo   - MetaGen
    echo   - MetaLab
    echo   - MetaView
    echo.
    echo paths:
    echo   metagen: metagen
    echo   metalab: metalab
    echo   metaview: metaview
    echo   generated: generated
  )
)

if not exist "project-examples\demo-feedmill\metagen\pumps.yaml" (
  > "project-examples\demo-feedmill\metagen\pumps.yaml" (
    echo kind: metagen.component
    echo version: 1
    echo.
    echo component:
    echo   id: pumps
    echo   name: Pumps
    echo   type: template
    echo   module: MetaGen
    echo   description: Demo Pumps document
    echo.
    echo params:
    echo   format: header-plus-rows
    echo   header: []
    echo   rows: []
    echo.
    echo data:
    echo   format: table
    echo   columns: []
    echo   rows: []
    echo.
    echo instances:
    echo   format: list
    echo   rows: []
    echo.
    echo code:
    echo   format: template-text
    echo   language: st-template
    echo   text: ^|
    echo     // Demo ST template
    echo.
    echo generation:
    echo   engine: python
    echo   entrypoint: gen_v2.py
    echo   mode: external
    echo   output:
    echo     language: st
    echo     fileName: pumps.st
  )
)

if not exist "project-examples\demo-feedmill\metagen\valves.yaml" (
  > "project-examples\demo-feedmill\metagen\valves.yaml" (
    echo kind: metagen.component
    echo version: 1
    echo.
    echo component:
    echo   id: valves
    echo   name: Valves
    echo   type: template
    echo   module: MetaGen
    echo   description: Demo Valves document
    echo.
    echo params:
    echo   format: header-plus-rows
    echo   header: []
    echo   rows: []
    echo.
    echo data:
    echo   format: table
    echo   columns: []
    echo   rows: []
    echo.
    echo instances:
    echo   format: list
    echo   rows: []
    echo.
    echo code:
    echo   format: template-text
    echo   language: st-template
    echo   text: ^|
    echo     // Demo Valves template
    echo.
    echo generation:
    echo   engine: python
    echo   entrypoint: gen_v2.py
    echo   mode: external
    echo   output:
    echo     language: st
    echo     fileName: valves.st
  )
)

if not exist "project-examples\demo-feedmill\metagen\conveyors.yaml" (
  > "project-examples\demo-feedmill\metagen\conveyors.yaml" (
    echo kind: metagen.component
    echo version: 1
    echo.
    echo component:
    echo   id: conveyors
    echo   name: Conveyors
    echo   type: template
    echo   module: MetaGen
    echo   description: Demo Conveyors document
    echo.
    echo params:
    echo   format: header-plus-rows
    echo   header: []
    echo   rows: []
    echo.
    echo data:
    echo   format: table
    echo   columns: []
    echo   rows: []
    echo.
    echo instances:
    echo   format: list
    echo   rows: []
    echo.
    echo code:
    echo   format: template-text
    echo   language: st-template
    echo   text: ^|
    echo     // Demo Conveyors template
    echo.
    echo generation:
    echo   engine: python
    echo   entrypoint: gen_v2.py
    echo   mode: external
    echo   output:
    echo     language: st
    echo     fileName: conveyors.st
  )
)

if not exist "project-examples\demo-feedmill\metalab\startup_scenario.yaml" (
  > "project-examples\demo-feedmill\metalab\startup_scenario.yaml" (
    echo kind: metalab.scenario
    echo version: 1
  )
)

if not exist "project-examples\demo-feedmill\metaview\main_screen.yaml" (
  > "project-examples\demo-feedmill\metaview\main_screen.yaml" (
    echo kind: metaview.screen
    echo version: 1
  )
)

if not exist "project-examples\demo-feedmill\generated\pumps.st" type nul > "project-examples\demo-feedmill\generated\pumps.st"
if not exist "project-examples\demo-feedmill\generated\valves.st" type nul > "project-examples\demo-feedmill\generated\valves.st"
if not exist "project-examples\demo-feedmill\generated\conveyors.st" type nul > "project-examples\demo-feedmill\generated\conveyors.st"

echo.
echo ============================================================
echo MetaPlatform v1 structure created
echo Existing files preserved
echo ============================================================
echo.
pause
