const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function loadApp() {
  const elements = Object.fromEntries(
    ['.search','.rank-filter','.youtube-filter','.count','.works','.floor-nav','.room-nav','.page-title'].map(k => [k, {
      value:'', innerHTML:'', textContent:'',
      addEventListener(type, handler){ this[type]=handler; },
      insertAdjacentHTML(position,html){ this.inserted={position,html}; }
    }])
  );
  const context = {
    window:{ARTWORKS:[]},
    document:{body:{dataset:{floor:'B3'}},querySelector:s=>elements[s]},
    URL, TextEncoder, btoa, atob,
    console
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(__dirname + '/app.js','utf8'), context);
  return {context,elements};
}

test('一覧では詳細を隠し、作品全体を開くボタンとして表示する', () => {
  const {context} = loadApp();
  const html = vm.runInContext(`card({number:'1',title:'作品',artist:'作者',museum:'美術館',place:'都市 / 国',memo:'',rank:'S'})`, context);
  assert.match(html, /<button class="work-summary"[^>]*aria-expanded="false"/);
  assert.match(html, /<div class="details" hidden>/);
  assert.match(html, /Wikipediaで見る/);
});

test('WikipediaボタンはS・Aランクだけに表示する', () => {
  const {context} = loadApp();
  const s = vm.runInContext(`wikiLink({title:'作品S',artist:'作者',rank:'S'})`, context);
  const a = vm.runInContext(`wikiLink({title:'作品A',artist:'作者',rank:'A'})`, context);
  const b = vm.runInContext(`wikiLink({title:'作品B',artist:'作者',rank:'B'})`, context);

  assert.match(s, /Wikipediaで見る/);
  assert.match(a, /Wikipediaで見る/);
  assert.equal(b, '');
});

test('選択中フロアに存在する展示室番号だけをボタン表示する', () => {
  const {context} = loadApp();
  const works = [
    {floor:'B3',room:'1'}, {floor:'B3',room:'2'}, {floor:'B3',room:'2'},
    {floor:'B2',room:'28'}
  ];
  context.window.ARTWORKS = works;
  const html = vm.runInContext(`roomNav('B3','2')`, context);
  assert.match(html, />すべて</);
  assert.match(html, /data-room="1"/);
  assert.match(html, /data-room="2"[^>]*class="active"/);
  assert.doesNotMatch(html, /data-room="28"/);
});

test('展示室・ランク・キーワードを組み合わせて絞り込む', () => {
  const {context} = loadApp();
  const works = [
    {floor:'B3',room:'1',rank:'S',title:'作品A',artist:'作者',number:'1',museum:'',place:'',memo:''},
    {floor:'B3',room:'2',rank:'S',title:'作品B',artist:'作者',number:'2',museum:'',place:'',memo:''},
    {floor:'B3',room:'2',rank:'A',title:'作品A',artist:'作者',number:'3',museum:'',place:'',memo:''}
  ];
  context.window.ARTWORKS = works;
  const rows = vm.runInContext(`filterWorks('B3','2','S','作品B')`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(rows.map(w=>w.number))), ['2']);
});

test('「S と A」でS・A両方の作品だけを絞り込む', () => {
  const {context} = loadApp();
  context.window.ARTWORKS = [
    {floor:'B3',room:'2',rank:'S',title:'作品S',artist:'作者',number:'1',museum:'',place:'',memo:''},
    {floor:'B3',room:'2',rank:'A',title:'作品A',artist:'作者',number:'2',museum:'',place:'',memo:''},
    {floor:'B3',room:'2',rank:'B',title:'作品B',artist:'作者',number:'3',museum:'',place:'',memo:''},
    {floor:'B2',room:'28',rank:'S',title:'別フロア',artist:'作者',number:'4',museum:'',place:'',memo:''}
  ];

  const rows = vm.runInContext(`filterWorks('B3','2','SA','')`, context);

  assert.deepEqual(JSON.parse(JSON.stringify(rows.map(w=>w.number))), ['1','2']);
});

