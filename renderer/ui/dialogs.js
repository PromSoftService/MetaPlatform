import { APP_CONFIG } from '../../config/app-config.js';

function createElement(tagName, className = '') {
  const node = document.createElement(tagName);

  if (className) {
    node.className = className;
  }

  return node;
}

export function showTextInputDialog({
  title,
  initialValue = '',
  confirmText = APP_CONFIG.ui.text.create,
  cancelText = APP_CONFIG.ui.text.cancel
}) {
  return new Promise((resolve) => {
    const overlay = createElement('div', APP_CONFIG.ui.classNames.dialogOverlay);
    const modal = createElement('div', APP_CONFIG.ui.classNames.dialog);
    const titleNode = createElement('div', APP_CONFIG.ui.classNames.dialogTitle);
    titleNode.textContent = title;

    const input = createElement('input', APP_CONFIG.ui.classNames.dialogInput);
    input.type = 'text';
    input.value = initialValue;

    const actions = createElement('div', APP_CONFIG.ui.classNames.dialogActions);
    const cancelButton = createElement('button', APP_CONFIG.ui.classNames.dialogButton);
    cancelButton.type = 'button';
    cancelButton.textContent = cancelText;

    const confirmButton = createElement('button', `${APP_CONFIG.ui.classNames.dialogButton} ${APP_CONFIG.ui.classNames.dialogPrimaryButton}`);
    confirmButton.type = 'button';
    confirmButton.textContent = confirmText;

    const close = (value) => {
      overlay.remove();
      resolve(value);
    };

    cancelButton.addEventListener('click', () => close(null));
    confirmButton.addEventListener('click', () => {
      const value = input.value.trim();
      close(value || null);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        confirmButton.click();
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        cancelButton.click();
      }
    });

    actions.appendChild(cancelButton);
    actions.appendChild(confirmButton);
    modal.appendChild(titleNode);
    modal.appendChild(input);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    input.focus();
    input.select();
  });
}

export function showSaveChangesDialog({
  title = APP_CONFIG.ui.text.saveChangesTitle,
  saveText = APP_CONFIG.ui.text.save,
  discardText = APP_CONFIG.ui.text.discard,
  cancelText = APP_CONFIG.ui.text.cancel
}) {
  return new Promise((resolve) => {
    const overlay = createElement('div', APP_CONFIG.ui.classNames.dialogOverlay);
    const modal = createElement('div', APP_CONFIG.ui.classNames.dialog);
    const titleNode = createElement('div', APP_CONFIG.ui.classNames.dialogTitle);
    titleNode.textContent = title;

    const actions = createElement('div', APP_CONFIG.ui.classNames.dialogActions);
    const cancelButton = createElement('button', APP_CONFIG.ui.classNames.dialogButton);
    cancelButton.type = 'button';
    cancelButton.textContent = cancelText;

    const discardButton = createElement('button', APP_CONFIG.ui.classNames.dialogButton);
    discardButton.type = 'button';
    discardButton.textContent = discardText;

    const saveButton = createElement('button', `${APP_CONFIG.ui.classNames.dialogButton} ${APP_CONFIG.ui.classNames.dialogPrimaryButton}`);
    saveButton.type = 'button';
    saveButton.textContent = saveText;

    const close = (value) => {
      overlay.remove();
      resolve(value);
    };

    cancelButton.addEventListener('click', () => close(APP_CONFIG.ui.runtime.dialogResults.cancel));
    discardButton.addEventListener('click', () => close(APP_CONFIG.ui.runtime.dialogResults.discard));
    saveButton.addEventListener('click', () => close(APP_CONFIG.ui.runtime.dialogResults.save));

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        close(APP_CONFIG.ui.runtime.dialogResults.cancel);
      }
    });

    actions.appendChild(cancelButton);
    actions.appendChild(discardButton);
    actions.appendChild(saveButton);
    modal.appendChild(titleNode);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    saveButton.focus();
  });
}
