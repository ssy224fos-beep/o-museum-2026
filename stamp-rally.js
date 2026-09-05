function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
  })[character]);
}

function stampWorks(works) {
  return works.filter(work => work.rank === 'S');
}

function commonsFilePage(file) {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file).replace(/%20/g, '_')}`;
}

function commonsThumb(file) {
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}?width=480`;
}

const STAMP_STORAGE_KEY = 'o-museum-stamps-v1';

function stampCard(work, image, collected = false) {
  const thumbnail = image
    ? `<a class="art-thumb" href="${commonsFilePage(image.file)}" target="_blank" rel="noopener noreferrer" aria-label="画像の出典を開く"><img src="${esc(image.asset)}" alt="${esc(work.title)}のサムネイル"></a>`
    : `<div class="art-thumb placeholder" role="img" aria-label="${esc(work.title)}は画像掲載なし"><span>画像掲載なし</span></div>`;
  return `<article class="stamp-card">
    ${thumbnail}
    <div class="card-copy">
      <div class="location"><strong>${esc(work.floor)}</strong><span>展示室 ${esc(work.room || '—')}</span></div>
      <p class="work-number">作品番号 ${esc(work.number)}</p>
      <h2>${esc(work.title)}</h2>
      <p class="work-artist">${esc(work.artist || '作者不詳')}</p>
    </div>
    <button type="button" class="stamp-space${collected ? ' is-collected' : ''}" data-number="${esc(work.number)}" aria-label="作品番号${esc(work.number)}のスタンプを${collected ? '取り消す' : '押す'}" aria-pressed="${collected}"><span>${collected ? 'GET!' : 'STAMP'}</span></button>
  </article>`;
}

function stampSheets(works, images, state = {}) {
  const pages = [];
  for (let index = 0; index < works.length; index += 6) {
    const cards = works.slice(index, index + 6)
      .map(work => stampCard(work, images[work.number], Boolean(state[work.number])))
      .join('');
    pages.push(`<section class="print-sheet">${cards}</section>`);
  }
  return pages.join('');
}

function parseStampState(raw) {
  try {
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value === true));
  } catch {
    return {};
  }
}

function toggleStampState(state, number) {
  const next = {...state};
  if (next[number]) delete next[number];
  else next[number] = true;
  return next;
}

function filterStampWorks(works, state, filter) {
  if (filter === 'collected') return works.filter(work => state[work.number]);
  if (filter === 'uncollected') return works.filter(work => !state[work.number]);
  return works;
}

function stampProgress(works, state) {
  const done = works.filter(work => state[work.number]).length;
  const total = works.length;
  return {done, total, percent: total ? Math.round(done / total * 100) : 0};
}

function creditRows(works, images) {
  return works.filter(work => images[work.number]).map(work => {
    const image = images[work.number];
    return `<li><a href="${commonsFilePage(image.file)}" target="_blank" rel="noopener noreferrer">作品番号 ${esc(work.number)}「${esc(work.title)}」</a><span>${esc(image.license)} / Wikimedia Commons</span></li>`;
  }).join('');
}

function printRally() {
  window.print();
}

let currentStampState = {};
let currentStampFilter = 'all';

function saveStampState() {
  try {
    localStorage.setItem(STAMP_STORAGE_KEY, JSON.stringify(currentStampState));
  } catch {
    // プライベートブラウズ等で保存できなくても、その場では利用できる。
  }
}

function renderInteractiveRally() {
  const works = stampWorks(window.ARTWORKS || []);
  const visible = filterStampWorks(works, currentStampState, currentStampFilter);
  const images = window.STAMP_IMAGES || {};
  const root = document.querySelector('.rally-root');
  if (root) root.innerHTML = visible.length
    ? stampSheets(visible, images, currentStampState)
    : '<p class="rally-empty">該当する作品はありません。</p>';

  const progress = stampProgress(works, currentStampState);
  const count = document.querySelector('.rally-count');
  if (count) count.textContent = `獲得 ${progress.done} / ${progress.total}`;
  const progressText = document.querySelector('.progress-text');
  if (progressText) progressText.textContent = `${progress.done} / ${progress.total}（${progress.percent}%）`;
  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) progressFill.style.width = `${progress.percent}%`;
  const completion = document.querySelector('.completion-message');
  if (completion) completion.hidden = progress.total === 0 || progress.done !== progress.total;
  document.querySelectorAll('.stamp-filter').forEach(button => {
    const active = button.dataset.filter === currentStampFilter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function initStampRally() {
  const works = stampWorks(window.ARTWORKS || []);
  const images = window.STAMP_IMAGES || {};
  const credits = document.querySelector('.credit-list');
  if (credits) {
    credits.innerHTML = creditRows(works, images);
    return;
  }

  try {
    currentStampState = parseStampState(localStorage.getItem(STAMP_STORAGE_KEY));
  } catch {
    currentStampState = {};
  }
  renderInteractiveRally();

  const root = document.querySelector('.rally-root');
  if (root) root.addEventListener('click', event => {
    const button = event.target.closest('.stamp-space');
    if (!button) return;
    currentStampState = toggleStampState(currentStampState, button.dataset.number);
    saveStampState();
    renderInteractiveRally();
  });
  document.querySelectorAll('.stamp-filter').forEach(button => button.addEventListener('click', () => {
    currentStampFilter = button.dataset.filter;
    renderInteractiveRally();
  }));
  const resetButton = document.querySelector('.reset-stamps');
  if (resetButton) resetButton.addEventListener('click', () => {
    if (!confirm('集めたスタンプをすべて消しますか？')) return;
    currentStampState = {};
    saveStampState();
    renderInteractiveRally();
  });
  const printButton = document.querySelector('.print-button');
  if (printButton) printButton.addEventListener('click', printRally);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStampRally);
  else initStampRally();
}
