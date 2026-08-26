export function showIntentDialog(element: HTMLElement, sourceAttr: string | null): Promise<string | null> {
  return new Promise((resolve) => {
    let dialogEl = document.getElementById('__pointr_dialog__');
    if (dialogEl) dialogEl.remove();

    dialogEl = document.createElement('div');
    dialogEl.id = '__pointr_dialog__';
    dialogEl.style.cssText = `
      position: fixed;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
      width: 320px;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3);
      z-index: 999999;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      pointer-events: auto;
    `;

    const title = sourceAttr ? (sourceAttr.split(':')[0]?.split('/').pop() ?? element.tagName.toLowerCase()) : element.tagName.toLowerCase();
    
    dialogEl.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px; color: #e2e8f0;">
        Target: ${title}
      </div>
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px; word-break: break-all;">
        ${sourceAttr || 'No source metadata'}
      </div>
      <input 
        id="__pointr_intent_input__" 
        type="text" 
        placeholder="What do you want to change?" 
        style="width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid #475569; background: #1e293b; color: white; margin-bottom: 12px; outline: none;"
      />
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button id="__pointr_cancel__" style="padding: 6px 12px; background: transparent; border: 1px solid #475569; color: #cbd5e1; border-radius: 4px; cursor: pointer;">Cancel</button>
        <button id="__pointr_submit__" style="padding: 6px 12px; background: #3b82f6; border: none; color: white; border-radius: 4px; cursor: pointer;">Send</button>
      </div>
    `;

    document.body.appendChild(dialogEl);

    // Position near the element
    const rect = element.getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.bottom + 10;
    
    if (x + 320 > window.innerWidth) x = window.innerWidth - 340;
    if (y + 150 > window.innerHeight) y = rect.top - 160;

    dialogEl.style.left = `${Math.max(10, x)}px`;
    dialogEl.style.top = `${Math.max(10, y)}px`;

    const input = document.getElementById('__pointr_intent_input__') as HTMLInputElement;
    const cancelBtn = document.getElementById('__pointr_cancel__')!;
    const submitBtn = document.getElementById('__pointr_submit__')!;

    const cleanup = () => {
      dialogEl?.remove();
      document.removeEventListener('keydown', handleKey);
    };

    const submit = () => {
      resolve(input.value);
      cleanup();
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resolve(null);
        cleanup();
      } else if (e.key === 'Enter') {
        submit();
      }
    };

    document.addEventListener('keydown', handleKey);
    cancelBtn.addEventListener('click', () => {
      resolve(null);
      cleanup();
    });
    submitBtn.addEventListener('click', submit);

    input.focus();
  });
}
