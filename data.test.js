const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function loadRows() {
  const json = JSON.parse(fs.readFileSync(__dirname + '/data/artworks.json', 'utf8'));
  const script = fs.readFileSync(__dirname + '/data/artworks.js', 'utf8');
  const js = JSON.parse(script.replace(/^window\.ARTWORKS\s*=\s*/, '').replace(/;\s*$/, ''));
  return {json, js};
}

test('作品463・464・1086は全てSランク', () => {
  const {json, js} = loadRows();
  for (const number of ['463', '464', '1086']) {
    assert.equal(json.find(work => work.number === number)?.rank, 'S', `JSON ${number}`);
    assert.equal(js.find(work => work.number === number)?.rank, 'S', `JS ${number}`);
  }
});

test('未設定作品から選定した作品がCランクとして登録される', () => {
  const {json, js} = loadRows();
  const representativeNumbers = [
    '3',    // エル・グレコ《聖アンデレと聖フランチェスコ》
    '245',  // ジョヴァンニ・ベッリーニ《受胎告知》
    '386',  // レンブラント《瞑想する学者》
    '823',  // ピカソ《自画像》
    '930',  // ウォーホル《10の緑色の惨事》
  ];

  for (const number of representativeNumbers) {
    assert.equal(json.find(work => work.number === number)?.rank, 'C', `JSON ${number}`);
    assert.equal(js.find(work => work.number === number)?.rank, 'C', `JS ${number}`);
  }
});

test('作品612・705・1081は全てAランク', () => {
  const {json, js} = loadRows();
  for (const number of ['612', '705', '1081']) {
    assert.equal(json.find(work => work.number === number)?.rank, 'A', `JSON ${number}`);
    assert.equal(js.find(work => work.number === number)?.rank, 'A', `JS ${number}`);
  }
});

test('既存のS・A・Bランクは変更されない', () => {
  const {json} = loadRows();
  const expected = new Map([
    ['1', 'S'],
    ['5', 'A'],
    ['2', 'B'],
    ['463', 'S'],
    ['464', 'S'],
    ['1086', 'S'],
  ]);

  for (const [number, rank] of expected) {
    assert.equal(json.find(work => work.number === number)?.rank, rank, number);
  }
});

test('JSON版とJavaScript版の作品データが一致する', () => {
  const {json, js} = loadRows();
  assert.deepEqual(js, json);
});
