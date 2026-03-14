export async function finalizeEditingBeforeContextTransition({
  activeEntry,
  logger,
  source,
  reason,
  blockOnFailure = true
}) {
  if (!activeEntry?.runtime) {
    return { continued: true, outcome: 'no-op', reason };
  }

  const runtime = activeEntry.runtime;

  try {
    if (typeof runtime.finalizeEditingBeforeContextLeave === 'function') {
      const result = await runtime.finalizeEditingBeforeContextLeave({ reason, blockOnFailure });
      return {
        continued: result?.continued !== false,
        outcome: result?.outcome || 'no-op',
        reason: result?.reason || reason
      };
    }

    if (typeof runtime.finishActiveTableEditing === 'function') {
      const outcome = await runtime.finishActiveTableEditing();
      return { continued: true, outcome: outcome || 'no-op', reason };
    }

    return { continued: true, outcome: 'no-op', reason };
  } catch (error) {
    logger?.error?.(source, 'Ошибка завершения редактирования перед сменой контекста', {
      tabId: activeEntry.tabId,
      reason,
      message: error?.message || String(error)
    });

    return {
      continued: blockOnFailure ? false : true,
      outcome: 'failed',
      reason
    };
  }
}
