"""Check seek determinism and save a few frames; not a visual quality judge."""
import argparse,base64,hashlib,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from render import local_url,get_spec

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',type=local_url,default='http://127.0.0.1:8879');p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    if a.output.exists():p.error('output exists; choose a new path')
    a.output.parent.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(headless=True);page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            page.goto(a.url,wait_until='networkidle');page.wait_for_function('window.READY===true')
            spec=get_spec(page);dur=spec['duration'];results=[]
            for i,t in enumerate([0,dur*.2,dur/3,dur*.5,dur*2/3,dur*.85]):
                data=base64.b64decode(page.evaluate('t=>window.captureFrame(t)',t));h=hashlib.sha256(data).hexdigest()
                page.evaluate('t=>window.captureFrame(t)',dur*.92)
                again=base64.b64decode(page.evaluate('t=>window.captureFrame(t)',t))
                fp=a.output.parent/f'{a.output.stem}_{i}.png'
                with fp.open('xb') as out:out.write(data)
                results.append({'time':t,'same_after_seek':h==hashlib.sha256(again).hexdigest(),'png_bytes':len(data),'frame':fp.name})
            passed=not errors and all(x['same_after_seek'] and x['png_bytes']>2000 for x in results)
            a.output.write_text(json.dumps({'status':'PASS_DETERMINISM' if passed else 'FAIL','errors':errors,'samples':results,'scope':'PNG size and same-time hash only; inspect actual pixels separately'},indent=2),encoding='utf8')
            print('PASS_DETERMINISM' if passed else 'FAIL');raise SystemExit(not passed)
        finally:b.close()
if __name__=='__main__':main()
