// Native modal dialog supplies focus trapping and Escape. All content is text, never HTML.
export function tuningDialog({ title, message, choices, value }) {
  return new Promise(resolve => {
    const previous = document.activeElement;
    const dialog = document.createElement('dialog'); dialog.className = 'tuning-dialog';
    const heading = document.createElement('h2'); heading.id = 'tuning-dialog-title'; heading.textContent = title;
    dialog.setAttribute('aria-labelledby', heading.id);
    const description = document.createElement('p'); description.textContent = message;
    dialog.append(heading, description);
    let input;
    if (value !== undefined) {
      const label = document.createElement('label'); label.textContent = 'Collection name';
      input = document.createElement('input'); input.value = value; input.maxLength = 80; input.required = true;
      label.append(input); dialog.append(label);
    }
    const actions = document.createElement('div'); actions.className = 'dialog-actions';
    let result = { action: 'cancel' };
    for (const [action, text] of choices) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
      button.dataset.choice = action;
      button.addEventListener('click', () => {
        if (action !== 'cancel' && input && !input.value.trim()) { input.setCustomValidity('Enter a collection name.'); input.reportValidity(); return; }
        result = { action, value: input?.value.trim() }; dialog.close();
      }); actions.append(button);
    }
    input?.addEventListener('input', () => input.setCustomValidity(''));
    dialog.append(actions);
    dialog.addEventListener('close', () => { dialog.remove(); if (previous?.isConnected) previous.focus(); resolve(result); }, { once: true });
    document.body.append(dialog); dialog.showModal();
    (input || actions.querySelector('[data-choice="cancel"]') || actions.firstElementChild).focus();
  });
}
