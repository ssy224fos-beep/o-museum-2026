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

test('JSON版とJavaScript版の作品データが一致する', () => {
  const {json, js} = loadRows();
  assert.deepEqual(js, json);
});
