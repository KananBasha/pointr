/**
 * Pointr Standalone Chrome Extension - Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const connectionPill = document.getElementById('connectionPill');
  const connectionText = document.getElementById('connectionText');
  const tabHostDisplay = document.getElementById('tabHostDisplay');
  const extensionToggle = document.getElementById('extensionToggle');
  const mcpHealthBadge = document.getElementById('mcpHealthBadge');
  const mcpPortInput = document.getElementById('mcpPortInput');
  const mcpDetailText = document.getElementById('mcpDetailText');
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  const previewEmpty = document.getElementById('previewEmpty');
  const previewContent = document.getElementById('previewContent');
  const previewTargetName = document.getElementById('previewTargetName');
  const previewSourcePath = document.getElementById('previewSourcePath');
  const previewIntentText = document.getElementById('previewIntentText');
  const copySnippetBtn = document.getElementById('copySnippetBtn');
  const copyBtnText = document.getElementById('copyBtnText');

  let currentPayload = null;

  // Render Status
  async function refreshStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      if (!response) return;

      const { activeTab, settings, mcpHealth, latestPayload } = response;

      // 1. Tab & Extension status
      if (settings) {
        extensionToggle.checked = settings.enabled !== false;
        if (settings.mcpPort) mcpPortInput.value = settings.mcpPort;
      }

      if (activeTab && activeTab.isDev) {
        if (extensionToggle.checked) {
          connectionPill.className = 'connection-pill status-active';
          connectionText.textContent = `● Active on ${activeTab.host}`;
        } else {
          connectionPill.className = 'connection-pill status-inactive';
          connectionText.textContent = `○ Paused on ${activeTab.host}`;
        }
        tabHostDisplay.textContent = activeTab.host || activeTab.url;
      } else {
        connectionPill.className = 'connection-pill status-inactive';
        connectionText.textContent = '○ Inactive';
        tabHostDisplay.textContent = activeTab?.url
          ? 'Not a local dev server'
          : 'No active tab';
      }

      // 2. MCP Server status
      updateMcpHealthUI(mcpHealth);

      // 3. Latest captured payload
      if (latestPayload) {
        currentPayload = latestPayload;
        renderPreview(latestPayload);
      } else {
        previewEmpty.style.display = 'flex';
        previewContent.style.display = 'none';
      }
    } catch (err) {
      console.error('[Pointr Popup] Failed to get status:', err);
      connectionPill.className = 'connection-pill status-inactive';
      connectionText.textContent = '○ Error loading';
    }
  }

  function updateMcpHealthUI(mcpHealth) {
    if (mcpHealth && mcpHealth.status === 'connected') {
      mcpHealthBadge.className = 'badge badge-online';
      mcpHealthBadge.textContent = `Online (: ${mcpHealth.port})`;
      mcpDetailText.textContent = `Connected (payloads: ${mcpHealth.data?.payloadCount ?? 0})`;
      mcpDetailText.style.color = '#10b981';
    } else {
      mcpHealthBadge.className = 'badge badge-offline';
      mcpHealthBadge.textContent = 'Offline';
      const port = mcpPortInput.value || 3333;
      mcpDetailText.textContent = `Server offline on http://127.0.0.1:${port}`;
      mcpDetailText.style.color = '#64748b';
    }
  }

  function renderPreview(payload) {
    previewEmpty.style.display = 'none';
    previewContent.style.display = 'flex';

    const componentName =
      payload.componentTree?.[0]?.name ||
      (payload.dom?.tagName ? `<${payload.dom.tagName}>` : '<Target>');
    previewTargetName.textContent = componentName;

    const sourceFile = payload.source?.file || 'Runtime DOM';
    const sourceLine = payload.source?.line ? `:${payload.source.line}` : '';
    previewSourcePath.textContent = `${sourceFile}${sourceLine}`;

    previewIntentText.textContent = payload.meta?.intent
      ? `"${payload.meta.intent}"`
      : '"No intent provided"';
  }

  // Toggle Extension Switch
  extensionToggle.addEventListener('change', async () => {
    const enabled = extensionToggle.checked;
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { enabled },
    });
    await refreshStatus();
  });

  // Ping / Test MCP Connection
  testConnectionBtn.addEventListener('click', async () => {
    testConnectionBtn.disabled = true;
    testConnectionBtn.textContent = 'Pinging...';

    const port = parseInt(mcpPortInput.value, 10) || 3333;
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { mcpPort: port },
    });

    const res = await chrome.runtime.sendMessage({
      type: 'CHECK_MCP_HEALTH',
      port,
    });

    updateMcpHealthUI(res);
    testConnectionBtn.disabled = false;
    testConnectionBtn.textContent = 'Ping Server';
  });

  // Save Port on change
  mcpPortInput.addEventListener('change', async () => {
    const port = parseInt(mcpPortInput.value, 10) || 3333;
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { mcpPort: port },
    });
  });

  // Copy Snippet Markdown to Clipboard
  copySnippetBtn.addEventListener('click', async () => {
    if (!currentPayload || !currentPayload.markdown) return;

    try {
      await navigator.clipboard.writeText(currentPayload.markdown);
      copyBtnText.textContent = 'Copied!';
      copySnippetBtn.style.color = '#38bdf8';
      copySnippetBtn.style.borderColor = '#38bdf8';

      setTimeout(() => {
        copyBtnText.textContent = 'Copy';
        copySnippetBtn.style.color = '';
        copySnippetBtn.style.borderColor = '';
      }, 1500);
    } catch (e) {
      console.warn('Failed to copy to clipboard', e);
    }
  });

  // Initial Load
  await refreshStatus();
});
