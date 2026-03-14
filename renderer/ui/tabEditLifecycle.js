import { finalizeEditingBeforeContextTransition } from './editorContextLifecycle.js';

export async function finalizeEditingBeforeTabSwitch({ activeEntry, nextTabId, logger }) {
  if (!activeEntry || activeEntry.tabId === nextTabId) {
    return true;
  }

  const result = await finalizeEditingBeforeContextTransition({
    activeEntry,
    logger,
    source: 'tabs',
    reason: 'tab-switch',
    blockOnFailure: true
  });

  if (!result.continued) {
    return false;
  }

  return true;
}
