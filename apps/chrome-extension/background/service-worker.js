/**
 * Pointr Standalone Chrome Extension - Background Service Worker
 * Manifest V3 compatible, ephemeral-safe (uses chrome.storage.local)
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  mcpPort: 3333,
  hotkey: 'Alt',
  autoInject: true,
};

// Check if a URL belongs to a local development environment
function isLocalDevUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const protocol = parsed.protocol;

    if (protocol !== 'http:' && protocol !== 'https:') return false;

    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    );
  } catch {
    return false;
  }
}

// Update the extension badge and tooltip for a specific tab
async function updateTabBadge(tabId, url) {
  if (!tabId) return;

  const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get('settings');
  const isDev = isLocalDevUrl(url);

  if (isDev && settings.enabled) {
    try {
      const parsed = new URL(url);
      await chrome.action.setBadgeText({ tabId, text: 'ON' });
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#10b981' });
      await chrome.action.setTitle({
        tabId,
        title: `Pointr: Active on ${parsed.host} (Alt+Click element to inspect)`,
      });
    } catch (e) {
      console.warn('[Pointr SW] Failed to set badge:', e);
    }
  } else {
    try {
      await chrome.action.setBadgeText({ tabId, text: '' });
      await chrome.action.setTitle({
        tabId,
        title: isDev
          ? 'Pointr: Disabled (Click popup to enable)'
          : 'Pointr: Inactive (Open http://localhost:* to use)',
      });
    } catch (e) {
      console.warn('[Pointr SW] Failed to clear badge:', e);
    }
  }
}

// Check MCP Server Health
async function checkMcpHealth(port = 3333) {
  const portsToTry = [port, 3333, 3334, 3335];
  const uniquePorts = [...new Set(portsToTry)];

  for (const p of uniquePorts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`http://127.0.0.1:${p}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return { status: 'connected', port: p, data };
      }
    } catch {
      // Continue to next port
    }
  }

  return { status: 'offline', port, data: null };
}

// On install / update initialize settings
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(['settings', 'history']);
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  if (!existing.history) {
    await chrome.storage.local.set({ history: [] });
  }
  console.log('[Pointr SW] Pointr Extension installed & initialized');
});

// Monitor tab navigation updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab?.url) {
    await updateTabBadge(tabId, tab.url);
  }
});

// Monitor tab activation / switching
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab?.url) {
      await updateTabBadge(activeInfo.tabId, tab.url);
    }
  } catch (err) {
    // Tab might have been closed immediately
  }
});

// Centralized message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'GET_STATUS': {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const { settings = DEFAULT_SETTINGS, latestPayload, lastCapturedAt } =
            await chrome.storage.local.get(['settings', 'latestPayload', 'lastCapturedAt']);

          const isDev = activeTab?.url ? isLocalDevUrl(activeTab.url) : false;
          let host = '';
          if (activeTab?.url && isDev) {
            try {
              host = new URL(activeTab.url).host;
            } catch {
              host = 'localhost';
            }
          }

          const mcpHealth = await checkMcpHealth(settings.mcpPort);

          sendResponse({
            activeTab: activeTab
              ? {
                  id: activeTab.id,
                  url: activeTab.url,
                  title: activeTab.title,
                  host,
                  isDev,
                }
              : null,
            settings,
            mcpHealth,
            latestPayload: latestPayload || null,
            lastCapturedAt: lastCapturedAt || null,
          });
          break;
        }

        case 'CHECK_MCP_HEALTH': {
          const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get('settings');
          const port = message.port || settings.mcpPort || 3333;
          const result = await checkMcpHealth(port);
          sendResponse(result);
          break;
        }

        case 'UPDATE_SETTINGS': {
          const { settings: currentSettings = DEFAULT_SETTINGS } =
            await chrome.storage.local.get('settings');
          const newSettings = { ...currentSettings, ...message.settings };
          await chrome.storage.local.set({ settings: newSettings });

          // Update active tab badge
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id && activeTab.url) {
            await updateTabBadge(activeTab.id, activeTab.url);
            // Notify content script of settings update
            try {
              await chrome.tabs.sendMessage(activeTab.id, {
                type: 'SETTINGS_CHANGED',
                settings: newSettings,
              });
            } catch {
              // Content script might not be injected
            }
          }

          sendResponse({ success: true, settings: newSettings });
          break;
        }

        case 'TARGET_CAPTURED': {
          const payload = message.payload;
          const { history = [] } = await chrome.storage.local.get('history');
          const newHistory = [payload, ...history.slice(0, 49)]; // keep latest 50

          await chrome.storage.local.set({
            latestPayload: payload,
            lastCapturedAt: Date.now(),
            history: newHistory,
          });

          // Flash badge on the sender tab to indicate capture success
          if (sender.tab?.id) {
            await chrome.action.setBadgeText({ tabId: sender.tab.id, text: '✓' });
            await chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#06b6d4' });
            setTimeout(async () => {
              if (sender.tab?.id && sender.tab?.url) {
                await updateTabBadge(sender.tab.id, sender.tab.url);
              }
            }, 1500);
          }

          sendResponse({ success: true });
          break;
        }

        case 'INJECT_OVERLAY': {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id && isLocalDevUrl(activeTab.url)) {
            await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['content/overlay-injector.js'],
            });
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, reason: 'Not a local dev tab' });
          }
          break;
        }

        default:
          sendResponse({ error: `Unknown message type: ${message.type}` });
      }
    } catch (err) {
      console.error('[Pointr SW] Error handling message:', err);
      sendResponse({ error: err.message });
    }
  })();

  return true; // Keep channel open for async response
});
