"""Cache original English/Japanese set logos; covers also use local set card scans."""
import concurrent.futures
import json
import subprocess
from pathlib import Path
from fetch import CACHE, EN, JA

OUT = Path('.cache/card-assets/files/set-logos')
OUT.mkdir(exist_ok=True)

def logo(sid):
    cards = json.loads((CACHE / f'cards-{sid}.json').read_text())
    meta = cards[0]['set']
    id = f'{meta["language"]}-{sid.removesuffix("_ja")}'
    url = meta.get('logoUrl')
    if not url:
        return None
    target = OUT / f'{id}.webp'
    if not target.exists():
        raw = CACHE / f'logo-{id}.image'
        subprocess.run(['curl','-fsS','--max-time','20','--retry','2',url,'-o',str(raw)],check=True,capture_output=True)
        subprocess.run(['cwebp','-quiet','-q','90',str(raw),'-o',str(target)],check=True,capture_output=True)
        raw.unlink()
    return id, {'image':f'/set-logos/{id}.webp','source':url}

if __name__ == '__main__':
    logos = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(logo,sid):sid for sid in EN+JA}
        for future in concurrent.futures.as_completed(futures):
            try:
                result = future.result()
                if result:
                    logos[result[0]] = result[1]
            except Exception as error:
                print('Card-art fallback:',futures[future],type(error).__name__,flush=True)
    Path('src/catalog/set-covers.json').write_text(json.dumps(dict(sorted(logos.items())),ensure_ascii=False,indent=2)+'\n')
    print('Cached',len(logos),'logos',flush=True)
