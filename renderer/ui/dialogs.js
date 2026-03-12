function createElement(tagName, className = '') {
  const node = document.createElement(tagName);

  if (className) {
    node.className = className;
  }

  return node;
}

export function showTextInputDialog({ title, initialValue = '', confirmText = 'Создать', cancelText = 'Отмена' }) {
  return new Promise((resolve) => {
    const overlay = createElement('div', 'meta-dialog-overlay');
    const modal = createElement('div', 'meta-dialog');
    const titleNode = createElement('div', 'meta-dialog-title');
    titleNode.textContent = title;

    const input = createElement('input', 'meta-dialog-input');
    input.type = 'text';
    input.value = initialValue;

    const actions = createElement('div', 'meta-dialog-actions');
    const cancelButton = createElement('button', 'meta-dialog-button');
    cancelButton.type = 'button';
    cancelButton.textContent = cancelText;

    const confirmButton = createElement('button', 'meta-dialog-button meta-dialog-button-primary');
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
  title = 'Сохранить изменения в текущем проекте?',
  saveText = 'Сохранить',
  discardText = 'Не сохранять',
  cancelText = 'Отмена'
}) {
  return new Promise((resolve) => {
    const overlay = createElement('div', 'meta-dialog-overlay');
    const modal = createElement('div', 'meta-dialog');
    const titleNode = createElement('div', 'meta-dialog-title');
    titleNode.textContent = title;

    const actions = createElement('div', 'meta-dialog-actions');
    const cancelButton = createElement('button', 'meta-dialog-button');
    cancelButton.type = 'button';
    cancelButton.textContent = cancelText;

    const discardButton = createElement('button', 'meta-dialog-button');
    discardButton.type = 'button';
    discardButton.textContent = discardText;

    const saveButton = createElement('button', 'meta-dialog-button meta-dialog-button-primary');
    saveButton.type = 'button';
    saveButton.textContent = saveText;

    const close = (value) => {
      overlay.remove();
      resolve(value);
    };

    cancelButton.addEventListener('click', () => close('cancel'));
    discardButton.addEventListener('click', () => close('discard'));
    saveButton.addEventListener('click', () => close('save'));

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        close('cancel');
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
