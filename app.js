const labels={ALL:'すべて',B3:'B3 地下3階',B2:'B2 地下2階',B1:'B1 地下1階','1F 本館':'1F 本館','2F 本館':'2F 本館'};
const slugs={ALL:'all.html',B3:'b3.html',B2:'b2.html',B1:'b1.html','1F 本館':'1f.html','2F 本館':'2f.html'};
const githubFileUrl='https://api.github.com/repos/ssy224fos-beep/o-museum-2026/contents/data/links.json';
const floor=document.body.dataset.floor;
let selectedRoom='';
let linkStore={};
let editingNumber='';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function nav(selectedFloor=floor){
  return Object.keys(labels).map(f=>`<a class="${f===selectedFloor?'active':''}" href="${slugs[f]}">${labels[f]}</a>`).join('');
}

function mapAsset(selectedFloor){
  return {'B3':'assets/maps/b3.webp','B2':'assets/maps/b2.webp','B1':'assets/maps/b1.webp','1F 本館':'assets/maps/1f.webp','2F 本館':'assets/maps/2f.webp'}[selectedFloor]||'';
}

function mapOverlayMarkup(selectedFloor){
  const asset=mapAsset(selectedFloor);
  if(!asset)return '';
  const label=labels[selectedFloor]||selectedFloor;
  return `<button class="map-open" type="button" aria-haspopup="dialog">MAP</button><dialog class="map-dialog" aria-label="${esc(label)}のフロアマップ"><div class="map-panel"><div class="map-bar"><h2>${esc(label)} MAP</h2><button class="map-close" type="button" aria-label="マップを閉じる">×</button></div><div class="map-stage"><img src="${asset}" alt="${esc(label)}のフロアマップ"></div></div></dialog>`;
}

function setMapOpen(dialog,opening){
  if(opening)dialog.showModal();
  else dialog.close();
}

function setupMap(){
  if(!document.body.insertAdjacentHTML||!mapAsset(floor))return;
  document.body.insertAdjacentHTML('beforeend',mapOverlayMarkup(floor));
  const dialog=document.querySelector('.map-dialog');
  document.querySelector('.map-open').addEventListener('click',()=>setMapOpen(dialog,true));
  document.querySelector('.map-close').addEventListener('click',()=>setMapOpen(dialog,false));
  dialog.addEventListener('click',event=>{if(event.target===dialog)setMapOpen(dialog,false)});
}

function roomNav(selectedFloor,selected=''){
  if(selectedFloor==='ALL')return '';
  const rooms=[...new Set(window.ARTWORKS.filter(w=>w.floor===selectedFloor&&w.room).map(w=>w.room))].sort((a,b)=>Number(a)-Number(b));
  return `<button type="button" data-room="" class="${selected?'':'active'}">すべて</button>`+rooms.map(room=>`<button type="button" data-room="${esc(room)}"${room===selected?' class="active"':''}>展示室 ${esc(room)}</button>`).join('');
}

function filterWorks(selectedFloor,room,rank,query,youtube=''){
  const q=query.trim().toLowerCase();
  return window.ARTWORKS.filter(w=>{
    const hasYoutube=(w.links||[]).some(link=>linkKind(link.url)==='youtube');
    return (selectedFloor==='ALL'||w.floor===selectedFloor)&&(!room||w.room===room)&&(!rank||(rank==='SA'?['S','A'].includes(w.rank):w.rank===rank))&&(!q||[w.number,w.artist,w.title,w.museum,w.place,w.memo].join(' ').toLowerCase().includes(q))&&(!youtube||(youtube==='yes'?hasYoutube:!hasYoutube));
  });
}

function safeUrl(value){
  try{
    const url=new URL(value);
    return ['http:','https:'].includes(url.protocol)?url:null;
  }catch{
    return null;
  }
}

function linkKind(value){
  const url=safeUrl(value);
  if(!url)return '';
  const host=url.hostname.toLowerCase().replace(/^www\./,'');
  if(host==='youtu.be'||host==='youtube.com'||host.endsWith('.youtube.com'))return 'youtube';
  if(host==='quizknock.com'||host.endsWith('.quizknock.com'))return 'quizknock';
  return 'link';
}

function normalizeLinkList(text){
  const values=String(text??'').split(/\r?\n/).map(value=>value.trim()).filter(Boolean);
  const seen=new Set();
  return values.map(value=>{
    const url=safeUrl(value);
    if(!url)throw new Error('リンクは http または https で始まるURLを入力してください。');
    return url.href;
  }).filter(url=>{
    if(seen.has(url))return false;
    seen.add(url);
    return true;
  }).map(url=>({url}));
}

