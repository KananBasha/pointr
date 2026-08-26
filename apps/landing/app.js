// Vanilla JS for Interactive Demo
document.addEventListener('DOMContentLoaded', () => {
  let isAltPressed = false;
  let hoveredElement = null;
  
  const crosshair = document.getElementById('pointr-crosshair');
  const crosshairLabel = document.getElementById('crosshair-label');
  const demoContainer = document.getElementById('demo-container');
  const dialog = document.getElementById('pointr-dialog');
  const payloadOutput = document.getElementById('payload-output');
  const promptInput = document.getElementById('pointr-prompt');
  
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
      demoContainer.style.cursor = 'default';
      hideCrosshair();
      clearHoverStyles();
    }
  });

  // Track Mouse Movement inside demo container
  demoContainer.addEventListener('mousemove', (e) => {
    if (!isAltPressed) return;
    
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
    clearHoverStyles();
    hideCrosshair();
    hoveredElement = null;
  });

  // Handle Alt+Click
  demoContainer.addEventListener('click', (e) => {
    if (!isAltPressed || !hoveredElement) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    showDialog(e.clientX, e.clientY, hoveredElement);
    isAltPressed = false; // Reset to avoid getting stuck
    hideCrosshair();
    clearHoverStyles();
  });

  // Dialog interactions
  document.getElementById('dialog-close').addEventListener('click', hideDialog);
  
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

  let currentTargetNode = null;

  function showDialog(x, y, element) {
    currentTargetNode = element;
    const compName = element.getAttribute('data-component') || element.tagName.toLowerCase();
    const loc = element.getAttribute('data-loc') || '';
    
    document.getElementById('dialog-target-label').innerText = `Target: ${compName} ${loc}`;
    
    // Position dialog safely within viewport
    const dialogWidth = 320;
    const dialogHeight = 150;
    
    let posX = x + 10;
    let posY = y + 10;
    
    if (posX + dialogWidth > window.innerWidth) posX = window.innerWidth - dialogWidth - 20;
    if (posY + dialogHeight > window.innerHeight) posY = window.innerHeight - dialogHeight - 20;

    dialog.style.left = `${posX}px`;
    dialog.style.top = `${posY}px`;
    dialog.classList.remove('hidden');
    
    // Small delay to allow CSS transition
    setTimeout(() => {
      dialog.classList.add('visible');
      promptInput.focus();
    }, 10);
    
    generatePayload(element);
  }

  function hideDialog() {
    dialog.classList.remove('visible');
    setTimeout(() => {
      dialog.classList.add('hidden');
      promptInput.value = '';
    }, 200);
  }

  function generatePayload(element) {
    const compName = element.getAttribute('data-component') || element.tagName.toLowerCase();
    const loc = element.getAttribute('data-loc') || '';
    
    const payload = {
      type: "pointr_target",
      file: compName,
      location: loc,
      domState: {
        tag: element.tagName.toLowerCase(),
        classes: Array.from(element.classList).filter(c => c !== 'pointr-hovered').join(' '),
        innerText: element.innerText.substring(0, 50) + (element.innerText.length > 50 ? '...' : '')
      },
      computedStyle: {
        background: window.getComputedStyle(element).backgroundColor,
        color: window.getComputedStyle(element).color
      }
    };

    payloadOutput.innerHTML = JSON.stringify(payload, null, 2);
  }

  function executeAction(actionType) {
    if (!currentTargetNode) return;

    if (actionType === 'emerald') {
      currentTargetNode.style.transition = 'all 0.5s ease';
      currentTargetNode.style.backgroundColor = 'var(--success-emerald)';
      currentTargetNode.style.borderColor = 'var(--success-emerald)';
      if(currentTargetNode.tagName === 'BUTTON') currentTargetNode.style.color = '#fff';
      
      const payload = JSON.parse(payloadOutput.innerHTML || '{}');
      payload.ai_action = "applied_style_update";
      payload.diff = "+ backgroundColor: '#10b981'";
      payloadOutput.innerHTML = JSON.stringify(payload, null, 2);
    }
    else if (actionType === 'hide') {
      currentTargetNode.style.transition = 'opacity 0.3s ease';
      currentTargetNode.style.opacity = '0.2';
      currentTargetNode.style.pointerEvents = 'none';
      currentTargetNode.style.filter = 'grayscale(100%) dashed';
    }
    else {
      // Custom action visualization
      currentTargetNode.style.outline = '2px solid var(--primary-blue)';
      setTimeout(() => { currentTargetNode.style.outline = 'none'; }, 1000);
    }

    hideDialog();
  }
});
