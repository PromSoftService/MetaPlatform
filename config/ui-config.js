export const UI_CONFIG = {
  dom: {
    titleSelector: 'title',
    topPanelTitleSelector: '#top-panel-title',
    legacyProjectTitlePlaceholderSelector: '#legacy-project-title-placeholder',
    projectPanelTitleSelector: '#project-panel-title',
    logsPanelHeaderSelector: '#bottom-panel-header',
    tabsListId: 'tabs-list',
    editorHostId: 'editor-host',
    logContainerId: 'log-output',
    projectTreeId: 'project-tree'
  },

  classNames: {
    tab: 'workbench-tab',
    tabTitle: 'workbench-tab-title',
    tabClose: 'workbench-tab-close-button',
    tabActive: 'is-active',
    page: 'workbench-page',
    pageActive: 'is-active',
    treeItem: 'tree-item',
    treeModuleBlock: 'tree-module-block',
    treeModuleChildren: 'tree-module-children',
    treeNodeRow: 'tree-node-row',
    treeSectionHeader: 'tree-section-header',
    treeNodeDocumentRow: 'tree-node-document-row',
    treeNodeProjectRow: 'tree-node-project-row',
    treeNodeModuleMetagen: 'tree-node-module-metagen',
    treeNodeModuleMetalab: 'tree-node-module-metalab',
    treeNodeModuleMetaview: 'tree-node-module-metaview',
    treeNodeDocumentMetagen: 'tree-node-document-metagen',
    treeNodeDocumentMetalab: 'tree-node-document-metalab',
    treeNodeDocumentMetaview: 'tree-node-document-metaview',
    treeNodeLabel: 'tree-node-label',
    treeNodeActions: 'tree-node-actions',
    treeNodeActionButton: 'tree-node-action-button',
    treeItemLabel: 'tree-item-label',
    projectNode: 'project-node',
    editorRoot: 'metagen-editor',
    editorGrid: 'metagen-editor-grid',
    editorPanel: 'metagen-editor-panel',
    editorPanelHeader: 'metagen-editor-panel-header',
    editorTextarea: 'metagen-editor-textarea',
    selected: 'is-selected',
    inlineRenameInput: 'workbench-inline-rename-input',
    dialogOverlay: 'meta-dialog-overlay',
    dialog: 'meta-dialog',
    dialogTitle: 'meta-dialog-title',
    dialogInput: 'meta-dialog-input',
    dialogActions: 'meta-dialog-actions',
    dialogButton: 'meta-dialog-button',
    dialogPrimaryButton: 'meta-dialog-button-primary'
  },


  layout: {
    split: {
      horizontal: {
        direction: 'horizontal',
        sizes: [18, 82],
        minSize: [240, 420],
        gutterSize: 4,
        cursor: 'col-resize'
      },
      vertical: {
        direction: 'vertical',
        sizes: [74, 26],
        minSize: [250, 150],
        gutterSize: 4,
        cursor: 'row-resize'
      }
    }
  },

  panelHeaders: {
    logs: '📋 Логи',
    project: '📁 Проект',
    params: '📊 Параметры',
    data: '📈 Данные',
    code: '📝 Шаблон ST'
  },



  tree: {
    labels: {
      root: 'Проект'
    },
    icons: {
      project: '📦',
      metagenModule: '🧩',
      metalabModule: '⚙️',
      metaviewModule: '🖥️',
      metagenDocument: '▸',
      metalabDocument: '◆',
      metaviewDocument: '◉'
    },
    actions: {
      createComponent: {
        title: 'Добавить компонент',
        icon: '+'
      },
      deleteComponent: {
        title: 'Удалить компонент',
        icon: '🗑'
      }
    }
  },

  runtime: {
    transitionReasons: {
      tabClose: 'tab-close',
      collectOpenDocumentRecords: 'collect-open-document-records',
      menuActionPrefix: 'menu-action:'
    },
    dialogResults: {
      save: 'save',
      discard: 'discard',
      cancel: 'cancel'
    },
    loggerSources: {
      tabs: 'tabs',
      menu: 'menu',
      projectTree: 'project-tree',
      windowClose: 'window-close',
      project: 'project',
      platform: 'platform'
    }
  },

  text: {
    untitled: 'Без имени',
    dirtyMarker: '●',
    closeAriaPrefix: 'Закрыть',
    saveChangesTitle: 'Сохранить изменения в текущем проекте?',
    save: 'Сохранить',
    discard: 'Не сохранять',
    cancel: 'Отмена',
    create: 'Создать'
  }
};
