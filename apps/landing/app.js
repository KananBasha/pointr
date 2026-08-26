// Pointr Interactive Sandbox Engine — Preset Action Demonstrator
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
  const toggleBtn = document.getElementById('toggle-mode-btn');
  const resetBtn = document.getElementById('reset-demo-btn');

  // Security Helper: Strictly sanitize strings for display
  function sanitize(str) {
    if (!str) return '';
    return str.replace(/[<>]/g, '').trim().slice(0, 200);
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

  // Dialog interactions
  const closeBtn = document.getElementById('dialog-close');
  if (closeBtn) closeBtn.addEventListener('click', hideDialog);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideDialog();
  });
  
  document.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const actionType = e.currentTarget.getAttribute('data-action');
      const actionLabel = e.currentTarget.textContent.trim();
      executePresetAction(actionType, actionLabel);
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
    const compName = sanitize(element.getAttribute('data-component') || element.tagName.toLowerCase());
    const loc = sanitize(element.getAttribute('data-loc') || '');
    
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
    const compName = sanitize(element.getAttribute('data-component') || element.tagName.toLowerCase());
    const loc = sanitize(element.getAttribute('data-loc') || '');
    
    const targetLabel = document.getElementById('dialog-target-label');
    if (targetLabel) {
      targetLabel.textContent = `Target: <${compName}> ${loc}`;
    }
    
    const dialogWidth = 340;
    const dialogHeight = 160;
    
    let posX = x + 10;
    let posY = y + 10;
    
    if (posX + dialogWidth > window.innerWidth) posX = window.innerWidth - dialogWidth - 20;
    if (posY + dialogHeight > window.innerHeight) posY = window.innerHeight - dialogHeight - 20;

    dialog.style.left = `${Math.max(10, posX)}px`;
    dialog.style.top = `${Math.max(10, posY)}px`;
    dialog.classList.remove('hidden');
    
    generateInitialPayload(element);
  }

  function hideDialog() {
    if (dialog) dialog.classList.add('hidden');
  }

  function generateInitialPayload(element) {
    if (!element || !payloadOutput) return;
    const compName = sanitize(element.getAttribute('data-component') || element.tagName.toLowerCase());
    const loc = sanitize(element.getAttribute('data-loc') || '1:1');
    const [line, col] = loc.split(':');
    const textSnippet = sanitize((element.textContent || '').trim().substring(0, 40));

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
        intent: "Choose an action in the overlay dialog...",
        delivery: "MCP Server (port 3333)"
      }
    };

    payloadOutput.textContent = JSON.stringify(payload, null, 2);
  }

  // =========================================================================
  // Robust Preset Action Executor
  // =========================================================================
  function executePresetAction(actionType, actionLabel) {
    if (!currentTargetNode) return;
    currentTargetNode.style.transition = 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
    let diff = "";

    if (actionType === 'emerald') {
      currentTargetNode.style.backgroundColor = 'var(--success-emerald)';
      currentTargetNode.style.borderColor = 'var(--success-emerald)';
      if (currentTargetNode.tagName === 'BUTTON') currentTargetNode.style.color = '#ffffff';
      diff = "+ backgroundColor: '#10b981'\n+ borderColor: '#10b981'";
    } else if (actionType === 'revenue') {
      const valEl = currentTargetNode.querySelector('.card-value') || currentTargetNode;
      const oldVal = sanitize(valEl.textContent || '$124,500');
      valEl.textContent = '$250,000';
      valEl.style.color = 'var(--success-emerald)';
      diff = `- value: "${oldVal}"\n+ value: "$250,000"\n+ color: '#10b981'`;
    } else if (actionType === 'glow') {
      currentTargetNode.style.borderRadius = '16px';
      currentTargetNode.style.borderColor = 'var(--primary-blue)';
      currentTargetNode.style.boxShadow = '0 0 25px rgba(59, 130, 246, 0.5)';
      diff = "+ borderRadius: '16px'\n+ borderColor: '#3b82f6'\n+ boxShadow: '0 0 25px rgba(59, 130, 246, 0.5)'";
    } else if (actionType === 'hide') {
      currentTargetNode.style.opacity = '0.15';
      currentTargetNode.style.filter = 'grayscale(100%)';
      diff = "- display: 'block'\n+ display: 'none'";
    }

    // Update payload in Inspector
    try {
      const payload = JSON.parse(payloadOutput.textContent || '{}');
      payload.meta.intent = actionLabel;
      payload.meta.timestamp = new Date().toISOString();
      payload.aiAgentResponse = {
        status: "200 OK — Diff generated & applied",
        astNode: currentTargetNode.getAttribute('data-component') || currentTargetNode.tagName.toLowerCase(),
        diff: diff
      };
      payloadOutput.textContent = JSON.stringify(payload, null, 2);
    } catch (e) {
      // ignore
    }

    hideDialog();
  }
});
