import csv, json
from pathlib import Path

root=Path(__file__).parent
with (root/'data'/'artworks.csv').open(encoding='utf-8-sig',newline='') as f:
    rows=list(csv.DictReader(f))
(root/'data'/'artworks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'data'/'artworks.js').write_text('window.ARTWORKS = '+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print(f'{len(rows)}作品を更新しました。')
