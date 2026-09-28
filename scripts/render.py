"""Render a trusted loopback Three.js project to a new MP4; no installs/uploads."""
import argparse,base64,json,math,shutil,subprocess,sys,time
from pathlib import Path
from urllib.parse import urlparse

def local_url(value):
    u=urlparse(value)
    if u.scheme!='http' or u.hostname not in ('localhost','127.0.0.1','::1') or u.username or u.password:
        raise argparse.ArgumentTypeError('use a trusted local HTTP URL')
    return value

def get_spec(page):
    spec=page.evaluate('window.videoSpec')
    if not isinstance(spec,dict):raise ValueError('window.videoSpec missing')
    for key in ('width','height'):
        v=spec.get(key)
        if not isinstance(v,int) or isinstance(v,bool) or not 64<=v<=7680 or v%2:raise ValueError(f'invalid {key}')
    fps=spec.get('fps');d=spec.get('duration')
    if not isinstance(fps,int) or not 1<=fps<=120:raise ValueError('invalid fps')
    if not isinstance(d,(int,float)) or not math.isfinite(d) or d<=0:raise ValueError('invalid duration')
    return spec

def audio_duration(path):
    data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type:format=duration','-of','json',str(path)],text=True))
    if not any(s.get('codec_type')=='audio' for s in data.get('streams',[])):raise ValueError('input has no audio stream')
    return float(data['format']['duration'])

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',type=local_url,default='http://127.0.0.1:8879')
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--audio',type=Path)
    p.add_argument('--duration',type=float,help='explicit opening excerpt duration')
    a=p.parse_args()
    if a.output.suffix.lower()!='.mp4':p.error('output must end with .mp4')
    if a.output.exists():p.error('output already exists; choose a new filename')
    if a.duration is not None and (not math.isfinite(a.duration) or a.duration<=0):p.error('duration must be finite and positive')
    for tool in ('ffmpeg','ffprobe'):
        if not shutil.which(tool):p.error(f'{tool} not found on PATH')
    if a.audio and not a.audio.is_file():p.error('audio file does not exist')
    try:from playwright.sync_api import sync_playwright
    except ImportError:p.error('install requirements.txt and Playwright Chromium first')
    a.output.parent.mkdir(parents=True,exist_ok=True)
    report_path=a.output.with_suffix('.render.json');log_path=a.output.with_suffix('.ffmpeg.log')
    if report_path.exists() or log_path.exists():p.error('output sidecar already exists; choose a new filename')
    proc=None
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--hide-scrollbars'])
        try:
            page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            url=a.url+('&' if '?' in a.url else '?')+'render'
            page.goto(url,wait_until='networkidle',timeout=60000)
            page.wait_for_function('window.READY===true',timeout=60000)
            if errors:raise RuntimeError(errors)
            spec=get_spec(page);duration=a.duration if a.duration is not None else spec['duration']
            if duration>spec['duration']+.000001:raise ValueError('excerpt exceeds configured duration')
            if a.audio:
                ad=audio_duration(a.audio)
                if ad<duration-.1:raise ValueError('audio is shorter than output duration')
                if a.duration is None and abs(ad-duration)>.1:raise ValueError('audio/config duration mismatch; fix timeline or request explicit excerpt')
            frames=math.ceil(duration*spec['fps']);start=time.monotonic()
            cmd=['ffmpeg','-v','error','-n','-f','image2pipe','-vcodec','png','-r',str(spec['fps']),'-i','pipe:0']
            if a.audio:cmd+=['-i',str(a.audio.resolve()),'-map','0:v:0','-map','1:a:0','-c:a','aac','-b:a','256k']
            else:cmd+=['-an']
            cmd+=['-t',str(duration),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(a.output.resolve())]
            with log_path.open('x',encoding='utf8') as log:
                proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
                try:
                    for i in range(frames):
                        encoded=page.evaluate('t=>window.captureFrame(t)',i/spec['fps'])
                        if errors:raise RuntimeError(errors)
                        proc.stdin.write(base64.b64decode(encoded,validate=True))
                        if i%spec['fps']==0:print(f'{i}/{frames} frames',flush=True)
                    proc.stdin.close();code=proc.wait(timeout=120)
                    if code:raise RuntimeError(f'FFmpeg failed; inspect {log_path.name}')
                finally:
                    if proc.poll() is None:proc.kill();proc.wait()
            probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type,width,height,r_frame_rate:format=duration,size','-of','json',str(a.output)],text=True))
            subprocess.run(['ffmpeg','-v','error','-i',str(a.output),'-f','null','-'],check=True)
            report={'status':'RENDERED_AND_DECODED','spec':spec,'requested_duration':duration,'frames_requested':frames,'has_audio':bool(a.audio),'elapsed_seconds':round(time.monotonic()-start,2),'probe':probe,'limitations':['No automatic visual aesthetic review','No sung-word timing or listening verification']}
            report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
            print(f'Done: {a.output.name}',flush=True)
        finally:browser.close()

if __name__=='__main__':
    try:main()
    except Exception as exc:print(f'Render failed: {exc}',file=sys.stderr);raise SystemExit(1)
