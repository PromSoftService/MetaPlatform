export async function finalizeEditingBeforeTabSwitch({ activeEntry, nextTabId, logger }) {
  if (!activeEntry || activeEntry.tabId === nextTabId) {
    return true;
  }

  if (typeof activeEntry.runtime?.finishActiveTableEditing !== 'function') {
    return true;
  }

  try {
    await activeEntry.runtime.finishActiveTableEditing();
    return true;
  } catch (error) {
    logger?.error?.('tabs', 'Ошибка завершения редактирования перед переключением вкладки', {
      fromTabId: activeEntry.tabId,
      toTabId: nextTabId,
      message: error?.message || String(error)
    });

    return false;
  }
}
