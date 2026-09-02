const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function loadApp() {
  const elements = Object.fromEntries(
    ['.search','.rank-filter','.count','.works','.floor-nav','.room-nav','.page-title'].map(k => [k, {
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
