import {
  finalizeActiveTableEditing,
  TABLE_EDIT_FINALIZE_RESULT
} from './finalizeActiveTableEditing.js';

export const TABLE_CONTEXT_FINALIZE_FLOW = {
  CONTINUED: 'continued',
  BLOCKED: 'blocked'
};

function pickOutcome(results) {
  if (results.includes(TABLE_EDIT_FINALIZE_RESULT.FAILED)) {
    return TABLE_EDIT_FINALIZE_RESULT.FAILED;
  }

  if (results.includes(TABLE_EDIT_FINALIZE_RESULT.COMMITTED)) {
    return TABLE_EDIT_FINALIZE_RESULT.COMMITTED;
  }

  if (results.includes(TABLE_EDIT_FINALIZE_RESULT.CANCELLED)) {
    return TABLE_EDIT_FINALIZE_RESULT.CANCELLED;
  }

  return TABLE_EDIT_FINALIZE_RESULT.NO_OP;
}

export async function finalizeEditingOnContextLeave({
  tables = [],
  logger,
  source,
  reason = 'context-leave',
  blockOnFailure = true
}) {
  if (!Array.isArray(tables) || tables.length === 0) {
    return {
      flow: TABLE_CONTEXT_FINALIZE_FLOW.CONTINUED,
      outcome: TABLE_EDIT_FINALIZE_RESULT.NO_OP,
      reason
    };
  }

  const results = await Promise.all(
    tables.map(({ tableRuntime, contextId }) => finalizeActiveTableEditing({
      tableRuntime,
      logger,
      source: contextId ? `${source}.${contextId}` : source
    }))
  );

  const outcome = pickOutcome(results);

  if (outcome === TABLE_EDIT_FINALIZE_RESULT.FAILED) {
    logger?.error?.(source, 'Не удалось завершить редактирование при потере контекста', {
      reason,
      results
    });

    return {
      flow: blockOnFailure ? TABLE_CONTEXT_FINALIZE_FLOW.BLOCKED : TABLE_CONTEXT_FINALIZE_FLOW.CONTINUED,
      outcome,
      reason
    };
  }

  return {
    flow: TABLE_CONTEXT_FINALIZE_FLOW.CONTINUED,
    outcome,
    reason
  };
}
