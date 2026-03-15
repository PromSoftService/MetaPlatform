import { APP_CONFIG } from '../../config/app-config.js';
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
  const horizontalSplit = Split(['#project-tree-column', '#workbench-right-column'], {
    ...APP_CONFIG.ui.layout.split.horizontal,
    ...getSplitSharedOptions()
  });

  const verticalSplit = Split(['#editor-host-container', '#bottom-panel'], {
    ...APP_CONFIG.ui.layout.split.vertical,
    ...getSplitSharedOptions()
  });

  return {
    dispose() {
      horizontalSplit?.destroy?.();
      verticalSplit?.destroy?.();
    }
  };
}
