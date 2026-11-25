(async()=>{
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const RAW='https://raw.githubusercontent.com/jay-yangPY/threejs-music-video/xhs-tmp/kf1/';
window.__N=await (await fetch(RAW+'n7.json',{cache:'no-store'})).json();
const leaf=t=>[...document.querySelectorAll('*')].find(e=>e.children.length==0&&(e.textContent||'').trim()===t);
window.__leaf=leaf;
window.__up=async(k)=>{const r=await fetch(RAW+k+'.mp4',{cache:'no-store'}); if(!r.ok) return 'HTTP '+r.status; const b=await r.blob(); const f=new File([b],'宣传片_'+k+'.mp4',{type:'video/mp4'}); const dt=new DataTransfer(); dt.items.add(f); const inp=document.querySelector('input.upload-input'); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); return 'ok '+b.size;};
window.__cov=async(k)=>{const inp=[...document.querySelectorAll('input[type=file]')].find(i=>/image|jpg|png/.test(i.accept)); if(!inp) return 'noinput'; const r=await fetch(RAW+k+'.jpg',{cache:'no-store'}); const b=await r.blob(); const f=new File([b],'封面_'+k+'.jpg',{type:'image/jpeg'}); const dt=new DataTransfer(); dt.items.add(f); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); return 'ok '+b.size;};
window.__done=async()=>{const b=[...document.querySelectorAll('button, div, span')].filter(e=>e.innerText&&e.innerText.trim()==='完成'&&e.offsetParent); b.length&&b[b.length-1].click(); await sleep(3000); return {eval:/封面效果评估通过/.test(document.body.innerText), modal:/AI修改/.test(document.body.innerText)};};
window.__fillText=async(k)=>{const n=__N.find(x=>x.k===k);
 const ti=document.querySelector('input[placeholder*=标题]'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; ti.focus(); set.call(ti,n.title); ti.dispatchEvent(new Event('input',{bubbles:true})); ti.dispatchEvent(new Event('change',{bubbles:true})); await sleep(300);
 const ed=document.querySelector('[contenteditable=true]'); ed.focus();
 const paras=n.body.split('\n');
 for(let i=0;i<paras.length;i++){ if(paras[i]) document.execCommand('insertText',false,paras[i]); if(i<paras.length-1) document.execCommand('insertParagraph'); await sleep(30);}
 __caretEnd(); document.execCommand('insertParagraph');
 return {title:ti.value, len:ed.innerText.length};};
window.__caretEnd=()=>{const ed=document.querySelector('[contenteditable=true]'); ed.focus(); const r=document.createRange(); r.selectNodeContents(ed); r.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(r);};
window.__tag=async(t)=>{__caretEnd(); document.execCommand('insertText',false,'#'+t); await sleep(4500);
 const items=[...document.querySelectorAll('div.item span.name')]; const hit=items.find(s=>s.innerText.trim()==='#'+t||s.innerText.trim()===t);
 if(hit){hit.closest('div.item').click(); await sleep(600); return 'ok';}
 return 'miss:'+items.slice(0,5).map(s=>s.innerText.trim()).join('|');};
window.__tags=async(k,from,to)=>{const n=__N.find(x=>x.k===k); const res=[]; for(const t of n.tags.slice(from,to)) res.push(t+':'+await __tag(t)); return res;};
window.__coll=async(name)=>{let el=null; for(let i=0;i<12&&!el;i++){el=leaf(name); if(!el){[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+20&&/老师定制/.test(e.textContent)&&e.clientHeight<400).forEach(s=>s.scrollTop+=150); await sleep(400);}}
 if(!el) return 'nofound'; el.scrollIntoView({block:'center'}); (el.closest('[class*=item],li,div')||el).click(); await sleep(800); const t=document.body.innerText; return t.slice(t.indexOf('加入合集')+25,t.indexOf('加入合集')+45);};
window.__setTime=async(v)=>{const inp=[...document.querySelectorAll('input')].find(i=>/^20\d\d-\d\d-\d\d \d\d:\d\d$/.test(i.value)); if(!inp) return 'noinput'; const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; inp.focus(); inp.click(); await sleep(500); set.call(inp,v); inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await sleep(500); inp.blur(); document.body.click(); await sleep(500); return inp.value;};
window.__scroll=t=>{const e=leaf(t); e&&e.scrollIntoView({block:'start'}); return !!e;};
window.__state=()=>{const t=document.body.innerText; return t.slice(t.indexOf('加入合集')+25,t.indexOf('加入合集')+75).replace(/\n/g,'|')+' || '+t.slice(t.indexOf('更多设置'),t.indexOf('更多设置')+40).replace(/\n/g,'|');};
window.__H='ready';
})();
