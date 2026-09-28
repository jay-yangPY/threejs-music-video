"""Validate mechanical timing/contract fields, not artistic quality."""
import argparse,json,math
from pathlib import Path

def number(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def validate(plan):
    errors=[]
    if not isinstance(plan,dict):return ['plan must be an object']
    duration=plan.get('duration')
    if not number(duration) or duration<=0:return ['duration must be a finite positive number']
    for key in ('width','height'):
        v=plan.get(key)
        if not isinstance(v,int) or isinstance(v,bool) or v<64 or v>7680 or v%2:errors.append(f'{key} must be even, 64..7680')
    fps=plan.get('fps')
    if not isinstance(fps,int) or isinstance(fps,bool) or not 1<=fps<=120:errors.append('fps must be 1..120')
    if plan.get('audio_status') not in ('silent_demo','source_provided'):errors.append('audio_status must be silent_demo or source_provided')
    if not isinstance(plan.get('listening_verified'),bool):errors.append('listening_verified must be boolean')
    if plan.get('audio_status')=='silent_demo' and plan.get('listening_verified'):errors.append('silent demo cannot establish listening verification')
    shots=plan.get('shots')
    if not isinstance(shots,list) or not shots:return errors+['shots must be a nonempty list']
    previous=0
    for i,shot in enumerate(shots):
        if not isinstance(shot,dict):errors.append(f'shot {i}: object required');continue
        s,e=shot.get('start'),shot.get('end')
        if not number(s) or not number(e) or not 0<=s<e<=duration:errors.append(f'shot {i}: invalid time');continue
        if s<previous:errors.append(f'shot {i}: overlapping or unsorted time')
        previous=e
        if not isinstance(shot.get('text'),str) or not shot['text'].strip():errors.append(f'shot {i}: text required')
        if not isinstance(shot.get('key_phrase'),bool):errors.append(f'shot {i}: key_phrase must be boolean')
        if shot.get('key_phrase'):
            for key in ('meaning','text_action','scene_action','visible_result','camera'):
                if not isinstance(shot.get(key),str) or not shot[key].strip():errors.append(f'shot {i}: {key} required')
    return errors

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('plan',type=Path);args=parser.parse_args()
    try:errors=validate(json.loads(args.plan.read_text(encoding='utf-8-sig')))
    except (OSError,ValueError) as e:parser.exit(2,f'{e}\n')
    print(json.dumps({'status':'FAIL' if errors else 'PASS_STRUCTURE_ONLY','errors':errors},ensure_ascii=False,indent=2))
    raise SystemExit(bool(errors))
if __name__=='__main__':main()
