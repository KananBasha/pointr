// Vanilla JS for Pointr Landing Interactive Demo
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

  // Track Alt Key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Alt' || e.key === 'Option') {
      isAltPressed = true;
      demoContainer.style.cursor = 'crosshair';
      if (hoveredElement && demoContainer.contains(hoveredElement)) {
        updateCrosshair(hoveredElement);
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Alt' || e.key === 'Option') {
      isAltPressed = false;
      if (!isPointrModeActive) {
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
  demoContainer.addEventListener('mousemove', (e) => {
    if (!isActive()) return;
    
    // Find closest element with data-component
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

  // Dialog interactions
  const closeBtn = document.getElementById('dialog-close');
  if (closeBtn) closeBtn.addEventListener('click', hideDialog);
  
  document.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.target.getAttribute('data-action');
      promptInput.value = e.target.innerText;
      executeAction(action);
    });
  });

  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeAction('custom');
    }
  });

  // Helper Functions
  function clearHoverStyles() {
    document.querySelectorAll('.pointr-hovered').forEach(el => {
      el.classList.remove('pointr-hovered');
    });
  }

  function updateCrosshair(element) {
    const rect = element.getBoundingClientRect();
    const compName = element.getAttribute('data-component') || element.tagName.toLowerCase();
    const loc = element.getAttribute('data-loc') || '';
    
    crosshair.style.display = 'block';
    crosshair.classList.remove('hidden');
    crosshair.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    crosshair.style.width = `${rect.width}px`;
    crosshair.style.height = `${rect.height}px`;
    
    crosshairLabel.innerText = loc ? `<${compName}> ${loc}` : `<${compName}>`;
  }

  function hideCrosshair() {
    crosshair.classList.add('hidden');
  }

  function showDialog(x, y, element) {
    currentTargetNode = element;
    const compName = element.getAttribute('data-component') || element.tagName.toLowerCase();
    const loc = element.getAttribute('data-loc') || '';
    
    document.getElementById('dialog-target-label').innerText = `Target: ${compName} ${loc}`;
    
    const dialogWidth = 320;
    const dialogHeight = 160;
    
    let posX = x + 10;
    let posY = y + 10;
    
    if (posX + dialogWidth > window.innerWidth) posX = window.innerWidth - dialogWidth - 20;
    if (posY + dialogHeight > window.innerHeight) posY = window.innerHeight - dialogHeight - 20;

    dialog.style.left = `${posX}px`;
    dialog.style.top = `${posY}px`;
    dialog.classList.remove('hidden');
    promptInput.focus();
    
    generatePayload(element);
  }

  function hideDialog() {
    dialog.classList.add('hidden');
    promptInput.value = '';
  }

  function generatePayload(element) {
    const compName = element.getAttribute('data-component') || element.tagName.toLowerCase();
    const loc = element.getAttribute('data-loc') || '1:1';
    const [line, col] = loc.split(':');
    
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
        intent: promptInput.value || "Selected element via Pointr overlay",
        timestamp: new Date().toISOString()
      }
    };

    payloadOutput.innerHTML = JSON.stringify(payload, null, 2);
  }

  function executeAction(actionType) {
    if (!currentTargetNode) return;

    if (actionType === 'emerald') {
      currentTargetNode.style.transition = 'all 0.4s ease';
      currentTargetNode.style.backgroundColor = 'var(--success-emerald)';
      currentTargetNode.style.borderColor = 'var(--success-emerald)';
      if (currentTargetNode.tagName === 'BUTTON') currentTargetNode.style.color = '#ffffff';
      
      const payload = JSON.parse(payloadOutput.innerHTML || '{}');
      payload.aiAction = "applied_style_update";
      payload.diff = "+ backgroundColor: '#10b981'";
      payloadOutput.innerHTML = JSON.stringify(payload, null, 2);
    } else if (actionType === 'hide') {
      currentTargetNode.style.transition = 'all 0.3s ease';
      currentTargetNode.style.opacity = '0.2';
      currentTargetNode.style.filter = 'grayscale(100%)';
    } else {
      currentTargetNode.style.outline = '2px solid var(--primary-blue)';
      setTimeout(() => { currentTargetNode.style.outline = 'none'; }, 1000);
    }

    hideDialog();
  }
});
