export function showIntentDialog(
  element: HTMLElement,
  sourceAttr: string | null
): Promise<string | null> {
  return new Promise((resolve) => {
    let dialogEl = document.getElementById("__pointr_dialog__");
    if (dialogEl) dialogEl.remove();

    dialogEl = document.createElement("div");
    dialogEl.id = "__pointr_dialog__";
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

    const title = sourceAttr
      ? sourceAttr.split(":")[0]?.split("/").pop() ??
        element.tagName.toLowerCase()
      : element.tagName.toLowerCase();

    const headerEl = document.createElement("div");
    headerEl.style.cssText =
      "font-weight: 600; margin-bottom: 8px; font-size: 14px; color: #e2e8f0;";
    headerEl.textContent = `Target: ${title}`;

    const subEl = document.createElement("div");
    subEl.style.cssText =
      "font-size: 12px; color: #94a3b8; margin-bottom: 12px; word-break: break-all;";
    subEl.textContent = sourceAttr || "No source metadata";

    const input = document.createElement("input");
    input.id = "__pointr_intent_input__";
    input.type = "text";
    input.placeholder = "What do you want to change?";
    input.style.cssText =
      "width: 100%; box-sizing: border-box; padding: 8px; border-radius: 4px; border: 1px solid #475569; background: #1e293b; color: white; margin-bottom: 12px; outline: none;";

    const btnRow = document.createElement("div");
    btnRow.style.cssText =
      "display: flex; justify-content: flex-end; gap: 8px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.id = "__pointr_cancel__";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText =
      "padding: 6px 12px; background: transparent; border: 1px solid #475569; color: #cbd5e1; border-radius: 4px; cursor: pointer;";

    const submitBtn = document.createElement("button");
    submitBtn.id = "__pointr_submit__";
    submitBtn.textContent = "Send";
    submitBtn.style.cssText =
      "padding: 6px 12px; background: #3b82f6; border: none; color: white; border-radius: 4px; cursor: pointer;";

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(submitBtn);

    dialogEl.appendChild(headerEl);
    dialogEl.appendChild(subEl);
    dialogEl.appendChild(input);
    dialogEl.appendChild(btnRow);

    document.body.appendChild(dialogEl);

    // Position near the element
    const rect = element.getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.bottom + 10;

    if (x + 320 > window.innerWidth) x = window.innerWidth - 340;
    if (y + 150 > window.innerHeight) y = rect.top - 160;

    dialogEl.style.left = `${Math.max(10, x)}px`;
    dialogEl.style.top = `${Math.max(10, y)}px`;

    const cleanup = () => {
      dialogEl?.remove();
      document.removeEventListener("keydown", handleKey);
    };

    const submit = () => {
      resolve(input.value);
      cleanup();
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        resolve(null);
        cleanup();
      } else if (e.key === "Enter") {
        submit();
      }
    };

    document.addEventListener("keydown", handleKey);
    cancelBtn.addEventListener("click", () => {
      resolve(null);
      cleanup();
    });
    submitBtn.addEventListener("click", submit);

    input.focus();
  });
}
