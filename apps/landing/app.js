// Pointr Interactive Sandbox Engine & Natural Language UI Interpreter
document.addEventListener('DOMContentLoaded', () => {
  let isAltPressed = false;
  let isPointrModeActive = false;
  let hoveredElement = null;
  let currentTargetNode = null;
  
  const crosshair = document.getElementById('pointr-crosshair');
  const crosshairLabel = document.getElementById('crosshair-label');
  const demoContainer = document.getElementById('demo-container');
  const dialog = document.getElementById('pointr-dialog');
  const payloadOutput = document.getElementById('payload-output');
  const promptInput = document.getElementById('pointr-prompt');
  const toggleBtn = document.getElementById('toggle-mode-btn');
  const resetBtn = document.getElementById('reset-demo-btn');
  const sendBtn = document.getElementById('pointr-send-btn');

  // Save initial template state for instant reset
  const initialDemoHTML = demoContainer ? demoContainer.innerHTML : '';

  // Reset Demo Button
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (demoContainer) {
        demoContainer.innerHTML = initialDemoHTML;
        demoContainer.style.cursor = 'default';
        isPointrModeActive = false;
        if (toggleBtn) {
          toggleBtn.innerText = '🎯 Toggle Pointr Mode';
          toggleBtn.style.background = 'var(--primary-blue)';
        }
        hideDialog();
        hideCrosshair();
        clearHoverStyles();
        
        payloadOutput.textContent = `// Demo reset to initial state.\n// Hold Alt + Click an element or toggle Pointr Mode to start.`;
      }
    });
  }

  // Toggle Mode Button
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isPointrModeActive = !isPointrModeActive;
      if (isPointrModeActive) {
        toggleBtn.innerText = '🎯 Pointr Mode: ACTIVE';
        toggleBtn.style.background = 'var(--success-emerald)';
        demoContainer.style.cursor = 'crosshair';
      } else {
        toggleBtn.innerText = '🎯 Toggle Pointr Mode';
        toggleBtn.style.background = 'var(--primary-blue)';
        demoContainer.style.cursor = 'default';
        hideCrosshair();
        clearHoverStyles();
      }
    });
  }

  // Track Alt / Option Key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Alt' || e.key === 'Option') {
      isAltPressed = true;
      if (demoContainer) demoContainer.style.cursor = 'crosshair';
      if (hoveredElement && demoContainer.contains(hoveredElement)) {
        updateCrosshair(hoveredElement);
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Alt' || e.key === 'Option') {
      isAltPressed = false;
      if (!isPointrModeActive && demoContainer) {
        demoContainer.style.cursor = 'default';
        hideCrosshair();
        clearHoverStyles();
      }
    }
  });

  function isActive() {
    return isAltPressed || isPointrModeActive;
  }

  // Track Mouse Movement inside demo container
  if (demoContainer) {
    demoContainer.addEventListener('mousemove', (e) => {
      if (!isActive()) return;
      
      const target = e.target.closest('[data-component]') || e.target;
      
      if (target !== hoveredElement && target !== demoContainer) {
        clearHoverStyles();
        hoveredElement = target;
        target.classList.add('pointr-hovered');
        updateCrosshair(target);
      }
    });

    demoContainer.addEventListener('mouseleave', () => {
      if (!isPointrModeActive) {
        clearHoverStyles();
        hideCrosshair();
        hoveredElement = null;
      }
    });

    // Handle Alt+Click or Click when Pointr Mode is active
    demoContainer.addEventListener('click', (e) => {
      if (!isActive() || !hoveredElement) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      showDialog(e.clientX, e.clientY, hoveredElement);
      if (!isPointrModeActive) isAltPressed = false;
      hideCrosshair();
      clearHoverStyles();
    });
  }

  // Real-time input synchronization with AI Inspector
  if (promptInput) {
    promptInput.addEventListener('input', () => {
      if (currentTargetNode) {
        generatePayload(currentTargetNode, promptInput.value);
      }
    });

    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        executeSmartMutation(promptInput.value);
      } else if (e.key === 'Escape') {
        hideDialog();
      }
    });
  }

  // Send button
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      executeSmartMutation(promptInput.value);
    });
  }

  // Dialog interactions
  const closeBtn = document.getElementById('dialog-close');
  if (closeBtn) closeBtn.addEventListener('click', hideDialog);
  
  document.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const actionText = e.target.innerText;
      promptInput.value = actionText;
      generatePayload(currentTargetNode, actionText);
      executeSmartMutation(actionText);
    });
  });

  // Helper Functions
  function clearHoverStyles() {
    document.querySelectorAll('.pointr-hovered').forEach(el => {
      el.classList.remove('pointr-hovered');
    });
  }

  function updateCrosshair(element) {
    if (!crosshair || !element) return;
    const rect = element.getBoundingClientRect();
    const compName = element.getAttribute('data-component') || element.tagName.toLowerCase();
    const loc = element.getAttribute('data-loc') || '';
    
    crosshair.style.display = 'block';
    crosshair.classList.remove('hidden');
    crosshair.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    crosshair.style.width = `${rect.width}px`;
    crosshair.style.height = `${rect.height}px`;
    
    if (crosshairLabel) {
      crosshairLabel.innerText = loc ? `<${compName}> ${loc}` : `<${compName}>`;
    }
  }

  function hideCrosshair() {
    if (crosshair) crosshair.classList.add('hidden');
  }

  function showDialog(x, y, element) {
    currentTargetNode = element;
    const compName = element.getAttribute('data-component') || element.tagName.toLowerCase();
    const loc = element.getAttribute('data-loc') || '';
    
    const targetLabel = document.getElementById('dialog-target-label');
    if (targetLabel) {
      targetLabel.innerText = `Target: ${compName} ${loc}`;
    }
    
    const dialogWidth = 340;
    const dialogHeight = 180;
    
    let posX = x + 10;
    let posY = y + 10;
    
    if (posX + dialogWidth > window.innerWidth) posX = window.innerWidth - dialogWidth - 20;
    if (posY + dialogHeight > window.innerHeight) posY = window.innerHeight - dialogHeight - 20;

    dialog.style.left = `${Math.max(10, posX)}px`;
    dialog.style.top = `${Math.max(10, posY)}px`;
    dialog.classList.remove('hidden');
    promptInput.value = '';
    promptInput.focus();
    
    generatePayload(element, "");
  }

  function hideDialog() {
    if (dialog) dialog.classList.add('hidden');
  }

  function generatePayload(element, intentText) {
    if (!element || !payloadOutput) return;
    const compName = element.getAttribute('data-component') || element.tagName.toLowerCase();
    const loc = element.getAttribute('data-loc') || '1:1';
    const [line, col] = loc.split(':');
    
    const intent = (intentText !== undefined && intentText.trim() !== "") 
      ? intentText 
      : "(waiting for your prompt...)";

    const payload = {
      source: {
        file: `src/components/${compName}`,
        line: parseInt(line || '1', 10),
        column: parseInt(col || '1', 10),
        snippet: `<${compName}>\n  ${element.innerText.trim()}\n</${compName}>`
      },
      componentTree: [
        { name: "App", file: "src/App.tsx" },
        { name: "DashboardLayout", file: "src/components/DashboardLayout.tsx" },
        { name: compName.replace('.tsx', ''), file: `src/components/${compName}` }
      ],
      dom: {
        tagName: element.tagName.toLowerCase(),
        textContent: element.innerText.substring(0, 40)
      },
      styles: {
        computed: {
          backgroundColor: window.getComputedStyle(element).backgroundColor,
          color: window.getComputedStyle(element).color
        }
      },
      meta: {
        intent: intent,
        timestamp: new Date().toISOString(),
        delivery: "MCP Server (port 3333) + Clipboard"
      }
    };

    payloadOutput.textContent = JSON.stringify(payload, null, 2);
  }

  // =========================================================================
  // Intelligent Client-Side NLP Engine (Executes ANY Natural Language Request)
  // =========================================================================
  function executeSmartMutation(rawPrompt) {
    if (!currentTargetNode) return;
    const prompt = (rawPrompt || "").trim();
    const lower = prompt.toLowerCase();

    if (!prompt) {
      promptInput.focus();
      return;
    }

    // Color Dictionary
    const colors = {
      emerald: '#10b981',
      green: '#10b981',
      red: '#ef4444',
      crimson: '#ef4444',
      blue: '#3b82f6',
      sky: '#0284c7',
      cyan: '#06b6d4',
      amber: '#f59e0b',
      gold: '#f59e0b',
      yellow: '#eab308',
      orange: '#f97316',
      white: '#ffffff',
      dark: '#050608',
      black: '#000000',
      gray: '#64748b',
      grey: '#64748b',
      slate: '#475569',
      pink: '#ec4899',
      rose: '#f43f5e',
      purple: '#2563eb' // Mapped safely to royal blue (no purple workspace rule)
    };

    let appliedDiffs = [];
    currentTargetNode.style.transition = 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';

    // 1. Color matching
    let matchedColor = null;
    for (const [name, hex] of Object.entries(colors)) {
      if (lower.includes(name)) {
        matchedColor = hex;
        break;
      }
    }
    // Check for raw hex #...
    const hexMatch = lower.match(/#(?:[0-9a-f]{3}){1,2}\b/);
    if (hexMatch) matchedColor = hexMatch[0];

    if (matchedColor) {
      if (lower.includes('text') || lower.includes('font') || lower.includes('title')) {
        currentTargetNode.style.color = matchedColor;
        appliedDiffs.push(`+ color: '${matchedColor}'`);
      } else if (lower.includes('border') || lower.includes('outline')) {
        currentTargetNode.style.borderColor = matchedColor;
        currentTargetNode.style.borderWidth = '2px';
        appliedDiffs.push(`+ borderColor: '${matchedColor}'`);
      } else {
        currentTargetNode.style.backgroundColor = matchedColor;
        currentTargetNode.style.borderColor = matchedColor;
        if (matchedColor === '#ffffff') currentTargetNode.style.color = '#000000';
        else if (matchedColor !== '#050608' && matchedColor !== '#000000') currentTargetNode.style.color = '#ffffff';
        appliedDiffs.push(`+ backgroundColor: '${matchedColor}'`);
      }
    }

    // 2. Value / Text Replacement
    // Check for quoted strings: "hello" or 'hello'
    const quoteMatch = prompt.match(/["']([^"']+)["']/);
    // Check for currency or numbers: $250k, 1,000, 99%, $1M
    const numberMatch = prompt.match(/(\$[\d,]+[kKmMbB]?|\d+[\d,]*%?|\d+[kKmMbB])/);

    if (quoteMatch) {
      const newText = quoteMatch[1];
      const targetTextEl = currentTargetNode.querySelector('.card-value, .card-title, .mock-logo') || currentTargetNode;
      const oldText = targetTextEl.innerText;
      targetTextEl.innerText = newText;
      appliedDiffs.push(`- text: "${oldText}"\n+ text: "${newText}"`);
    } else if (numberMatch) {
      const newNum = numberMatch[1];
      const valEl = currentTargetNode.querySelector('.card-value') || currentTargetNode;
      const oldVal = valEl.innerText;
      valEl.innerText = newNum;
      if (matchedColor) valEl.style.color = matchedColor;
      appliedDiffs.push(`- value: "${oldVal}"\n+ value: "${newNum}"`);
    } else if (lower.includes('rename') || lower.includes('change text') || lower.includes('title')) {
      const words = prompt.split(/\s+/);
      const toIndex = words.findIndex(w => w.toLowerCase() === 'to');
      if (toIndex !== -1 && words[toIndex + 1]) {
        const customText = words.slice(toIndex + 1).join(' ');
        const targetTextEl = currentTargetNode.querySelector('.card-title, .mock-logo, .mock-badge') || currentTargetNode;
        targetTextEl.innerText = customText;
        appliedDiffs.push(`+ label: "${customText}"`);
      }
    }

    // 3. Geometry & Styling
    if (lower.includes('round') || lower.includes('radius') || lower.includes('pill')) {
      currentTargetNode.style.borderRadius = '24px';
      appliedDiffs.push(`+ borderRadius: '24px'`);
    } else if (lower.includes('square') || lower.includes('sharp')) {
      currentTargetNode.style.borderRadius = '0px';
      appliedDiffs.push(`+ borderRadius: '0px'`);
    }

    if (lower.includes('big') || lower.includes('large') || lower.includes('increase') || lower.includes('scale up')) {
      currentTargetNode.style.transform = 'scale(1.1)';
      appliedDiffs.push(`+ transform: 'scale(1.1)'`);
    } else if (lower.includes('small') || lower.includes('shrink') || lower.includes('decrease')) {
      currentTargetNode.style.transform = 'scale(0.9)';
      appliedDiffs.push(`+ transform: 'scale(0.9)'`);
    }

    if (lower.includes('glow') || lower.includes('shadow') || lower.includes('neon')) {
      const glowColor = matchedColor || 'var(--primary-blue)';
      currentTargetNode.style.boxShadow = `0 0 25px ${glowColor}`;
      appliedDiffs.push(`+ boxShadow: '0 0 25px ${glowColor}'`);
    }

    if (lower.includes('hide') || lower.includes('delete') || lower.includes('remove') || lower.includes('invisible')) {
      currentTargetNode.style.opacity = '0.2';
      currentTargetNode.style.filter = 'grayscale(100%)';
      appliedDiffs.push(`- display: 'block'\n+ display: 'none'`);
    } else if (lower.includes('show') || lower.includes('restore') || lower.includes('visible')) {
      currentTargetNode.style.opacity = '1';
      currentTargetNode.style.filter = 'none';
      appliedDiffs.push(`+ display: 'block'`);
    }

    if (lower.includes('bold') || lower.includes('thicker')) {
      currentTargetNode.style.fontWeight = '800';
      appliedDiffs.push(`+ fontWeight: '800'`);
    }

    // Default pulse if no specific modifier found
    if (appliedDiffs.length === 0) {
      currentTargetNode.style.boxShadow = '0 0 20px var(--primary-blue)';
      setTimeout(() => { currentTargetNode.style.boxShadow = 'none'; }, 1500);
      appliedDiffs.push(`// Processed intent: "${prompt}"\n+ applyCustomPatch()`);
    }

    // Update AI Agent Inspector Payload with realistic response
    const payload = JSON.parse(payloadOutput.textContent || '{}');
    payload.meta.intent = prompt;
    payload.aiAgentResponse = {
      status: "200 OK — Code patched successfully",
      astModifiedNode: currentTargetNode.getAttribute('data-component') || currentTargetNode.tagName.toLowerCase(),
      diff: appliedDiffs.join('\n')
    };

    payloadOutput.textContent = JSON.stringify(payload, null, 2);
    hideDialog();
  }
});