test('全フロアからYouTubeリンクの有無で絞り込む', () => {
  const {context} = loadApp();
  const works = [
    {floor:'B3',room:'1',rank:'S',title:'作品A',artist:'作者',number:'1',museum:'',place:'',memo:'',links:[{url:'https://youtu.be/abc'}]},
    {floor:'B2',room:'28',rank:'A',title:'作品B',artist:'作者',number:'2',museum:'',place:'',memo:'',links:[{url:'https://example.com'}]},
    {floor:'1F 本館',room:'87',rank:'C',title:'作品C',artist:'作者',number:'3',museum:'',place:'',memo:'',links:[]}
  ];
  context.window.ARTWORKS = works;

  const withYoutube = vm.runInContext(`filterWorks('ALL','','','','yes')`, context);
  const withoutYoutube = vm.runInContext(`filterWorks('ALL','','','','no')`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(withYoutube.map(w=>w.number))), ['1']);
  assert.deepEqual(JSON.parse(JSON.stringify(withoutYoutube.map(w=>w.number))), ['2','3']);
});

test('フロアナビの先頭に「すべて」を表示し、選択中にする', () => {
  const {context} = loadApp();
  const html = vm.runInContext(`nav('ALL')`, context);
  assert.match(html, /^<a class="active" href="all\.html">すべて<\/a>/);
  assert.equal((html.match(/<a /g)||[]).length, 6);
});

test('全フロア表示では展示室ナビとMAPを表示しない', () => {
  const {context} = loadApp();
  assert.equal(vm.runInContext(`roomNav('ALL')`, context), '');
  assert.equal(vm.runInContext(`mapOverlayMarkup('ALL')`, context), '');
});

test('C・D・Eにも判別可能なランクアイコンを表示する', () => {
  const {context} = loadApp();
  for (const rank of ['C','D','E']) {
    const html = vm.runInContext(`rankBadge('${rank}')`, context);
    assert.match(html, new RegExp(`class="rank ${rank.toLowerCase()}"`));
    assert.match(html, new RegExp(`aria-label="ランク${rank}"`));
    assert.match(html, new RegExp(`>${rank}<\\/span>`));
  }
});

test('全フロアページとYouTubeフィルターを各一覧ページに備える', () => {
  const pageNames = ['all.html','b3.html','b2.html','b1.html','1f.html','2f.html'];
  for (const pageName of pageNames) {
    const html = fs.readFileSync(__dirname + '/' + pageName, 'utf8');
    assert.match(html, /class="youtube-filter"/, pageName);
    assert.match(html, /value="yes">YouTubeあり/, pageName);
    assert.match(html, /value="no">YouTubeなし/, pageName);
  }
  assert.match(fs.readFileSync(__dirname + '/all.html', 'utf8'), /data-floor="ALL"/);
});

test('各作品一覧ページで「S と A」を選択できる', () => {
  const pageNames = ['all.html','b3.html','b2.html','b1.html','1f.html','2f.html'];
  for (const pageName of pageNames) {
    const html = fs.readFileSync(__dirname + '/' + pageName, 'utf8');
    assert.match(html, /<option value="SA">S と A<\/option>/, pageName);
  }
});

test('トップページの作品数は最後の晩餐2作品を含む', () => {
  const index = fs.readFileSync(__dirname + '/index.html', 'utf8');
  assert.match(index, /全フロア・1,083作品/);
  assert.match(index, /地下2階・246作品/);
});

test('作品を開くと所蔵先を表示し、もう一度押すと閉じる', () => {
  const {context} = loadApp();
  const details = {hidden:true};
  const summary = {
    attrs:{'aria-expanded':'false'},
    getAttribute(name){return this.attrs[name]},
    setAttribute(name,value){this.attrs[name]=value},
    nextElementSibling:details
  };
  vm.runInContext('toggleCard', context)(summary);
  assert.equal(summary.attrs['aria-expanded'],'true');
  assert.equal(details.hidden,false);
  vm.runInContext('toggleCard', context)(summary);
  assert.equal(summary.attrs['aria-expanded'],'false');
  assert.equal(details.hidden,true);
});

test('リンク先をYouTube・QuizKnock・その他に分類する', () => {
  const {context} = loadApp();
  assert.equal(vm.runInContext(`linkKind('https://youtu.be/abc')`, context), 'youtube');
  assert.equal(vm.runInContext(`linkKind('https://www.youtube.com/watch?v=abc')`, context), 'youtube');
  assert.equal(vm.runInContext(`linkKind('https://web.quizknock.com/example')`, context), 'quizknock');
  assert.equal(vm.runInContext(`linkKind('https://example.com/article')`, context), 'link');
});

