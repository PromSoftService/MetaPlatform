export function showPrompt(message, defaultValue = '') {
  return window.prompt(message, defaultValue);
}

export function showAlert(message) {
  window.alert(message);
}