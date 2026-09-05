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

function stampCard(work, image) {
  const thumbnail = image
    ? `<a class="art-thumb" href="${commonsFilePage(image.file)}" target="_blank" rel="noopener noreferrer" aria-label="画像の出典を開く"><img src="${esc(image.asset)}" alt="${esc(work.title)}のサムネイル" loading="lazy"></a>`
    : `<div class="art-thumb placeholder" role="img" aria-label="${esc(work.title)}は画像掲載なし"><span>画像掲載なし</span></div>`;
  return `<article class="stamp-card">
    ${thumbnail}
    <div class="card-copy">
      <div class="location"><strong>${esc(work.floor)}</strong><span>展示室 ${esc(work.room || '—')}</span></div>
      <p class="work-number">作品番号 ${esc(work.number)}</p>
      <h2>${esc(work.title)}</h2>
      <p class="work-artist">${esc(work.artist || '作者不詳')}</p>
    </div>
    <div class="stamp-space" aria-label="スタンプ押下用スペース"><span>STAMP</span></div>
  </article>`;
}

function stampSheets(works, images) {
  const pages = [];
  for (let index = 0; index < works.length; index += 6) {
    const cards = works.slice(index, index + 6)
      .map(work => stampCard(work, images[work.number]))
      .join('');
    pages.push(`<section class="print-sheet">${cards}</section>`);
  }
  return pages.join('');
}

function creditRows(works, images) {
  return works.filter(work => images[work.number]).map(work => {
    const image = images[work.number];
    return `<li><a href="${commonsFilePage(image.file)}" target="_blank" rel="noopener noreferrer">作品番号 ${esc(work.number)}「${esc(work.title)}」</a><span>${esc(image.license)} / Wikimedia Commons</span></li>`;
  }).join('');
}

async function printRally(button) {
  const images = [...document.querySelectorAll('.art-thumb img')];
  button.disabled = true;
  button.textContent = '画像を準備中…';
  await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
    img.addEventListener('load', resolve, {once:true});
    img.addEventListener('error', resolve, {once:true});
  })));
  button.disabled = false;
  button.textContent = '印刷する';
  window.print();
}

function initStampRally() {
  const works = stampWorks(window.ARTWORKS || []);
  const images = window.STAMP_IMAGES || {};
  const root = document.querySelector('.rally-root');
  if (root) root.innerHTML = stampSheets(works, images);
  const count = document.querySelector('.rally-count');
  if (count) count.textContent = `${works.length}作品・${Math.ceil(works.length / 6)}ページ`;
  const credits = document.querySelector('.credit-list');
  if (credits) credits.innerHTML = creditRows(works, images);
  const printButton = document.querySelector('.print-button');
  if (printButton) printButton.addEventListener('click', () => printRally(printButton));
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStampRally);
  else initStampRally();
}