function normalizeLinkStore(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  const normalized={};
  Object.entries(value).forEach(([number,links])=>{
    if(!Array.isArray(links))return;
    const valid=links.map(link=>safeUrl(link?.url)?.href).filter(Boolean);
    if(valid.length)normalized[String(number)]=[...new Set(valid)].map(url=>({url}));
  });
  return normalized;
}

function applyLinkStore(value){
  linkStore=normalizeLinkStore(value);
  window.ARTWORKS.forEach(work=>{work.links=linkStore[String(work.number)]||[]});
}

function linkBadges(w){
  const labels={youtube:'Y',quizknock:'Q',link:'L'};
  return (w.links||[]).map(item=>{
    const kind=linkKind(item.url);
    const url=safeUrl(item.url);
    if(!kind||!url)return '';
    const name=kind==='youtube'?'YouTube':kind==='quizknock'?'QuizKnock':'関連リンク';
    return `<a class="link-badge ${kind}" href="${esc(url.href)}" target="_blank" rel="noopener noreferrer" aria-label="${name}を開く">${labels[kind]}</a>`;
  }).join('');
}

function rankBadge(rank){
  return rank?`<span class="rank ${rank.toLowerCase()}" aria-label="ランク${esc(rank)}">${esc(rank)}</span>`:'';
}

function wikiLink(w){
  if(!['S','A'].includes(w.rank))return '';
  const query=encodeURIComponent(`${w.title} ${w.artist}`);
  return `<a class="wiki" href="https://ja.wikipedia.org/wiki/Special:Search?search=${query}&go=Go" target="_blank" rel="noopener noreferrer">Wikipediaで見る <span aria-hidden="true">↗</span></a>`;
}

function toggleCard(summary){
  const details=summary.closest?.('.work')?.querySelector('.details')||summary.nextElementSibling;
  const opening=summary.getAttribute('aria-expanded')!=='true';
  summary.setAttribute('aria-expanded',String(opening));
  details.hidden=!opening;
}

function card(w){
  const rc=rankBadge(w.rank);
  return `<article class="work"><button class="work-summary" type="button" aria-expanded="false"><span class="num">${esc(w.number)}</span><span class="work-heading"><span class="work-title">${esc(w.title||'題名記載なし')}</span><span class="artist">${esc(w.artist||'作者名記載なし')}</span></span><span class="chevron" aria-hidden="true">⌄</span></button><span class="work-icons">${rc}${linkBadges(w)}</span><div class="details" hidden><b>${esc(w.museum||'所蔵先記載なし')}</b>${w.place?`<br>${esc(w.place)}`:''}${w.memo?`<br>メモ：${esc(w.memo)}`:''}${wikiLink(w)}<button class="edit-links" type="button" data-number="${esc(w.number)}">管理者用：リンクを編集</button></div></article>`;
}

function render(){
  const rank=document.querySelector('.rank-filter').value;
  const youtube=document.querySelector('.youtube-filter').value;
  const all=floor==='ALL'?window.ARTWORKS:window.ARTWORKS.filter(w=>w.floor===floor);
  const rows=filterWorks(floor,selectedRoom,rank,document.querySelector('.search').value,youtube);
  document.querySelector('.count').innerHTML=`<strong>${rows.length}</strong> / ${all.length}作品`;
  document.querySelector('.works').innerHTML=rows.length?rows.map(card).join(''):'<p class="empty">条件に一致する作品はありません。</p>';
}

function encodeUtf8Base64(value){
  const bytes=new TextEncoder().encode(value);
  let binary='';
  bytes.forEach(byte=>{binary+=String.fromCharCode(byte)});
  return btoa(binary);
}

function githubSaveRequest(token,links,sha){
  const content=JSON.stringify(normalizeLinkStore(links),null,2)+'\n';
  const body={message:'作品リンクを更新',content:encodeUtf8Base64(content),branch:'main'};
  if(sha)body.sha=sha;
  return {url:githubFileUrl,options:{method:'PUT',headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify(body)}};
}

