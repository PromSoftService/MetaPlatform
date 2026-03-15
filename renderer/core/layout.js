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
  const horizontalSplit = Split([`#${APP_CONFIG.ui.dom.projectTreeColumnId}`, `#${APP_CONFIG.ui.dom.workbenchRightColumnId}`], {
    ...APP_CONFIG.ui.layout.split.horizontal,
    ...getSplitSharedOptions()
  });

  const verticalSplit = Split([`#${APP_CONFIG.ui.dom.editorHostContainerId}`, `#${APP_CONFIG.ui.dom.bottomPanelId}`], {
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
