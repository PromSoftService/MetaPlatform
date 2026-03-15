export const PROJECT_CONFIG = {
  defaultProjectRelativePath: 'project-examples/demo-feedmill',
  defaultProjectFileName: 'project.yaml',
  defaultProjectName: 'project',
  allowedProjectFileExtensions: ['.yaml', '.yml'],

  moduleIds: {
    metagen: 'metagen',
    metalab: 'metalab',
    metaview: 'metaview',
    temporary: 'temporary'
  },

  folders: {
    metagen: 'metagen',
    metalab: 'metalab',
    metaview: 'metaview',
    generated: 'generated'
  },

  fileExtensions: {
    yaml: ['.yaml', '.yml'],
    default: '.yaml'
  },

  unsavedDocumentPathPrefix: 'unsaved://',
  temporaryDocumentPathPrefix: 'temporary://',

  tree: {
    nodeTypes: {
      project: 'project',
      module: 'module',
      document: 'document'
    },
    actionIds: {
      createComponent: 'create-component',
      deleteComponent: 'delete-component'
    }
  },

  projectKinds: {
    root: 'metaplatform.project'
  }
};
