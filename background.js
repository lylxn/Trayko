// background service worker: load badges from badges.txt and sync with storage
async function fetchBadgesFile() {
  try {
    const url = chrome.runtime.getURL('badges.txt');
    const r = await fetch(url);
    if (!r.ok) return [];
    const text = await r.text();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));

    function parseLine(line) {
      const parts = line.split('-');
      if (parts.length < 4) return null;
      const pattern = parts[0].trim();
      const tier = parts[parts.length - 1].trim().toLowerCase();
      const name = parts[1].trim();
      const description = parts.slice(2, parts.length - 1).join('-').trim();
      const id = encodeURIComponent(pattern + '|' + name);
      return { id, pattern, name, description, tier, collected: false, dateCollected: null };
    }

    return lines.map(parseLine).filter(Boolean);
  } catch (e) {
    console.error('Failed to load badges.txt', e);
    return [];
  }
}

function syncBadgesWithFile(fileBadges) {
  chrome.storage.local.get(['badges'], (res) => {
    const existing = res.badges || [];
    const map = new Map();
    existing.forEach(b => map.set(b.id, b));

    const merged = fileBadges.map(b => {
      const ex = map.get(b.id);
      if (ex) {
        b.collected = !!ex.collected;
        b.dateCollected = ex.dateCollected || null;
      }
      return b;
    });

    chrome.storage.local.set({ badges: merged });
  });
}

async function refreshBadgesFromFile() {
  const fileBadges = await fetchBadgesFile();
  syncBadgesWithFile(fileBadges);
}

chrome.runtime.onInstalled.addListener(() => {
  refreshBadgesFromFile();
});

chrome.runtime.onStartup && chrome.runtime.onStartup.addListener(() => {
  refreshBadgesFromFile();
});

// message bridge
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;
  if (msg.type === 'getBadges') {
    chrome.storage.local.get(['badges'], (res) => sendResponse(res.badges || []));
    return true;
  }

  if (msg.type === 'reloadBadges') {
    refreshBadgesFromFile();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'badgeCollected') {
    // optionally handle analytics or other reactions
    return;
  }
});

