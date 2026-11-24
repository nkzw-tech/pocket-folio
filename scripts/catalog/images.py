"""Download and optimize genuine language scans from the cached source rosters."""
import concurrent.futures
import json
import subprocess
import time
from pathlib import Path
from fetch import CACHE, EN, JA, DE


def jobs():
    yield 'ja-p-promos-002', 'https://images.scrydex.com/pokemon/miscpp_ja-2/large'
    yield 'ja-p-promos-003', 'https://images.scrydex.com/pokemon/miscpp_ja-3/large'
    yield 'ja-vs-promos-041', 'https://img.cardcorpus.com/s1/960/36d3ae050d1cebade5193bca1f70ace0.avif'
    for sid in EN + JA:
        cards = json.loads((CACHE / f'cards-{sid}.json').read_text())
        lang = cards[0]['set']['language']
        for c in cards:
            yield f'{lang}-{sid.removesuffix("_ja")}-{c["id"].removeprefix(sid+"-")}', c['imageUrlHiRes']
    for sid in DE:
        path = CACHE / f'cards-de-{sid}.json'
        if path.exists():
            for c in json.loads(path.read_text()):
                if c.get('image'):
                    meta = json.loads((CACHE / f'de-set-{sid}.json').read_text())
                    # Mirror only images explicitly available in German at TCGdex.
                    yield f'de-{sid}-{c["localId"]}', f'https://cdn.cardcosmos.de/cards/pokemon-card-de-{meta["serie"]["id"]}-{sid}-{c["localId"]}-high.webp'



def image(job):
    id, url = job
    path = Path(f'.cache/card-assets/files/cards/catalog/{id}.webp')
    if path.exists():
        return
    raw = CACHE / f'{id}.scan'
    source = raw.with_suffix('.png') if url.endswith('.avif') else raw
    for attempt in range(5):
        try:
            # curl's HTTP/2 transport avoids stalls from the image CDN's HTTP/1 clients.
            subprocess.run(['curl','--fail','--silent','--show-error','--max-time','35','--user-agent','PokemonBinderCatalog/1.0',url,'--output',str(raw)], check=True, capture_output=True)
            # cwebp decodes the source: HTML errors and corrupt scans fail validation.
            if source != raw:
                subprocess.run(['magick', f'avif:{raw}', str(source)], check=True, capture_output=True)
            result = subprocess.run(['cwebp','-quiet','-q','84','-resize','0','900',str(source),'-o',str(path)+'.tmp'], capture_output=True)
            if result.returncode:
                raise ValueError(result.stderr.decode()[:180])
            Path(str(path)+'.tmp').replace(path)
            return
        except Exception:
            Path(str(path)+'.tmp').unlink(missing_ok=True)
            if attempt == 4:
                raise
            time.sleep(attempt+1)
        finally:
            raw.unlink(missing_ok=True)
            if source != raw:
                source.unlink(missing_ok=True)


if __name__ == '__main__':
    Path('.cache/card-assets/files/cards/catalog').mkdir(parents=True, exist_ok=True)
    tasks = list(jobs())
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        pending = {pool.submit(image, job): job for job in tasks}
        for index, future in enumerate(concurrent.futures.as_completed(pending),1):
            try:
                future.result()
            except Exception as error:
                failures.append([pending[future][0],str(error)])
            if index % 100 == 0:
                print(f'{index}/{len(tasks)} checked; {len(failures)} failures',flush=True)
    (CACHE / 'image-failures.json').write_text(json.dumps(failures,indent=2))
    print('Complete:',len(tasks),'scans;',len(failures),'failures',flush=True)
    if failures:
        raise SystemExit('Image download failed; see .cache/catalog/image-failures.json')
