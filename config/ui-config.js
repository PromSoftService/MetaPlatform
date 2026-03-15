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

  panelHeaders: {
    logs: '📋 Логи',
    project: '📁 Проект',
    params: '📊 Параметры',
    data: '📈 Данные',
    code: '📝 Шаблон ST'
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
