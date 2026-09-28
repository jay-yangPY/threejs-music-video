"""Audit the curated text payload for machine paths, secrets and large assets."""
import json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SKIP={'.git','node_modules','dist','output','__pycache__','.venv'}

def main():
    errors=[];files=[]
    for p in ROOT.rglob('*'):
        rel=p.relative_to(ROOT)
        if any(part in SKIP for part in rel.parts):continue
        if p.is_symlink():errors.append(f'linked path: {rel}');continue
        if not p.is_file():continue
        files.append(rel.as_posix())
        if p.stat().st_size>2_000_000:errors.append(f'oversize file: {rel}');continue
        if p.suffix.lower() in {'.mp3','.wav','.mp4','.mov','.webm','.ttf','.otf','.exe','.dll'}:errors.append(f'non-code asset: {rel}');continue
        try:text=p.read_text(encoding='utf-8-sig')
        except UnicodeDecodeError:errors.append(f'non UTF-8 file: {rel}');continue
        if re.search(r'[A-Za-z]:[\\/](?:Users|个人运营|老杨)',text):errors.append(f'personal absolute path: {rel}')
        if re.search(r'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9]{32,}|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY',text):errors.append(f'credential-like text: {rel}')
        if p.name.startswith('.env'):errors.append(f'environment file: {rel}')
    print(json.dumps({'status':'PASS_PAYLOAD_SCAN' if not errors else 'FAIL','files':len(files),'errors':errors,'scope':'targeted patterns, not a security guarantee'},ensure_ascii=False,indent=2))
    return bool(errors)
if __name__=='__main__':raise SystemExit(main())
