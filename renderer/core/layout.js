import Split from 'split.js';

function getSplitSharedOptions() {
  return {
    elementStyle: (dimension, size, gutterSize) => ({
      'flex-basis': `calc(${size}% - ${gutterSize}px)`
    }),
    gutterStyle: (dimension, gutterSize) => ({
      'flex-basis': `${gutterSize}px`
    })
  };
}

export function initWorkbenchLayout() {
  const horizontalSplit = Split(['#project-tree-column', '#document-column'], {
    direction: 'horizontal',
    sizes: [18, 82],
    minSize: [240, 420],
    gutterSize: 4,
    cursor: 'col-resize',
    ...getSplitSharedOptions()
  });

  const verticalSplit = Split(['#editor-host-container', '#bottom-panel'], {
    direction: 'vertical',
    sizes: [74, 26],
    minSize: [250, 150],
    gutterSize: 4,
    cursor: 'row-resize',
    ...getSplitSharedOptions()
  });

  return {
    dispose() {
      horizontalSplit?.destroy?.();
      verticalSplit?.destroy?.();
    }
  };
}
