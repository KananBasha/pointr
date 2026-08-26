/**
 * Pointr Standalone Chrome Extension - Content Script & Overlay Injector
 * Injected into local development pages (localhost, 127.0.0.1, etc.)
 * Provides runtime element picking, React Fiber/Vue traversal, and MCP dispatch.
 */

(function () {
  // Prevent duplicate injection
  if (window.__POINTR_CHROME_EXTENSION_INJECTED__) return;
  window.__POINTR_CHROME_EXTENSION_INJECTED__ = true;

  // Runtime State
  let isExtensionEnabled = true;
  let isHotkeyActive = false;
  let currentHoveredEl = null;
  let mcpPort = 3333;
  let hotkey = 'Alt';

  // DOM Elements
  let highlightOverlay = null;
  let tooltipEl = null;
  let toastContainer = null;
  let activeModal = null;

  // Initialize settings from chrome.storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get('settings', ({ settings }) => {
      if (settings) {
        isExtensionEnabled = settings.enabled !== false;
        mcpPort = settings.mcpPort || 3333;
        hotkey = settings.hotkey || 'Alt';
      }
    });

    // Listen for setting changes from background / popup
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SETTINGS_CHANGED' && message.settings) {
        isExtensionEnabled = message.settings.enabled !== false;
        mcpPort = message.settings.mcpPort || 3333;
        hotkey = message.settings.hotkey || 'Alt';
        if (!isExtensionEnabled) {
          cleanupHighlight();
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // Framework & Runtime Source Resolvers
  // --------------------------------------------------------------------------

  /**
   * Find React Fiber instance on element
   */
  function findReactFiber(element) {
    if (!element) return null;
    const keys = Object.keys(element);
    const fiberKey = keys.find(
      (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    );
    return fiberKey ? element[fiberKey] : null;
  }

  /**
   * Extract React component name
   */
  function getReactComponentName(fiber) {
    if (!fiber) return '';
    if (typeof fiber.type === 'string') return fiber.type;
    if (typeof fiber.type === 'function') {
      return fiber.type.displayName || fiber.type.name || 'Anonymous';
    }
    if (fiber.type && typeof fiber.type === 'object') {
      if (fiber.type.render) {
        return fiber.type.render.displayName || fiber.type.render.name || 'ForwardRef';
      }
      return fiber.type.displayName || fiber.type.name || 'Component';
    }
    if (fiber.elementType && typeof fiber.elementType.name === 'string') {
      return fiber.elementType.name;
    }
    return '';
  }

  /**
   * Extract React Fiber component tree and source debug metadata
   */
  function resolveReactFiberInfo(element) {
    const fiber = findReactFiber(element);
    if (!fiber) return null;

    const componentTree = [];
    let current = fiber;
    let primarySource = null;
    let depth = 0;

    while (current && depth < 20) {
      // Check _debugSource
      if (current._debugSource && !primarySource) {
        const { fileName, lineNumber, columnNumber } = current._debugSource;
        primarySource = {
          file: cleanSourceFilePath(fileName),
          line: lineNumber || 0,
          column: columnNumber || 0,
        };
      }

      // Check component function/class nodes
      if (current.type && typeof current.type !== 'string') {
        const name = getReactComponentName(current);
        if (name && name !== 'Anonymous' && name !== 'ForwardRef') {
          const file = current._debugSource ? cleanSourceFilePath(current._debugSource.fileName) : '';
          const props = extractSafeProps(current.memoizedProps);
          componentTree.push({
            name,
            file,
            props,
            hooks: [],
          });
        }
      }

      current = current.return;
      depth++;
    }

    return {
      framework: 'React',
      primarySource,
      componentTree: componentTree.reverse(),
      nearestComponent: componentTree[0]?.name || '',
    };
  }

  /**
   * Resolve Vue 3 component metadata
   */
  function resolveVueInfo(element) {
    if (!element) return null;
    const vnode = element.__vnode;
    const vueParent = element.__vueParentComponent;

    if (!vnode && !vueParent) return null;

    const componentTree = [];
    let primarySource = null;
    let current = vueParent || vnode?.component;
    let depth = 0;

    while (current && depth < 15) {
      const type = current.type || {};
      const name = type.__name || type.name || 'VueComponent';
      const file = type.__file ? cleanSourceFilePath(type.__file) : '';

      if (!primarySource && file) {
        primarySource = {
          file,
          line: 1,
          column: 1,
        };
      }

      componentTree.push({
        name,
        file,
        props: extractSafeProps(current.props),
        hooks: [],
      });

      current = current.parent;
      depth++;
    }

    return {
      framework: 'Vue 3',
      primarySource,
      componentTree: componentTree.reverse(),
      nearestComponent: componentTree[0]?.name || 'VueComponent',
    };
  }

  /**
   * Clean up file paths (strip webpack / vite / query strings)
   */
  function cleanSourceFilePath(filePath) {
    if (!filePath) return '';
    let cleaned = filePath;
    // Strip webpack-internal, vite query params (?t=..., ?import)
    cleaned = cleaned.replace(/^webpack-internal:\/\/\//, '');
    cleaned = cleaned.replace(/\?.*$/, '');
    // Strip http://localhost:... /
    cleaned = cleaned.replace(/^https?:\/\/[^/]+\//, '');
    return cleaned;
  }

  /**
   * Safely serialize props
   */
  function extractSafeProps(props) {
    if (!props || typeof props !== 'object') return {};
    const safe = {};
    for (const [k, v] of Object.entries(props)) {
      if (k === 'children' || typeof v === 'function' || k.startsWith('__')) continue;
      try {
        if (typeof v === 'object' && v !== null) {
          safe[k] = Array.isArray(v) ? `Array(${v.length})` : '{...}';
        } else {
          safe[k] = v;
        }
      } catch {
        safe[k] = '[Complex Value]';
      }
    }
    return safe;
  }

  /**
   * Generate clean CSS Selector
   */
  function generateCssSelector(el) {
    if (!(el instanceof Element)) return '';
    if (el.id) return `#${CSS.escape(el.id)}`;

    const parts = [];
    let current = el;

    while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 4) {
      if (current === document.body || current === document.documentElement) break;

      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${CSS.escape(current.id)}`;
        parts.unshift(selector);
        break;
      }

      if (current.classList.length > 0) {
        const validClass = Array.from(current.classList).find(
          (c) => !c.startsWith('pointr-') && !c.startsWith('__pointr')
        );
        if (validClass) {
          selector += `.${CSS.escape(validClass)}`;
        }
      }

      let siblingIndex = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) siblingIndex++;
        sibling = sibling.previousElementSibling;
      }
      if (siblingIndex > 1) {
        selector += `:nth-of-type(${siblingIndex})`;
      }

      parts.unshift(selector);
      current = current.parentElement;
    }

    return parts.join(' > ');
  }

  /**
   * Generate XPath
   */
  function generateXPath(el) {
    if (!(el instanceof Element)) return '';
    if (el.id) return `//*[@id="${el.id}"]`;

    const segments = [];
    let current = el;

    while (current && current.nodeType === Node.ELEMENT_NODE && segments.length < 5) {
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }

      const tagName = current.tagName.toLowerCase();
      const segment = index > 1 ? `${tagName}[${index}]` : tagName;
      segments.unshift(segment);
      current = current.parentElement;
    }

    return `/${segments.join('/')}`;
  }

  /**
   * Extract computed styles
   */
  function readComputedStyles(el) {
    try {
      const computed = window.getComputedStyle(el);
      const props = [
        'display',
        'position',
        'flexDirection',
        'justifyContent',
        'alignItems',
        'padding',
        'margin',
        'width',
        'height',
        'fontSize',
        'fontWeight',
        'color',
        'backgroundColor',
        'borderRadius',
        'border',
        'boxShadow',
      ];
      const result = {};
      props.forEach((p) => {
        const val = computed[p];
        if (val) result[p] = val;
      });
      return result;
    } catch {
      return {};
    }
  }

  /**
   * Master resolution logic for a target element
   */
  function resolveTargetContext(element) {
    // 1. Check for data-pointr-source (Vite / AST plugin)
    const sourceEl = element.closest('[data-pointr-source]');
    const sourceAttr = sourceEl?.getAttribute('data-pointr-source') || null;

    if (sourceAttr) {
      const parts = sourceAttr.split(':');
      let file = 'Unknown';
      let line = 0;
      let column = 0;

      if (parts.length >= 3) {
        column = parseInt(parts.pop() || '0', 10);
        line = parseInt(parts.pop() || '0', 10);
        file = parts.join(':');
      } else if (parts.length === 2) {
        line = parseInt(parts.pop() || '0', 10);
        file = parts[0] || 'Unknown';
      } else {
        file = sourceAttr;
      }

      return {
        strategy: 'AST Plugin',
        framework: 'Vite AST Plugin',
        source: { file, line, column, snippet: '' },
        componentTree: [],
        nearestComponent: file.split('/').pop() || element.tagName.toLowerCase(),
      };
    }

    // 2. Try React Fiber Traversal
    const reactInfo = resolveReactFiberInfo(element);
    if (reactInfo && (reactInfo.primarySource || reactInfo.componentTree.length > 0)) {
      return {
        strategy: 'React Fiber',
        framework: 'React',
        source: reactInfo.primarySource || {
          file: reactInfo.nearestComponent ? `${reactInfo.nearestComponent}.tsx` : 'ReactComponent.tsx',
          line: 1,
          column: 1,
          snippet: '',
        },
        componentTree: reactInfo.componentTree,
        nearestComponent: reactInfo.nearestComponent || element.tagName.toLowerCase(),
      };
    }

    // 3. Try Vue 3 Component Traversal
    const vueInfo = resolveVueInfo(element);
    if (vueInfo && (vueInfo.primarySource || vueInfo.componentTree.length > 0)) {
      return {
        strategy: 'Vue VNode',
        framework: 'Vue 3',
        source: vueInfo.primarySource || {
          file: `${vueInfo.nearestComponent}.vue`,
          line: 1,
          column: 1,
          snippet: '',
        },
        componentTree: vueInfo.componentTree,
        nearestComponent: vueInfo.nearestComponent,
      };
    }

    // 4. Fallback DOM Representation
    return {
      strategy: 'DOM Fallback',
      framework: 'DOM',
      source: {
        file: `${element.tagName.toLowerCase()}.html`,
        line: 1,
        column: 1,
        snippet: '',
      },
      componentTree: [],
      nearestComponent: element.tagName.toLowerCase(),
    };
  }

  // --------------------------------------------------------------------------
  // UI & Overlay Rendering
  // --------------------------------------------------------------------------

  function initUIElements() {
    if (highlightOverlay) return;

    // Reticle highlight box
    highlightOverlay = document.createElement('div');
    highlightOverlay.id = '__pointr_reticle_overlay__';
    highlightOverlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483640;
      display: none;
      box-sizing: border-box;
      border: 2px solid #38bdf8;
      background-color: rgba(56, 189, 248, 0.12);
      border-radius: 4px;
      box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.8), 0 0 12px rgba(56, 189, 248, 0.4);
      transition: all 0.08s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    document.documentElement.appendChild(highlightOverlay);

    // Floating Tooltip HUD
    tooltipEl = document.createElement('div');
    tooltipEl.id = '__pointr_hud_tooltip__';
    tooltipEl.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483641;
      display: none;
      background: #090d16;
      color: #f8fafc;
      padding: 6px 10px;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.4;
      border: 1px solid #1e293b;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(56, 189, 248, 0.2);
      max-width: 380px;
      word-break: break-all;
    `;
    document.documentElement.appendChild(tooltipEl);

    // Toast Container
    toastContainer = document.createElement('div');
    toastContainer.id = '__pointr_toast_container__';
    toastContainer.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.documentElement.appendChild(toastContainer);
  }

  function showToast(message, isSuccess = true) {
    if (!toastContainer) initUIElements();
    const toast = document.createElement('div');
    toast.style.cssText = `
      background: #0b1329;
      color: #f8fafc;
      border: 1px solid ${isSuccess ? '#38bdf8' : '#ef4444'};
      border-left: 4px solid ${isSuccess ? '#38bdf8' : '#ef4444'};
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: auto;
      animation: pointrSlideIn 0.2s ease-out;
    `;

    toast.innerHTML = `
      <span style="color: ${isSuccess ? '#38bdf8' : '#ef4444'}; font-size: 15px;">${
      isSuccess ? '🎯' : '⚠️'
    }</span>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function updateHighlight(element, mouseX, mouseY) {
    if (!element || element.id?.startsWith('__pointr')) {
      cleanupHighlight();
      return;
    }

    initUIElements();
    currentHoveredEl = element;

    const rect = element.getBoundingClientRect();
    highlightOverlay.style.display = 'block';
    highlightOverlay.style.left = `${rect.left}px`;
    highlightOverlay.style.top = `${rect.top}px`;
    highlightOverlay.style.width = `${rect.width}px`;
    highlightOverlay.style.height = `${rect.height}px`;

    const context = resolveTargetContext(element);
    const sourceDisplay = context.source.file
      ? `${context.source.file}${context.source.line ? `:${context.source.line}` : ''}`
      : `<${element.tagName.toLowerCase()}>`;

    tooltipEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
        <span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 1px 5px; border-radius: 3px; font-weight: 600; font-size: 10px;">${
          context.framework
        }</span>
        <span style="font-weight: 600; color: #f1f5f9;">${
          context.nearestComponent || element.tagName.toLowerCase()
        }</span>
      </div>
      <div style="color: #94a3b8; font-size: 10px;">${sourceDisplay}</div>
    `;

    tooltipEl.style.display = 'block';
    let tx = mouseX + 12;
    let ty = mouseY + 18;

    const tooltipRect = tooltipEl.getBoundingClientRect();
    if (tx + tooltipRect.width > window.innerWidth - 10) {
      tx = mouseX - tooltipRect.width - 12;
    }
    if (ty + tooltipRect.height > window.innerHeight - 10) {
      ty = mouseY - tooltipRect.height - 18;
    }

    tooltipEl.style.left = `${Math.max(6, tx)}px`;
    tooltipEl.style.top = `${Math.max(6, ty)}px`;
  }

  function cleanupHighlight() {
    if (highlightOverlay) highlightOverlay.style.display = 'none';
    if (tooltipEl) tooltipEl.style.display = 'none';
    currentHoveredEl = null;
  }

  // --------------------------------------------------------------------------
  // Intent Modal Dialogue
  // --------------------------------------------------------------------------

  function showIntentModal(element) {
    if (activeModal) activeModal.remove();

    const context = resolveTargetContext(element);
    const rect = element.getBoundingClientRect();

    const modal = document.createElement('div');
    modal.id = '__pointr_intent_modal__';
    modal.style.cssText = `
      position: fixed;
      background: #090d16;
      border: 1px solid #1e293b;
      border-top: 3px solid #38bdf8;
      border-radius: 8px;
      padding: 16px;
      width: 360px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(56, 189, 248, 0.2);
      z-index: 2147483645;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-sizing: border-box;
      pointer-events: auto;
    `;

    const breadcrumbs =
      context.componentTree.length > 0
        ? context.componentTree.map((c) => c.name).join(' › ')
        : `<${element.tagName.toLowerCase()}>`;

    const sourceLabel = context.source.file
      ? `${context.source.file}:${context.source.line}:${context.source.column}`
      : generateCssSelector(element);

    modal.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #38bdf8; font-size: 14px;">⊕</span>
          <span style="font-weight: 700; font-size: 13px; letter-spacing: -0.01em; color: #f1f5f9;">
            ${context.nearestComponent || element.tagName.toLowerCase()}
          </span>
          <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 3px; font-family: monospace;">
            ${context.strategy}
          </span>
        </div>
        <span id="__pointr_close_btn__" style="color: #64748b; cursor: pointer; font-size: 16px; line-height: 1; padding: 2px;">&times;</span>
      </div>

      <div style="background: #0f172a; padding: 6px 8px; border-radius: 4px; border: 1px solid #1e293b; margin-bottom: 12px; font-family: monospace; font-size: 11px; color: #94a3b8; word-break: break-all;">
        <div style="color: #38bdf8; font-size: 10px; margin-bottom: 2px;">LOCATION:</div>
        ${sourceLabel}
      </div>

      ${
        context.componentTree.length > 1
          ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 10px; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              Tree: ${breadcrumbs}
             </div>`
          : ''
      }

      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 4px;">
          Agent Instruction / Intent
        </label>
        <textarea id="__pointr_intent_textarea__" rows="3" placeholder="What should the AI coding agent change? (e.g. Add dark mode variant and tighten spacing)" style="
          width: 100%;
          box-sizing: border-box;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 6px;
          padding: 8px 10px;
          color: #f8fafc;
          font-family: inherit;
          font-size: 12px;
          line-height: 1.4;
          resize: vertical;
          outline: none;
        "></textarea>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 10px; color: #64748b;">Enter to send • Esc to cancel</span>
        <div style="display: flex; gap: 8px;">
          <button id="__pointr_cancel_btn__" style="
            background: transparent;
            border: 1px solid #334155;
            color: #cbd5e1;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
          ">Cancel</button>
          <button id="__pointr_submit_btn__" style="
            background: #0284c7;
            border: 1px solid #38bdf8;
            color: #ffffff;
            padding: 5px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
          ">Send to Agent ↵</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(modal);
    activeModal = modal;

    // Position modal conveniently near clicked element
    let mx = rect.left + rect.width / 2 - 180;
    let my = rect.bottom + 12;

    if (mx + 370 > window.innerWidth) mx = window.innerWidth - 380;
    if (mx < 10) mx = 10;
    if (my + 260 > window.innerHeight) my = Math.max(10, rect.top - 270);

    modal.style.left = `${mx}px`;
    modal.style.top = `${my}px`;

    const textarea = modal.querySelector('#__pointr_intent_textarea__');
    const submitBtn = modal.querySelector('#__pointr_submit_btn__');
    const cancelBtn = modal.querySelector('#__pointr_cancel_btn__');
    const closeBtn = modal.querySelector('#__pointr_close_btn__');

    textarea.focus();

    const closeModal = () => {
      if (activeModal) {
        activeModal.remove();
        activeModal = null;
      }
      document.removeEventListener('keydown', handleKeyDown);
    };

    const submit = async () => {
      const intent = textarea.value.trim() || 'Inspect and refactor this component.';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        await packageAndSendPayload(element, intent, context);
        showToast(`Sent context for <${context.nearestComponent}> to MCP!`);
      } catch (err) {
        console.error('[Pointr] Error sending payload:', err);
        showToast('MCP Server offline. Context saved locally.', false);
      } finally {
        closeModal();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
        e.preventDefault();
        submit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    submitBtn.addEventListener('click', submit);
    cancelBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
  }

  // --------------------------------------------------------------------------
  // Context Packaging & MCP Dispatch
  // --------------------------------------------------------------------------

  async function packageAndSendPayload(element, intent, context) {
    const domAttrs = {};
    Array.from(element.attributes || []).forEach((attr) => {
      if (attr.name !== 'data-pointr-source') domAttrs[attr.name] = attr.value;
    });

    const cssSelector = generateCssSelector(element);
    const xpath = generateXPath(element);
    const computedStyles = readComputedStyles(element);
    const tailwindClasses = Array.from(element.classList || []);
    const textSnippet = (element.textContent || '').trim().slice(0, 300);

    const payload = {
      source: {
        file: context.source.file || 'Unknown',
        line: context.source.line || 1,
        column: context.source.column || 1,
        snippet: '// browser resolved snippet',
      },
      componentTree: context.componentTree,
      dom: {
        tagName: element.tagName.toLowerCase(),
        cssSelector,
        xpath,
        attributes: domAttrs,
        textContent: textSnippet,
      },
      styles: {
        computed: computedStyles,
        designTokens: {},
        tailwindClasses,
      },
      screenshot: {
        base64: '',
        width: Math.round(element.getBoundingClientRect().width),
        height: Math.round(element.getBoundingClientRect().height),
      },
      meta: {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        intent,
        framework: context.framework,
        pointrVersion: '0.1.0',
      },
      markdown: formatPayloadMarkdown({
        context,
        element,
        intent,
        cssSelector,
        textSnippet,
        tailwindClasses,
      }),
    };

    // 1. Notify background service worker (for popup history and badge)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'TARGET_CAPTURED',
        payload,
      });
    }

    // 2. Dispatch to local MCP Server HTTP endpoint
    const portsToTry = [mcpPort, 3333, 3334, 3335];
    const uniquePorts = [...new Set(portsToTry)];
    let sent = false;

    for (const port of uniquePorts) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/context`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          sent = true;
          break;
        }
      } catch {
        // try next port
      }
    }

    if (!sent) {
      throw new Error(`Could not connect to Pointr MCP server on ports ${uniquePorts.join(', ')}`);
    }

    return payload;
  }

  function formatPayloadMarkdown({
    context,
    element,
    intent,
    cssSelector,
    textSnippet,
    tailwindClasses,
  }) {
    const sourcePath = context.source.file
      ? `\`${context.source.file}:${context.source.line}:${context.source.column}\``
      : '`Runtime DOM element`';

    return `## Pointr Element Context

**Intent:** "${intent}"
**Framework:** ${context.framework} (${context.strategy})

### Target Element
- **Component / Name:** \`${context.nearestComponent || element.tagName.toLowerCase()}\`
- **Source Location:** ${sourcePath}
- **DOM Tag:** \`<${element.tagName.toLowerCase()}>\`
- **CSS Selector:** \`${cssSelector}\`
${tailwindClasses.length > 0 ? `- **Tailwind Classes:** \`${tailwindClasses.join(' ')}\`\n` : ''}${
      textSnippet ? `- **Text Content:** "${textSnippet.slice(0, 120)}..."\n` : ''
    }
