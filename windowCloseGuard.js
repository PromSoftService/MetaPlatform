export function createWindowCloseGuard() {
  let isWindowCloseApproved = false;
  let isHandlingWindowClose = false;

  function handleCloseAttempt({ isWindowDestroyed = false } = {}) {
    if (isWindowCloseApproved) {
      isWindowCloseApproved = false;
      isHandlingWindowClose = false;
      return {
        allowClose: true,
        preventDefault: false,
        requestRendererConfirmation: false
      };
    }

    if (isWindowDestroyed) {
      return {
        allowClose: false,
        preventDefault: true,
        requestRendererConfirmation: false
      };
    }

    if (isHandlingWindowClose) {
      return {
        allowClose: false,
        preventDefault: true,
        requestRendererConfirmation: false
      };
    }

    isHandlingWindowClose = true;

    return {
      allowClose: false,
      preventDefault: true,
      requestRendererConfirmation: true
    };
  }

  function approveClose() {
    isWindowCloseApproved = true;
    isHandlingWindowClose = false;
  }

  function cancelClose() {
    isHandlingWindowClose = false;
  }

  function reset() {
    isWindowCloseApproved = false;
    isHandlingWindowClose = false;
  }

  return {
    handleCloseAttempt,
    approveClose,
    cancelClose,
    reset
  };
}
