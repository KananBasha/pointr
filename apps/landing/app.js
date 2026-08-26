// Pointr Interactive Sandbox Engine & Multilingual Smart NLP Engine (FR/EN)
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

  // Security Helper: Strictly sanitize all user text inputs to prevent XSS & DOM injection
  function sanitizeInput(str) {
    if (!str) return '';
    return str
      .replace(/[<>]/g, '') // Strip angle brackets
      .replace(/javascript:/gi, '') // Strip javascript pseudo-protocol
      .trim()
      .slice(0, 300); // Limit maximum length
  }

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
        if (demoContainer) demoContainer.style.cursor = 'crosshair';
      } else {
        toggleBtn.innerText = '🎯 Toggle Pointr Mode';
        toggleBtn.style.background = 'var(--primary-blue)';
        if (demoContainer) demoContainer.style.cursor = 'default';
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
      if (hoveredElement && demoContainer && demoContainer.contains(hoveredElement)) {
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
        generatePayload(currentTargetNode, sanitizeInput(promptInput.value));
      }
    });

    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSmartMutation(sanitizeInput(promptInput.value));
      } else if (e.key === 'Escape') {
        hideDialog();
      }
    });
  }

  // Send button
  if (sendBtn) {
    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      executeSmartMutation(sanitizeInput(promptInput.value));
    });
  }

  // Dialog interactions
  const closeBtn = document.getElementById('dialog-close');
  if (closeBtn) closeBtn.addEventListener('click', hideDialog);
  
  document.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
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
    const compName = sanitizeInput(element.getAttribute('data-component') || element.tagName.toLowerCase());
    const loc = sanitizeInput(element.getAttribute('data-loc') || '');
    
    crosshair.style.display = 'block';
    crosshair.classList.remove('hidden');
    crosshair.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    crosshair.style.width = `${rect.width}px`;
    crosshair.style.height = `${rect.height}px`;
    
    if (crosshairLabel) {
      crosshairLabel.textContent = loc ? `<${compName}> ${loc}` : `<${compName}>`;
    }
  }

  function hideCrosshair() {
    if (crosshair) crosshair.classList.add('hidden');
  }

  function showDialog(x, y, element) {
    currentTargetNode = element;
    const compName = sanitizeInput(element.getAttribute('data-component') || element.tagName.toLowerCase());
    const loc = sanitizeInput(element.getAttribute('data-loc') || '');
    
    const targetLabel = document.getElementById('dialog-target-label');
    if (targetLabel) {
      targetLabel.textContent = `Target: ${compName} ${loc}`;
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
    const compName = sanitizeInput(element.getAttribute('data-component') || element.tagName.toLowerCase());
    const loc = sanitizeInput(element.getAttribute('data-loc') || '1:1');
    const [line, col] = loc.split(':');
    
    const intent = (intentText !== undefined && intentText.trim() !== "") 
      ? sanitizeInput(intentText) 
      : "(waiting for your prompt...)";

    const textSnippet = sanitizeInput((element.textContent || '').trim().substring(0, 40));

    const payload = {
      source: {
        file: `src/components/${compName}`,
        line: parseInt(line || '1', 10),
        column: parseInt(col || '1', 10),
        snippet: `<${compName}>\n  ${textSnippet}\n</${compName}>`
      },
      componentTree: [
        { name: "App", file: "src/App.tsx" },
        { name: "DashboardLayout", file: "src/components/DashboardLayout.tsx" },
        { name: compName.replace('.tsx', ''), file: `src/components/${compName}` }
      ],
      dom: {
        tagName: element.tagName.toLowerCase(),
        textContent: textSnippet
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
  // Intelligent Client-Side NLP Engine (Multilingual FR / EN & Fully Sanitized)
  // =========================================================================
  function executeSmartMutation(rawPrompt) {
    if (!currentTargetNode) return;
    const prompt = sanitizeInput(rawPrompt || "");
    const lower = prompt.toLowerCase();

    if (!prompt) {
      promptInput.focus();
      return;
    }

    // Multilingual Color Dictionary (FR & EN)
    const colorMap = {
      // Gold / Yellow / Amber
      gold: '#f59e0b',
      doré: '#f59e0b',
      dore: '#f59e0b',
      or: '#f59e0b',
      amber: '#f59e0b',
      yellow: '#eab308',
      jaune: '#eab308',
      // Emerald / Green
      emerald: '#10b981',
      émeraude: '#10b981',
      emeraude: '#10b981',
      green: '#10b981',
      vert: '#10b981',
      verte: '#10b981',
      // Red / Crimson
      red: '#ef4444',
      rouge: '#ef4444',
      crimson: '#ef4444',
      // Blue / Cyan / Sky
      blue: '#3b82f6',
      bleu: '#3b82f6',
      bleue: '#3b82f6',
      sky: '#0284c7',
      cyan: '#06b6d4',
      azur: '#3b82f6',
      // Orange
      orange: '#f97316',
      // White
      white: '#ffffff',
      blanc: '#ffffff',
      blanche: '#ffffff',
      // Dark / Black
      dark: '#050608',
      sombre: '#050608',
      black: '#000000',
      noir: '#000000',
      noire: '#000000',
      // Gray / Slate
      gray: '#64748b',
      grey: '#64748b',
      gris: '#64748b',
      grise: '#64748b',
      slate: '#475569',
      // Pink
      pink: '#ec4899',
      rose: '#f43f5e',
      // Purple mapped safely to royal blue (no purple workspace rule)
      purple: '#2563eb',
      violet: '#2563eb',
      violette: '#2563eb'
    };

    let appliedDiffs = [];
    currentTargetNode.style.transition = 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';

    // Helper: Find color in a given substring
    function findColor(text) {
      if (!text) return null;
      for (const [name, hex] of Object.entries(colorMap)) {
        const regex = new RegExp(`\\b${name}\\b`, 'i');
        if (regex.test(text) || text.includes(name)) {
          return { name, hex };
        }
      }
      const hexMatch = text.match(/#(?:[0-9a-f]{3}){1,2}\b/i);
      if (hexMatch) return { name: hexMatch[0], hex: hexMatch[0] };
      return null;
    }

    // 1. Color Matching & Multi-Clause Extraction
    const isTextExplicit = lower.includes('text') || lower.includes('texte') || lower.includes('font') || lower.includes('police') || lower.includes('titre') || lower.includes('title') || lower.includes('écrit') || lower.includes('lettre') || lower.includes('couleur du texte');
    const isBorderExplicit = lower.includes('border') || lower.includes('bordure') || lower.includes('contour') || lower.includes('outline');
    const isBgExplicit = lower.includes('fond') || lower.includes('background') || lower.includes('bg') || lower.includes('arrière-plan') || lower.includes('arriere plan');

    const globalColor = findColor(lower);

    if (globalColor) {
      const colorHex = globalColor.hex;

      if (isTextExplicit) {
        // Apply color directly to node AND all descendant text containers
        currentTargetNode.style.color = colorHex;
        currentTargetNode.querySelectorAll('*').forEach(child => {
          child.style.color = colorHex;
        });
        appliedDiffs.push(`+ color: '${colorHex}'`);
      } else if (isBorderExplicit) {
        currentTargetNode.style.borderColor = colorHex;
        currentTargetNode.style.borderWidth = '2px';
        appliedDiffs.push(`+ borderColor: '${colorHex}'`);
      } else if (isBgExplicit) {
        currentTargetNode.style.backgroundColor = colorHex;
        currentTargetNode.style.borderColor = colorHex;
        if (colorHex === '#ffffff') {
          currentTargetNode.style.color = '#000000';
          currentTargetNode.querySelectorAll('*').forEach(c => c.style.color = '#000000');
        } else if (colorHex !== '#050608' && colorHex !== '#000000') {
          currentTargetNode.style.color = '#ffffff';
        }
        appliedDiffs.push(`+ backgroundColor: '${colorHex}'`);
      } else {
        // If element is a button or badge, change background + text
        currentTargetNode.style.backgroundColor = colorHex;
        currentTargetNode.style.borderColor = colorHex;
        if (colorHex === '#ffffff') {
          currentTargetNode.style.color = '#000000';
          currentTargetNode.querySelectorAll('*').forEach(c => c.style.color = '#000000');
        } else if (colorHex !== '#050608' && colorHex !== '#000000') {
          currentTargetNode.style.color = '#ffffff';
        }
        appliedDiffs.push(`+ backgroundColor: '${colorHex}'`);
      }
    }

    // 2. Value / Text Replacement (FR & EN)
    // Check for quoted strings: "..." or '...' or «...»
    const quoteMatch = prompt.match(/["'«]([^"'»]+)["'»]/);
    // Check for currency or numbers: $250k, 500k, 1,000, 99%, $1M, 5000€
    const numberMatch = prompt.match(/([\$€£]?\s*[\d,]+(?:\.\d+)?\s*[kKmMbB%]?|[\d,]+(?:\.\d+)?\s*[\$€£kKmMbB%])/);

    if (quoteMatch) {
      const newText = sanitizeInput(quoteMatch[1]);
      const targetTextEl = currentTargetNode.querySelector('.card-value, .card-title, .mock-logo, .mock-badge') || currentTargetNode;
      const oldText = sanitizeInput(targetTextEl.textContent || '');
      targetTextEl.textContent = newText;
      appliedDiffs.push(`- text: "${oldText}"\n+ text: "${newText}"`);
    } else if (numberMatch && (lower.includes('$') || lower.includes('€') || lower.includes('k') || lower.includes('m') || lower.includes('%') || lower.includes('valeur') || lower.includes('value') || lower.includes('revenue') || lower.includes('nombre') || lower.includes('chiffre'))) {
      const newNum = sanitizeInput(numberMatch[0].replace(/\s+/g, ''));
      const valEl = currentTargetNode.querySelector('.card-value') || currentTargetNode;
      const oldVal = sanitizeInput(valEl.textContent || '');
      valEl.textContent = newNum;
      if (globalColor) valEl.style.color = globalColor.hex;
      appliedDiffs.push(`- value: "${oldVal}"\n+ value: "${newNum}"`);
    } else if (lower.includes('rename') || lower.includes('renommer') || lower.includes('change text') || lower.includes('changer texte') || lower.includes('mettre') || lower.includes('titre') || lower.includes('title')) {
      // Extract target phrase after preposition (to / en / par / à)
      const prepMatch = prompt.match(/(?:to|en|par|à|a)\s+([a-zA-Z0-9_\s\$\€\-]{2,30})$/i);
      if (prepMatch) {
        const customText = sanitizeInput(prepMatch[1]);
        const targetTextEl = currentTargetNode.querySelector('.card-title, .mock-logo, .mock-badge, .card-value') || currentTargetNode;
        const oldText = sanitizeInput(targetTextEl.textContent || '');
        targetTextEl.textContent = customText;
        appliedDiffs.push(`- label: "${oldText}"\n+ label: "${customText}"`);
      }
    }

    // 3. Geometry & Styling (FR & EN)
    if (lower.includes('round') || lower.includes('arrond') || lower.includes('radius') || lower.includes('pill') || lower.includes('circulaire')) {
      currentTargetNode.style.borderRadius = '24px';
      appliedDiffs.push(`+ borderRadius: '24px'`);
    } else if (lower.includes('square') || lower.includes('carré') || lower.includes('carre') || lower.includes('sharp') || lower.includes('droit')) {
      currentTargetNode.style.borderRadius = '0px';
      appliedDiffs.push(`+ borderRadius: '0px'`);
    }

    if (lower.includes('big') || lower.includes('grand') || lower.includes('gros') || lower.includes('agrandir') || lower.includes('grossir') || lower.includes('large') || lower.includes('increase')) {
      currentTargetNode.style.transform = 'scale(1.1)';
      appliedDiffs.push(`+ transform: 'scale(1.1)'`);
    } else if (lower.includes('small') || lower.includes('petit') || lower.includes('réduire') || lower.includes('reduire') || lower.includes('diminuer') || lower.includes('shrink')) {
      currentTargetNode.style.transform = 'scale(0.9)';
      appliedDiffs.push(`+ transform: 'scale(0.9)'`);
    }

    if (lower.includes('glow') || lower.includes('lueur') || lower.includes('briller') || lower.includes('shadow') || lower.includes('ombre') || lower.includes('neon')) {
      const glowColor = globalColor ? globalColor.hex : 'var(--primary-blue)';
      currentTargetNode.style.boxShadow = `0 0 25px ${glowColor}`;
      appliedDiffs.push(`+ boxShadow: '0 0 25px ${glowColor}'`);
    }

    if (lower.includes('hide') || lower.includes('cacher') || lower.includes('masquer') || lower.includes('delete') || lower.includes('supprimer') || lower.includes('enlever') || lower.includes('invisible')) {
      currentTargetNode.style.opacity = '0.15';
      currentTargetNode.style.filter = 'grayscale(100%)';
      appliedDiffs.push(`- display: 'block'\n+ display: 'none'`);
    } else if (lower.includes('show') || lower.includes('montrer') || lower.includes('afficher') || lower.includes('restore') || lower.includes('visible')) {
      currentTargetNode.style.opacity = '1';
      currentTargetNode.style.filter = 'none';
      appliedDiffs.push(`+ display: 'block'`);
    }

    if (lower.includes('bold') || lower.includes('gras') || lower.includes('thicker') || lower.includes('épais') || lower.includes('epais')) {
      currentTargetNode.style.fontWeight = '800';
      appliedDiffs.push(`+ fontWeight: '800'`);
    }

    // Default fallback if no specific rule matched
    if (appliedDiffs.length === 0) {
      currentTargetNode.style.boxShadow = '0 0 20px var(--primary-blue)';
      setTimeout(() => { 
        if (currentTargetNode) currentTargetNode.style.boxShadow = 'none'; 
      }, 1500);
      appliedDiffs.push(`// Processed intent: "${prompt}"\n+ applyCustomPatch({ target: "${currentTargetNode.tagName.toLowerCase()}" })`);
    }

    // Update AI Agent Inspector Payload
    try {
      const payload = JSON.parse(payloadOutput.textContent || '{}');
      payload.meta.intent = prompt;
      payload.aiAgentResponse = {
        status: "200 OK — Code patched successfully",
        astModifiedNode: currentTargetNode.getAttribute('data-component') || currentTargetNode.tagName.toLowerCase(),
        diff: appliedDiffs.join('\n')
      };
      payloadOutput.textContent = JSON.stringify(payload, null, 2);
    } catch (e) {
      // Fallback
    }

    hideDialog();
  }
});
