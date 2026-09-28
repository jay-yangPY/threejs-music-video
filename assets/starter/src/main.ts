import * as THREE from 'three';
import {World} from './world';
import {ExpandedWorld} from './expanded';
import config from './config.json';

type Cue={start:number;end:number;text:string;scene:number;action:string};
const cues:Cue[]=config.cues;
function validConfig(){
 if(!Number.isFinite(config.duration)||config.duration<=0)throw Error('duration must be positive');
 if(!Number.isInteger(config.fps)||config.fps<1||config.fps>120)throw Error('fps must be 1..120');
 for(const n of [config.width,config.height])if(!Number.isInteger(n)||n<64||n>7680||n%2)throw Error('width/height must be even integers, 64..7680');
 let end=0;
 for(const q of cues){
  if(!Number.isFinite(q.start)||!Number.isFinite(q.end)||q.start<end||q.end<=q.start||q.end>config.duration)throw Error('cue times invalid');
  if(!q.text.trim()||Array.from(q.text).length>24)throw Error('demo text must contain 1..24 characters; split long lyrics');
  if(!Number.isInteger(q.scene)||q.scene<0||q.scene>9)throw Error('scene must be 0..9');
  if(!['fold','scatter','rise'].includes(q.action))throw Error('unsupported action');
  end=q.end;
 }
 if(!cues.length)throw Error('at least one cue required');
 if(config.audio && !String(config.audio).startsWith('/audio/'))throw Error('audio must be a local /audio/ path');
}
validConfig();
const canvas=document.querySelector<HTMLCanvasElement>('#screen')!;
canvas.width=config.width;canvas.height=config.height;
const world=new World(canvas),expanded=new ExpandedWorld(world);
await document.fonts.load('900 196px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',cues.map(q=>q.text).join(''));
await document.fonts.ready;
const blocks=cues.map(cue=>{
 const root=new THREE.Group();
 Array.from(cue.text).forEach(char=>{
  const image=document.createElement('canvas');image.width=image.height=256;
  const ctx=image.getContext('2d')!;
  ctx.font='900 196px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#eee9df';ctx.fillText(char,128,135);
  const texture=new THREE.CanvasTexture(image);texture.colorSpace=THREE.SRGBColorSpace;
  const glyph=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthTest:true,depthWrite:false}));
  root.add(glyph);
 });
 world.scene.add(root);return root;
});
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{x=clamp(x);return x*x*(3-2*x)};
const pos=new THREE.Vector3();

function render(t:number){
 if(!Number.isFinite(t))throw Error('frame time must be finite');
 t=Math.max(0,Math.min(config.duration-1e-6,t));
 const ix=cues.findIndex(q=>q.start<=t&&t<q.end);
 blocks.forEach(b=>b.visible=false);
 if(ix<0){expanded.hide();world.groups.forEach(g=>g.visible=false);world.morph.visible=false;world.renderer.render(world.scene,world.camera);return;}
 const cue=cues[ix],p=(t-cue.start)/(cue.end-cue.start);
 // Demo energy is synthetic. Replace with measured envelope for real music.
 const energy=.2+.15*Math.sin(t*Math.PI*2);
 expanded.render(t,cue.scene,p,energy);
 const root=blocks[ix];root.visible=true;
 // Camera-relative starting placement; glyphs then perform simple spatial transforms.
 pos.set(0,.16,-.8).applyQuaternion(world.camera.quaternion).add(world.camera.position);
 root.position.copy(pos);root.quaternion.copy(world.camera.quaternion);root.scale.setScalar(.08*Math.min(1,9/Array.from(cue.text).length));
 const k=smooth((p-.18)/.52);
 root.children.forEach((glyph,i)=>{
  const x=(i-(root.children.length-1)/2)*1.55;
  glyph.position.set(x,0,0);glyph.rotation.set(0,0,0);glyph.scale.setScalar(1);
  if(cue.action==='fold'){glyph.rotation.y=(i%2?-1:1)*k*1.05;glyph.position.x=x*(1-k*.3);glyph.position.z=-Math.abs(x)*k*.35;}
  if(cue.action==='scatter'){const a=i*2.399+1;glyph.position.add(new THREE.Vector3(Math.cos(a)*k*2.2,Math.sin(a)*k*1.3,-k*(i%3)));glyph.rotation.z=Math.sin(i+1)*k*.4;}
  if(cue.action==='rise'){glyph.position.y=-1.2+smooth((p-i*.08)/.55)*2;glyph.scale.setScalar(.6+smooth(p/.55)*.4);}
 });
 world.renderer.render(world.scene,world.camera);
}

const api=window as any;
api.videoSpec={width:config.width,height:config.height,fps:config.fps,duration:config.duration};
api.captureFrame=(t:number)=>{render(t);return canvas.toDataURL('image/png').split(',')[1]};
api.seekFrame=render;api.READY=true;render(0);
if(location.search.includes('render'))document.documentElement.classList.add('render');
const seek=document.querySelector<HTMLInputElement>('#seek')!,button=document.querySelector<HTMLButtonElement>('#play')!,clock=document.querySelector('#clock')!;
seek.max=String(config.duration);seek.value='0';
const audio=config.audio?new Audio(String(config.audio)):null;
if(audio)document.querySelector('#mode')!.textContent='本地音频';
let playing=false,current=0,origin=0;
function pause(){playing=false;audio?.pause();button.textContent='播放';}
seek.oninput=()=>{pause();current=Number(seek.value);if(audio)audio.currentTime=current;render(current);clock.textContent=current.toFixed(2)};
button.onclick=async()=>{
 if(playing){pause();return;}
 if(current>=config.duration){current=0;seek.value='0';}
 try{if(audio){audio.currentTime=current;await audio.play();}origin=performance.now()/1000-current;playing=true;button.textContent='暂停';}catch(e){const el=document.querySelector<HTMLPreElement>('#error')!;el.hidden=false;el.textContent=String(e);}
};
function tick(){if(playing){current=audio?audio.currentTime:performance.now()/1000-origin;if(current>=config.duration||audio?.ended){current=config.duration;pause();}render(current);seek.value=String(current);clock.textContent=current.toFixed(2);}requestAnimationFrame(tick)}
requestAnimationFrame(tick);