test('ランクの横にリンク種別のアイコンを安全な外部リンクとして表示する', () => {
  const {context} = loadApp();
  const html = vm.runInContext(`card({number:'1',title:'作品',artist:'作者',museum:'',place:'',memo:'',rank:'S',links:[
    {url:'https://youtu.be/abc'},
    {url:'https://web.quizknock.com/example'},
    {url:'https://example.com/article'}
  ]})`, context);
  assert.match(html, /class="link-badge youtube"[^>]*>Y<\/a>/);
  assert.match(html, /class="link-badge quizknock"[^>]*>Q<\/a>/);
  assert.match(html, /class="link-badge link"[^>]*>L<\/a>/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /<span class="work-icons">[\s\S]*class="rank s"[\s\S]*class="link-badge youtube"/);
});

test('入力欄の複数リンクを検証して重複を除く', () => {
  const {context} = loadApp();
  const links = vm.runInContext(`normalizeLinkList('https://youtu.be/abc\\nhttps://youtu.be/abc\\nhttps://web.quizknock.com/test')`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(links)), [
    {url:'https://youtu.be/abc'},
    {url:'https://web.quizknock.com/test'}
  ]);
  assert.throws(() => vm.runInContext(`normalizeLinkList('javascript:alert(1)')`, context), /http/);
});

test('リンクデータを作品番号に対応させてマージする', () => {
  const {context} = loadApp();
  const works = [{number:'1',title:'作品1'},{number:'2',title:'作品2'}];
  context.window.ARTWORKS = works;
  vm.runInContext(`applyLinkStore({'1':[{url:'https://youtu.be/abc'}]})`, context);
  assert.deepEqual(JSON.parse(JSON.stringify(works[0].links)), [{url:'https://youtu.be/abc'}]);
  assert.deepEqual(JSON.parse(JSON.stringify(works[1].links)), []);
});

test('GitHub保存リクエストは専用JSONだけをmainブランチへ更新する', () => {
  const {context} = loadApp();
  const request = vm.runInContext(`githubSaveRequest('github_pat_test', {'1':[{url:'https://youtu.be/abc'}]}, 'file-sha')`, context);
  const body = JSON.parse(request.options.body);
  assert.equal(request.url, 'https://api.github.com/repos/ssy224fos-beep/o-museum-2026/contents/data/links.json');
  assert.equal(request.options.method, 'PUT');
  assert.equal(request.options.headers.Authorization, 'Bearer github_pat_test');
  assert.equal(body.branch, 'main');
  assert.equal(body.sha, 'file-sha');
  assert.deepEqual(JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')), {'1':[{url:'https://youtu.be/abc'}]});
});

test('作品詳細に管理者用のリンク編集ボタンを表示する', () => {
  const {context} = loadApp();
  const html = vm.runInContext(`card({number:'10',title:'作品',artist:'作者',museum:'',place:'',memo:'',rank:'A',links:[]})`, context);
  assert.match(html, /class="edit-links"[^>]*data-number="10"/);
});

test('各フロアを専用のマップ画像へ対応させる', () => {
  const {context} = loadApp();
  const expected = {
    B3:'assets/maps/b3.webp',
    B2:'assets/maps/b2.webp',
    B1:'assets/maps/b1.webp',
    '1F 本館':'assets/maps/1f.webp',
    '2F 本館':'assets/maps/2f.webp'
  };
  for (const [selectedFloor,path] of Object.entries(expected)) {
    assert.equal(vm.runInContext(`mapAsset(${JSON.stringify(selectedFloor)})`, context), path);
  }
});

test('現在のフロア用MAPボタンとオーバーレイを生成する', () => {
  const {context} = loadApp();
  const html = vm.runInContext(`mapOverlayMarkup('B3')`, context);
  assert.match(html, /class="map-open"[^>]*>MAP<\/button>/);
  assert.match(html, /<dialog class="map-dialog"/);
  assert.match(html, /src="assets\/maps\/b3\.webp"/);
  assert.match(html, /alt="B3 地下3階のフロアマップ"/);
  assert.match(html, /class="map-close"/);
});

test('MAPオーバーレイを開閉する', () => {
  const {context} = loadApp();
  const dialog = {
    opened:false,
    showModal(){this.opened=true},
    close(){this.opened=false}
  };
  const setMapOpen = vm.runInContext('setMapOpen', context);
  setMapOpen(dialog,true);
  assert.equal(dialog.opened,true);
  setMapOpen(dialog,false);
  assert.equal(dialog.opened,false);
});
