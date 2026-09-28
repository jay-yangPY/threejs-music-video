"""Replay the starter's historical empty-cue seek bug without editing config."""
import argparse,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
from render import local_url
ROOT=Path(__file__).resolve().parents[1]

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',type=local_url,default='http://127.0.0.1:8879')
    a=p.parse_args()
    config=json.loads((ROOT/'assets/starter/src/config.json').read_text(encoding='utf8'))
    config['cues'][1]['start']=5
    intercepted=[]
    with sync_playwright() as pw:
        b=pw.chromium.launch(headless=True)
        try:
            page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            def replace(route):
                intercepted.append(True)
                route.fulfill(status=200,content_type='application/javascript',body='export default '+json.dumps(config))
            page.route('**/src/config.json?import',replace)
            page.goto(a.url,wait_until='networkidle');page.wait_for_function('window.READY===true')
            if not intercepted:raise RuntimeError('requires the supplied starter Vite dev server, not a production build')
            pairs=[]
            for t,via in [(1,4.5),(4.5,1),(5.5,4.5),(4.5,11.9)]:
                first=page.evaluate('t=>window.captureFrame(t)',t)
                page.evaluate('t=>window.captureFrame(t)',via)
                again=page.evaluate('t=>window.captureFrame(t)',t)
                pairs.append({'time':t,'via':via,'identical':first==again})
            passed=not errors and all(row['identical'] for row in pairs)
            print(json.dumps({'status':'PASS_GAP_REPLAY' if passed else 'FAIL','pairs':pairs,'errors':errors},indent=2))
            return not passed
        finally:b.close()
if __name__=='__main__':raise SystemExit(main())
