import { APP_CONFIG } from '../../config/app-config.js';

export function createAppCloseCoordinator({
  confirmSaveIfDirty,
  requestAppQuit,
  approveWindowClose,
  cancelWindowClose
}) {
  async function canCloseApp() {
    const decision = await confirmSaveIfDirty();
    return decision === APP_CONFIG.ui.runtime.closeFlowDecisions.continue;
  }

  async function requestExit() {
    const approved = await canCloseApp();

    if (!approved) {
      return false;
    }

    await requestAppQuit();
    return true;
  }

  async function handleWindowCloseRequested() {
    const approved = await canCloseApp();

    if (!approved) {
      await cancelWindowClose();
      return false;
    }

    await approveWindowClose();
    return true;
  }

  return {
    requestExit,
    handleWindowCloseRequested
  };
}