async function saveLinksToGitHub(token,links,fetchImpl=fetch){
  const headers={Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28'};
  const current=await fetchImpl(`${githubFileUrl}?ref=main`,{headers});
  let sha='';
  if(current.ok)sha=(await current.json()).sha||'';
  else if(current.status!==404)throw new Error(`GitHubから現在のデータを取得できませんでした（${current.status}）。`);
  const request=githubSaveRequest(token,links,sha);
  const saved=await fetchImpl(request.url,request.options);
  if(!saved.ok){
    let message='';
    try{message=(await saved.json()).message||''}catch{}
    throw new Error(`GitHubへ保存できませんでした（${saved.status}）${message?`：${message}`:''}`);
  }
  return saved.json();
}

async function loadLinks(fetchImpl=fetch){
  try{
    const response=await fetchImpl(`data/links.json?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)return;
    applyLinkStore(await response.json());
    render();
  }catch(error){
    console.warn('作品リンクを読み込めませんでした。',error);
  }
}

function sessionToken(){
  try{return sessionStorage.getItem('artworkGithubToken')||''}catch{return ''}
}

function setupEditor(){
  if(!document.body.insertAdjacentHTML)return;
  document.body.insertAdjacentHTML('beforeend',`<dialog class="link-dialog"><form class="link-form"><div class="dialog-head"><div><p class="dialog-kicker">管理者用</p><h2 class="dialog-title">作品リンクを編集</h2></div><button class="dialog-close" type="button" aria-label="閉じる">×</button></div><p class="editing-work"></p><label>リンク（1行に1件）<textarea class="link-input" rows="5" inputmode="url" placeholder="https://www.youtube.com/…"></textarea></label><label>GitHub Fine-grained token<input class="token-input" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"></label><p class="token-help">トークンは保存成功後、このタブを閉じるまでだけ保持します。対象リポジトリの Contents: Read and write 権限が必要です。</p><p class="editor-status" role="status"></p><div class="dialog-actions"><button class="dialog-cancel" type="button">閉じる</button><button class="dialog-save" type="submit">GitHubへ保存</button></div></form></dialog>`);
  const dialog=document.querySelector('.link-dialog');
  document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  document.querySelector('.dialog-cancel').addEventListener('click',()=>dialog.close());
  document.querySelector('.link-form').addEventListener('submit',saveEditor);
}

function openEditor(number){
  const dialog=document.querySelector('.link-dialog');
  if(!dialog)return;
  const work=window.ARTWORKS.find(item=>String(item.number)===String(number));
  if(!work)return;
  editingNumber=String(number);
  document.querySelector('.editing-work').textContent=`作品番号 ${work.number}　${work.title||'題名記載なし'}`;
  document.querySelector('.link-input').value=(work.links||[]).map(link=>link.url).join('\n');
  const tokenInput=document.querySelector('.token-input');
  tokenInput.value='';
  tokenInput.placeholder=sessionToken()?'このタブに保存済み（変更時のみ入力）':'github_pat_…';
  document.querySelector('.editor-status').textContent='';
  dialog.showModal();
}

async function saveEditor(event){
  event.preventDefault();
  const tokenInput=document.querySelector('.token-input');
  const token=tokenInput.value.trim()||sessionToken();
  const status=document.querySelector('.editor-status');
  const button=document.querySelector('.dialog-save');
  if(!token){status.textContent='GitHubトークンを入力してください。';return}
  let links;
  try{links=normalizeLinkList(document.querySelector('.link-input').value)}catch(error){status.textContent=error.message;return}
  const next={...linkStore};
  if(links.length)next[editingNumber]=links;
  else delete next[editingNumber];
  button.disabled=true;
  status.textContent='GitHubへ保存しています…';
  try{
    await saveLinksToGitHub(token,next);
    try{sessionStorage.setItem('artworkGithubToken',token)}catch{}
    applyLinkStore(next);
    render();
    status.textContent='保存しました。ほかの端末への反映には数分かかる場合があります。';
    tokenInput.value='';
    tokenInput.placeholder='このタブに保存済み（変更時のみ入力）';
  }catch(error){
    status.textContent=error.message;
  }finally{
    button.disabled=false;
  }
}

const floorNavElement=document.querySelector('.floor-nav');
floorNavElement.innerHTML=nav();
floorNavElement.insertAdjacentHTML('afterend','<nav class="room-nav" aria-label="展示室"></nav>');
const roomNavElement=document.querySelector('.room-nav');
roomNavElement.innerHTML=roomNav(floor);
roomNavElement.hidden=floor==='ALL';
document.querySelector('.page-title').textContent=labels[floor];
document.querySelector('.search').addEventListener('input',render);
document.querySelector('.rank-filter').addEventListener('change',render);
document.querySelector('.youtube-filter').addEventListener('change',render);
roomNavElement.addEventListener('click',event=>{
  const button=event.target.closest('button[data-room]');
  if(!button)return;
  selectedRoom=button.dataset.room;
  document.querySelector('.room-nav').innerHTML=roomNav(floor,selectedRoom);
  render();
});
document.querySelector('.works').addEventListener('click',event=>{
  const edit=event.target.closest('.edit-links');
  if(edit){openEditor(edit.dataset.number);return}
  const summary=event.target.closest('.work-summary');
  if(summary)toggleCard(summary);
});
setupMap();
setupEditor();
render();
if(typeof fetch==='function')loadLinks();
