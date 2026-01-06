// Enhanced badges page with search, sorting, and pinning
function tierScore(t){if(!t) return 0; if(t==='gold') return 3; if(t==='silver') return 2; if(t==='bronze') return 1; return 0}

let allBadges = [];
let sortMode = 'pinned';
let showUncollected = false;
let query = '';

function saveBadges(badges){
  chrome.storage.local.set({ badges });
}

function compareForSort(a,b){
  // pinned first
  if ((a.pinned?1:0) !== (b.pinned?1:0)) return (b.pinned?1:0) - (a.pinned?1:0);
  // apply current sort
  if (sortMode === 'newest') return (b.dateCollected || 0) - (a.dateCollected || 0);
  if (sortMode === 'oldest') return (a.dateCollected || 0) - (b.dateCollected || 0);
  if (sortMode === 'tier'){
    const ts = tierScore(b.tier) - tierScore(a.tier);
    if (ts !== 0) return ts;
    return (b.dateCollected || 0) - (a.dateCollected || 0);
  }
  // default: pinned (already handled) then tier then newest
  const ts = tierScore(b.tier) - tierScore(a.tier);
  if (ts !== 0) return ts;
  return (b.dateCollected || 0) - (a.dateCollected || 0);
}

function render(badges){
  const col = document.getElementById('collection');
  col.innerHTML = '';
  if(!badges.length){ col.innerHTML = '<div class="empty">No badges match your filters.</div>'; return }

  badges.forEach(b => {
    const div = document.createElement('div');
    div.className = 'badge-card tier-' + (b.tier || 'bronze');

    const img = document.createElement('img');
    img.className = 'badge-img';
    img.src = chrome.runtime.getURL(`badges/${b.tier || 'bronze'}.png`);
    img.alt = b.tier;

    const meta = document.createElement('div'); meta.className='meta';
    // title and description are intentionally hidden from view (keeps surprises)
    const srName = document.createElement('span'); srName.className = 'sr-only'; srName.textContent = b.name || '';
    const tier = document.createElement('div'); tier.className='tier'; tier.textContent = b.tier || '';
    const date = document.createElement('div'); date.className='date'; date.textContent = b.collected ? new Date(b.dateCollected).toLocaleString() : 'Not collected';

    meta.appendChild(srName); meta.appendChild(tier); meta.appendChild(date);

    const actions = document.createElement('div'); actions.className = 'card-actions';
    const pinBtn = document.createElement('button'); pinBtn.className = 'pin-btn'; pinBtn.innerHTML = b.pinned ? '★' : '☆';
    if (b.pinned) pinBtn.classList.add('pinned');
    pinBtn.title = b.pinned ? 'Unpin badge' : 'Pin badge';
    pinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePin(b.id);
    });

    actions.appendChild(pinBtn);

    div.appendChild(img); div.appendChild(meta); div.appendChild(actions);

    col.appendChild(div);
  });
}

function updateCounts(){
  const collected = allBadges.filter(b=>b.collected).length;
  const uncollected = allBadges.filter(b=>!b.collected).length;
  const elC = document.getElementById('collected-count');
  const elU = document.getElementById('uncollected-count');
  if (elC) elC.textContent = `Collected: ${collected}`;
  if (elU) elU.textContent = `Uncollected: ${uncollected}`;
}

function applyFiltersAndRender(){
  const q = query.trim().toLowerCase();
  let list = allBadges.slice();
  if (!showUncollected) list = list.filter(b => b.collected);
  if (q) list = list.filter(b => ((b.name||'')+ ' ' + (b.pattern||'') + ' ' + (b.description||'')).toLowerCase().indexOf(q) !== -1);

  list.sort(compareForSort);
  render(list);
}

function togglePin(id){
  chrome.storage.local.get(['badges'], (res) => {
    const badges = res.badges || [];
    const idx = badges.findIndex(x=>x.id===id);
    if (idx !== -1){
      badges[idx].pinned = !badges[idx].pinned;
      chrome.storage.local.set({ badges }, () => {
        // refresh local cache and UI
        allBadges = badges;
        applyFiltersAndRender();
      });
    }
  });
}

function load(){
  chrome.storage.local.get(['badges'], (res) => {
    allBadges = res.badges || [];
    // ensure pinned property exists
    allBadges.forEach(b=>{ if (typeof b.pinned === 'undefined') b.pinned = false; });
    applyFiltersAndRender();

    // initial counts
    updateCounts();

    // wire control events
    const search = document.getElementById('search');
    const sort = document.getElementById('sort');
    const showUn = document.getElementById('show-uncollected');

    search.addEventListener('input', (e)=>{ query = e.target.value; applyFiltersAndRender(); });
    sort.addEventListener('change', (e)=>{ sortMode = e.target.value; applyFiltersAndRender(); });
    showUn.addEventListener('change', (e)=>{ showUncollected = e.target.checked; applyFiltersAndRender(); });
  });
}

document.addEventListener('DOMContentLoaded', load);
