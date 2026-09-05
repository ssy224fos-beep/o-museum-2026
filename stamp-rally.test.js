const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function loadRally() {
  const context = { window: { ARTWORKS: [], STAMP_IMAGES: {} }, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(__dirname + '/stamp-rally.js', 'utf8'), context);
  return context;
}

test('スタンプラリー用ファイルとトップページの導線がある', () => {
  for (const name of ['stamp-rally.html', 'stamp-rally.css', 'stamp-rally.js', 'data/stamp-images.js']) {
    assert.equal(fs.existsSync(__dirname + '/' + name), true, name);
  }
  assert.match(fs.readFileSync(__dirname + '/index.html', 'utf8'), /href="stamp-rally\.html"/);
});

test('Sランク作品だけを展示順のまま抽出する', () => {
  const context = loadRally();
  context.window.ARTWORKS = [
    { number: '1', rank: 'S' },
    { number: '2', rank: 'A' },
    { number: '3', rank: 'S' },
  ];
  const rows = vm.runInContext('stampWorks(window.ARTWORKS)', context);
  assert.deepEqual(JSON.parse(JSON.stringify(rows.map(row => row.number))), ['1', '3']);
});

test('カードに指定情報・サムネイル・スタンプ欄を表示する', () => {
  const context = loadRally();
  const html = vm.runInContext(`stampCard({
    floor:'B2', room:'30', number:'292', title:'ヴィーナスの誕生', artist:'ボッティチェッリ', rank:'S'
  }, {file:'Birth of Venus Botticelli.jpg', asset:'assets/stamps/292.jpg', license:'Public domain'})`, context);
  assert.match(html, /B2/);
  assert.match(html, /展示室 30/);
  assert.match(html, /作品番号 292/);
  assert.match(html, /ヴィーナスの誕生/);
  assert.match(html, /ボッティチェッリ/);
  assert.match(html, /class="art-thumb"/);
  assert.match(html, /src="assets\/stamps\/292\.jpg"/);
  assert.doesNotMatch(html, /src="https:\/\//);
  assert.doesNotMatch(html, /loading="lazy"/);
  assert.match(html, /alt="ヴィーナスの誕生のサムネイル"/);
  assert.match(html, /class="stamp-space"/);
});

test('印刷ボタンの操作中に同期的に印刷画面を開く', () => {
  const context = loadRally();
  let printed = false;
  context.document = {
    querySelectorAll: () => [{complete:false, addEventListener(){}}]
  };
  context.window.print = () => { printed = true; };

  const result = vm.runInContext(`printRally({disabled:false,textContent:'印刷する'})`, context);

  assert.equal(printed, true);
  assert.equal(result, undefined);
});

test('画像がない作品には印刷可能な代替表示を出す', () => {
  const context = loadRally();
  const html = vm.runInContext(`stampCard({
    floor:'1F 本館', room:'89', number:'951', title:'ゲルニカ', artist:'パブロ・ピカソ', rank:'S'
  })`, context);
  assert.match(html, /class="art-thumb placeholder"/);
  assert.match(html, /画像掲載なし/);
});

test('Sランク作品を6作品ずつ印刷シートに分ける', () => {
  const context = loadRally();
  const works = Array.from({length: 7}, (_, index) => ({
    floor:'B1', room:'60', number:String(index + 1), title:'作品', artist:'作者', rank:'S'
  }));
  context.works = works;
  const html = vm.runInContext('stampSheets(works, {})', context);
  assert.equal((html.match(/class="print-sheet"/g) || []).length, 2);
  assert.equal((html.match(/class="stamp-card"/g) || []).length, 7);
});

test('画像データはゲルニカ以外のSランク作品を網羅する', () => {
  const dataContext = { window: {} };
  vm.createContext(dataContext);
  vm.runInContext(fs.readFileSync(__dirname + '/data/artworks.js', 'utf8'), dataContext);
  vm.runInContext(fs.readFileSync(__dirname + '/data/stamp-images.js', 'utf8'), dataContext);
  const sNumbers = dataContext.window.ARTWORKS.filter(row => row.rank === 'S').map(row => row.number);
  const missing = sNumbers.filter(number => number !== '951' && !dataContext.window.STAMP_IMAGES[number]);
  assert.deepEqual(JSON.parse(JSON.stringify(missing)), []);
  assert.equal(dataContext.window.STAMP_IMAGES['951'], undefined);
  for (const image of Object.values(dataContext.window.STAMP_IMAGES)) {
    assert.ok(image.file);
    assert.match(image.asset, /^assets\/stamps\/[^/]+\.jpg$/);
    assert.equal(fs.existsSync(__dirname + '/' + image.asset), true, image.asset);
    assert.equal(image.license, 'Public domain');
  }
});

test('作品1・463・1088は指定した絵画画像を使う', () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(__dirname + '/data/stamp-images.js', 'utf8'), context);
  assert.equal(context.window.STAMP_IMAGES['1'].file, 'Last Judgement by Michelangelo.jpg');
  assert.equal(context.window.STAMP_IMAGES['463'].file, 'Jan Vermeer - Girl Reading a Letter at an Open Window.JPG');
  assert.equal(context.window.STAMP_IMAGES['1088'].file, 'Vincent Willem van Gogh - Cafe Terrace at Night (Yorck).jpg');
});
