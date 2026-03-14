export const TABLE_EDIT_FINALIZE_RESULT = {
  COMMITTED: 'committed',
  CANCELLED: 'cancelled',
  NO_OP: 'no-op',
  FAILED: 'failed'
};

export async function finalizeActiveTableEditing({ tableRuntime, logger, source }) {
  if (!tableRuntime || typeof tableRuntime.isCellEditing !== 'function') {
    return TABLE_EDIT_FINALIZE_RESULT.NO_OP;
  }

  if (!tableRuntime.isCellEditing()) {
    return TABLE_EDIT_FINALIZE_RESULT.NO_OP;
  }

  if (typeof tableRuntime.endEditingAsync === 'function') {
    try {
      const committed = await tableRuntime.endEditingAsync(true);

      if (committed) {
        return TABLE_EDIT_FINALIZE_RESULT.COMMITTED;
      }

      if (typeof tableRuntime.abortEditingAsync === 'function') {
        const cancelled = await tableRuntime.abortEditingAsync();
        return cancelled ? TABLE_EDIT_FINALIZE_RESULT.CANCELLED : TABLE_EDIT_FINALIZE_RESULT.FAILED;
      }

      return TABLE_EDIT_FINALIZE_RESULT.FAILED;
    } catch (error) {
      logger?.error?.(source, 'Ошибка завершения редактирования ячейки', {
        message: error?.message || String(error)
      });

      if (typeof tableRuntime.abortEditingAsync === 'function') {
        try {
          const cancelled = await tableRuntime.abortEditingAsync();
          return cancelled ? TABLE_EDIT_FINALIZE_RESULT.CANCELLED : TABLE_EDIT_FINALIZE_RESULT.FAILED;
        } catch (abortError) {
          logger?.error?.(source, 'Ошибка отмены редактирования ячейки после неудачного commit', {
            message: abortError?.message || String(abortError)
          });
        }
      }

      return TABLE_EDIT_FINALIZE_RESULT.FAILED;
    }
  }

  return TABLE_EDIT_FINALIZE_RESULT.FAILED;
}
