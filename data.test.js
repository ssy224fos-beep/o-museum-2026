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

test('作品652はA、B2展示室41には最後の晩餐の修復前・修復後が登録される', () => {
  const {json, js} = loadRows();

  for (const rows of [json, js]) {
    assert.equal(rows.find(work => work.number === '652')?.rank, 'A');

    const lastSuppers = rows.filter(work =>
      work.floor === 'B2' &&
      work.room === '41' &&
      ['346-1', '346-2'].includes(work.number)
    );
    assert.deepEqual(
      lastSuppers.map(work => [work.number, work.title, work.rank]),
      [
        ['346-1', '最後の晩餐（修復前）', 'S'],
        ['346-2', '最後の晩餐（修復後）', 'S'],
      ]
    );

    const work349 = rows.find(work => work.number === '349');
    assert.equal(work349?.artist, 'アルブレヒト・デューラー');
    assert.equal(work349?.museum, 'ウィーン美術史美術館');
    assert.equal(work349?.place, 'ウィーン / オーストリア');
  }
});

test('作品317はS、作品479はAランク', () => {
  const {json, js} = loadRows();

  for (const rows of [json, js]) {
    assert.equal(rows.find(work => work.number === '317')?.rank, 'S');
    assert.equal(rows.find(work => work.number === '479')?.rank, 'A');
  }
});

test('残りの作品はDまたはEに分類され、未設定ランクが残らない', () => {
  const {json, js} = loadRows();
  const allowedRanks = new Set(['S', 'A', 'B', 'C', 'D', 'E']);

  assert.equal(json.filter(work => !allowedRanks.has(work.rank)).length, 0, 'JSON');
  assert.equal(js.filter(work => !allowedRanks.has(work.rank)).length, 0, 'JS');
});

test('美術史上重要な作例をD、専門性の高い作例をEに分類する', () => {
  const {json, js} = loadRows();
  const expected = new Map([
    ['8', 'D'],     // 《鳥占い師の墓》
    ['137', 'D'],   // 《聖マルタン聖堂壁画》
    ['138', 'D'],   // 《聖ニコラオス・オルファノス聖堂壁画》
    ['11', 'E'],    // 《コリントス式オルペ》
    ['12', 'E'],    // 《動物のパラダイス》
    ['14', 'E'],    // 《死者の周りを踊る女たち》
  ]);

  for (const [number, rank] of expected) {
    assert.equal(json.find(work => work.number === number)?.rank, rank, `JSON ${number}`);
    assert.equal(js.find(work => work.number === number)?.rank, rank, `JS ${number}`);
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

test('CSV版にも変更内容が同期される', () => {
  const csv = fs.readFileSync(__dirname + '/data/artworks.csv', 'utf8');
  const lines = csv.trim().split(/\r?\n/);

  assert.equal(lines.length, 1084, '見出し1行と作品1,083件');
  assert.ok(lines.includes('B1,71,652,エドガー・ドガ,舞台の踊り子（エトワール）,オルセー美術館,パリ / フランス,,A'));
  assert.ok(lines.includes('B2,41,346-1,レオナルド・ダ・ヴィンチ,最後の晩餐（修復前）,サンタ・マリア・デッレ・グラーツィエ修道院 食堂,ミラノ / イタリア,,S'));
  assert.ok(lines.includes('B2,41,346-2,レオナルド・ダ・ヴィンチ,最後の晩餐（修復後）,サンタ・マリア・デッレ・グラーツィエ修道院 食堂,ミラノ / イタリア,,S'));
  assert.ok(lines.includes('B2,39,317,ピーテル・ブリューゲル（父）,バベルの塔,ウィーン美術史美術館,ウィーン / オーストリア,,S'));
  assert.ok(lines.includes('B2,56,479,ジュゼッペ・アルチンボルド,夏（「四季」より）,ウィーン美術史美術館,ウィーン / オーストリア,,A'));
});
