function el(id){return document.getElementById(id)}

function renderBadges(badges){
  const list = el('badges-list');
  list.innerHTML = '';
  badges.forEach(b => {
    const li = document.createElement('li');
    li.className = 'badge-item';
    li.classList.add(`tier-${b.tier || 'bronze'}`);

    const img = document.createElement('img');
    img.className = 'badge-img-small';
    img.src = chrome.runtime.getURL(`badges/${b.tier || 'bronze'}.png`);
    img.alt = b.tier || 'badge';

    const content = document.createElement('div');
    content.innerHTML = `<strong>${b.name}</strong> <em style="opacity:.9">(${b.tier})</em><div class="meta">${b.pattern}</div><div class="desc">${b.description || ''}</div>`;

    li.appendChild(img);
    li.appendChild(content);

    if (b.collected) {
      const date = new Date(b.dateCollected).toLocaleString();
      const d = document.createElement('div'); d.className='collected'; d.textContent = `Collected: ${date}`;
      li.appendChild(d);
      // mark recent collected with a pulse
      li.classList.add('pulse');
      setTimeout(() => li.classList.remove('pulse'), 1200);
    }

    list.appendChild(li);
  });
}

function loadBadges(){
  chrome.storage.local.get(['badges'], (res) => {
    const badges = res.badges || [];
    renderBadges(badges);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadBadges();
  const openBtn = el('open-badges');
  if (openBtn) openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('badges.html') });
  });

  // listen for collected messages to refresh list
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'badgeCollected') loadBadges();
  });
});