${
  context.componentTree.length > 0
    ? `### Component Hierarchy\n${context.componentTree
        .map((c) => `- \`<${c.name}>\` ${c.file ? `(${c.file})` : ''}`)
        .join('\n')}\n`
    : ''
}
### Instruction for AI Coding Agent
Please apply the requested changes (${intent}) to the target component identified at ${sourcePath}.`;
  }

  // --------------------------------------------------------------------------
  // Event Listeners
  // --------------------------------------------------------------------------

  function handleKeyDown(e) {
    if (!isExtensionEnabled) return;

    if (e.key === hotkey || (hotkey === 'Alt' && e.altKey)) {
      isHotkeyActive = true;
    }
  }

  function handleKeyUp(e) {
    if (e.key === hotkey || (!e.altKey && isHotkeyActive)) {
      isHotkeyActive = false;
      cleanupHighlight();
    }
  }

  function handleMouseMove(e) {
    if (!isExtensionEnabled || !isHotkeyActive || activeModal) return;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (target) {
      updateHighlight(target, e.clientX, e.clientY);
    }
  }

  function handleClick(e) {
    if (!isExtensionEnabled || !isHotkeyActive) return;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target.id?.startsWith('__pointr')) return;

    e.preventDefault();
    e.stopPropagation();

    cleanupHighlight();
    showIntentModal(target);
  }

  // Register Global Listeners
  window.addEventListener('keydown', handleKeyDown, { capture: true, passive: true });
  window.addEventListener('keyup', handleKeyUp, { capture: true, passive: true });
  window.addEventListener('mousemove', handleMouseMove, { capture: true, passive: true });
  window.addEventListener('click', handleClick, { capture: true });

  console.log('🎯 [Pointr Extension] Overlay injector loaded on', window.location.origin);
})();
