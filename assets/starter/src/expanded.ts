import * as THREE from 'three';
import type {World} from './world';

const TAU=Math.PI*2;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
const seed=(i:number)=>{const x=Math.sin(i*73.173+1.39)*49137.3;return x-Math.floor(x);};
const O=0xf27031,I=0xc8c3b1,D=0x202522;

export class ExpandedWorld {
  public root=new THREE.Group();
  public chapters:THREE.Group[]=[];
  public descriptions=[
    '城市：低机位穿过逐层拔起的黑陶建筑，橙色街道向前生长',
    '页片：有真实弯曲厚度的纸页逐片离开书脊，汇成斜向旋风',
    '双星：青蓝与象牙两颗有刻线的实体沿立体轨道交错',
    '声波：一整排厚质波片从压缩状态展开，橙色脉冲穿过',
    '服务器：机柜、电缆和活动算力芯片构成可穿行的实体阵列',
    '时间：十二块立体钟盘分裂、错位，指针继续穿过缺口',
    '爆散：原本规整的字母状方块体，受冲击向镜头及四周散开',
    '编织：一束实体长梁交错折叠成梯状织物，镜头侧向跟随',
    '总装：前面不同结构合成高耸的折叠纪念碑，镜头由低处上升',
    '回归：恢复开场面碗，克制拉远，橙线缓慢回到中心'
  ];
  public textSafe=[
    '左上 7–42% 宽 / 上方 10–33% 高','左侧 6–38% 宽，避开斜向纸流',
    '左上 6–38% 宽，主体位于中右','左上或下方，勿遮声波中轴',
    '上方左侧，机柜通路中心保留','钟盘中心空隙或左上',
    '左上；爆散发生后中央短句可出现','左侧 6–35% 宽',
    '左上，塔体主轴在右侧','左侧或中央上方，碗位于右下'
  ];
  private m:Record<string,THREE.MeshStandardMaterial>={};
  private cube=new THREE.BoxGeometry(1,1,1);
  private dummy=new THREE.Object3D();
  private city!:THREE.InstancedMesh;
  private cityData:{x:number;z:number;h:number;w:number;d:number}[]=[];
  private pages:THREE.Mesh[]=[];
  private stars:THREE.Group[]=[];
  private wave:THREE.Mesh[]=[];
  private racks:THREE.Group[]=[];
  private chips:THREE.Mesh[]=[];
  private clock:THREE.Group[]=[];
  private clockHands:THREE.Mesh[]=[];
  private particles!:THREE.InstancedMesh;
  private particleData:{home:THREE.Vector3;fly:THREE.Vector3;size:number}[]=[];
  private weave:THREE.Mesh[]=[];
  private monument:THREE.Group[]=[];
  private orange=new THREE.MeshBasicMaterial({color:O});
  private bowl!:THREE.Group;
  private head!:THREE.Mesh;
  private mapping=[2,3,0,1,5,7,4,6,8,9];

  constructor(public world:World){
    this.root.name='expanded_music_spaces';this.root.visible=false;world.scene.add(this.root);
    this.m.ivory=this.mat(I,.24,.53);this.m.dark=this.mat(D,.5,.4);this.m.orange=this.mat(O,.25,.36);this.m.cyan=this.mat(0x60c3d1,.38,.33);
    for(let i=0;i<10;i++){const g=new THREE.Group();g.name='chapter_'+i;g.visible=false;this.root.add(g);this.chapters.push(g);}
    this.buildCity();this.buildPages();this.buildStars();this.buildWave();this.buildServers();this.buildClock();this.buildBurst();this.buildWeave();this.buildMonument();this.buildBowl();
    this.descriptions=this.mapping.map(i=>this.descriptions[i]);this.textSafe=this.mapping.map(i=>this.textSafe[i]);
    this.head=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),this.orange);this.root.add(this.head);
  }
  private mat(color:number,metal:number,rough:number){
    const m=new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough});
    m.onBeforeCompile=s=>{
      s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vEtch;').replace('#include <begin_vertex>','#include <begin_vertex>\nvEtch=position;');
      s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vEtch;').replace('#include <color_fragment>',`#include <color_fragment>
        float etchQ=vEtch.y*37.+vEtch.x*.35;
        float etchW=max(fwidth(etchQ),.015);
        float etch=1.-smoothstep(.15*etchW,1.1*etchW,abs(fract(etchQ+.5)-.5));
        diffuseColor.rgb*=1.-etch*.11;`);
    };return m;
  }
  private box(g:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,mat='ivory'){
    const m=new THREE.Mesh(this.cube,this.m[mat]);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
  }
  private tube(g:THREE.Group,pts:THREE.Vector3[],r=.035,material:THREE.Material=this.orange){
    const curve=new THREE.CatmullRomCurve3(pts);const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.min(500,pts.length*3),r,6,false),material);g.add(mesh);return mesh;
  }
  private gridSurface(nu:number,nv:number,fn:(u:number,v:number)=>THREE.Vector3){
    const pos:number[]=[],uv:number[]=[],indices:number[]=[];
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const q=fn(i/nu,j/nv);pos.push(q.x,q.y,q.z);uv.push(i/nu,j/nv);}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+nu+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
  }
  private buildCity(){
    const g=this.chapters[0];this.city=new THREE.InstancedMesh(this.cube,this.m.ivory,192);this.city.castShadow=this.city.receiveShadow=true;g.add(this.city);
    for(let row=0;row<16;row++)for(let col=0;col<12;col++){
      const n=row*12+col,x=(col-5.5)*2.1;
      this.cityData.push({x:x+(x<0?-1.5:1.5),z:8-row*2.8,h:1+seed(n)*10,w:.8+seed(n+33)*.8,d:1.1+seed(n+101)*.7});
      this.city.setColorAt(n,new THREE.Color(n%11===0?O:n%3===0?0x404842:I));
    }
    this.box(g,34,.2,54,0,-.2,-14,'dark');
    const road:THREE.Vector3[]=[];for(let i=0;i<60;i++)road.push(new THREE.Vector3(.25*Math.sin(i*.4),.025,12-i));this.tube(g,road,.044);
    for(let i=0;i<12;i++)this.box(g,26,.014,.035,0,-.085,7-i*4,'ivory');
  }
  private buildPages(){
    const g=this.chapters[1];
    const geo=new THREE.BoxGeometry(2.8,1.85,.035,20,8,1),pa=geo.getAttribute('position');
    for(let i=0;i<pa.count;i++){const u=pa.getX(i)/2.8+.5,v=pa.getY(i)/1.85;pa.setZ(i,pa.getZ(i)+.38*Math.sin(u*Math.PI)+.13*v*v);}geo.computeVertexNormals();
    const paper=this.m.ivory.clone();paper.side=THREE.DoubleSide;
    for(let i=0;i<72;i++){
      const m=new THREE.Mesh(geo,i%12===0?this.m.orange:paper);m.castShadow=m.receiveShadow=true;g.add(m);this.pages.push(m);
      if(i%4===0){const lines=new THREE.LineSegments(new THREE.EdgesGeometry(geo,25),new THREE.LineBasicMaterial({color:0x282d29}));m.add(lines);}
    }
    this.box(g,3.4,.7,2.5,0,-4,0,'dark');
  }
  private buildStars(){
    const g=this.chapters[2];
    for(let k=0;k<2;k++){
      const star=new THREE.Group();g.add(star);this.stars.push(star);
      const core=new THREE.Mesh(new THREE.IcosahedronGeometry(1.7,3),k?this.m.ivory:this.m.cyan);core.scale.set(1,1.35,.86);core.castShadow=core.receiveShadow=true;star.add(core);
      for(let i=0;i<16;i++){
        const a=i/16*TAU,pts:THREE.Vector3[]=[];
        for(let j=0;j<=70;j++){const b=j/70*Math.PI;pts.push(new THREE.Vector3(Math.cos(a)*Math.sin(b)*1.75,Math.cos(b)*2.34,Math.sin(a)*Math.sin(b)*1.53));}
        this.tube(star,pts,.018,k?this.m.dark:this.m.ivory);
      }
      const orbit:THREE.Vector3[]=[];for(let i=0;i<=180;i++){const a=i/180*TAU;orbit.push(new THREE.Vector3(Math.cos(a)*5.8,Math.sin(a)*2.1,Math.sin(a)*4.1));}this.tube(g,orbit,.017,k?this.m.cyan:this.m.ivory).rotation.z=k*.62;
    }
  }
  private buildWave(){
    const g=this.chapters[3];
    for(let i=0;i<45;i++){
      const shape=new THREE.Shape();
      shape.moveTo(-.18,-2.6);shape.lineTo(.18,-2.6);shape.quadraticCurveTo(.42,0,.18,2.6);shape.lineTo(-.18,2.6);shape.quadraticCurveTo(.05,0,-.18,-2.6);
      const geo=new THREE.ExtrudeGeometry(shape,{depth:2.5,bevelEnabled:true,bevelThickness:.025,bevelSize:.028,bevelSegments:2,steps:1});geo.translate(0,0,-1.25);
      const m=new THREE.Mesh(geo,i%11===0?this.m.orange:this.m.ivory);m.castShadow=m.receiveShadow=true;g.add(m);this.wave.push(m);
    }
    const pts=[];for(let i=0;i<=200;i++){const x=-12+i/200*24;pts.push(new THREE.Vector3(x,Math.sin(x*.7)*1.5,1.8));}this.tube(g,pts,.033);
  }
  private buildServers(){
    const g=this.chapters[4];
    for(let i=0;i<18;i++){
      const rack=new THREE.Group();rack.position.set(i%2?-4.7:4.7,0,7-Math.floor(i/2)*3.8);g.add(rack);this.racks.push(rack);
      this.box(rack,2.6,7,1.65,0,3.5,0,'dark');
      for(let j=0;j<9;j++){
        this.box(rack,2.36,.47,1.73,0,.55+j*.72,0,j%3===0?'ivory':'dark');
        this.box(rack,.035,.12,.04,-.95,.55+j*.72,.90,j===i%9?'orange':'ivory');
        this.box(rack,1.6,.018,.035,.12,.62+j*.72,.89,'ivory');
      }
      const pts=[];for(let j=0;j<=30;j++){const z=-1+j/30*2;pts.push(new THREE.Vector3(Math.sin(j*.13)*.3,7.2+Math.sin(j/30*Math.PI)*1.5,z));}this.tube(rack,pts,.035,this.m.orange);
    }
    for(let i=0;i<9;i++){const m=this.box(g,.5,.1,.7,0,1.2,0,i%3?'ivory':'orange');this.chips.push(m);}
    this.box(g,17,.15,50,0,-.2,-11,'dark');
    this.tube(g,[new THREE.Vector3(0,.03,12),new THREE.Vector3(0,.03,-40)],.037);
  }
  private buildClock(){
    const g=this.chapters[5];
    for(let i=0;i<12;i++){
      const part=new THREE.Group();g.add(part);this.clock.push(part);
      const shape=new THREE.Shape();const a=-.205,b=.205,r0=3.1,r1=6.3;
      shape.absarc(0,0,r1,a,b,false);shape.lineTo(Math.cos(b)*r0,Math.sin(b)*r0);shape.absarc(0,0,r0,b,a,true);shape.closePath();
      const geo=new THREE.ExtrudeGeometry(shape,{depth:.4,bevelEnabled:true,bevelThickness:.055,bevelSize:.06,bevelSegments:3,curveSegments:14});geo.translate(0,0,-.2);
      const mesh=new THREE.Mesh(geo,i%3===0?this.m.dark:this.m.ivory);mesh.castShadow=mesh.receiveShadow=true;part.add(mesh);
      for(let j=0;j<5;j++){const aa=-.17+j*.085;const tick=this.box(part,j===2?.55:.2,.033,.045,Math.cos(aa)*5.8,Math.sin(aa)*5.8,.29,j===2?'orange':'dark');tick.rotation.z=aa;}
    }
    this.clockHands.push(this.box(g,.09,4.8,.12,0,2.4,.8,'orange'));this.clockHands.push(this.box(g,.08,3,.1,0,1.5,.95,'ivory'));
    const pin=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.4,30),this.m.orange);pin.rotation.x=Math.PI/2;pin.position.z=.9;g.add(pin);
  }
  private buildBurst(){
    const g=this.chapters[6];const data:typeof this.particleData=[];
    for(let x=-7;x<=7;x++)for(let y=-5;y<=5;y++)for(let z=-2;z<=2;z++){
      const a=Math.abs(x+3),isA=(a>=1&&a<=3&&y>-4&&y<4)||(Math.abs(y)<1&&a<3),isI=x>=3&&x<=4;
      if(!isA&&!isI)continue;
      const n=data.length,home=new THREE.Vector3(x*.55,y*.55,z*.48),dir=new THREE.Vector3(seed(n+1)-.5,seed(n+100)-.5,seed(n+800)-.36).normalize();
      data.push({home,fly:home.clone().addScaledVector(dir,7+seed(n+74)*12),size:.4+seed(n+26)*.11});
    }
    this.particleData=data;this.particles=new THREE.InstancedMesh(this.cube,this.m.ivory,data.length);this.particles.castShadow=true;g.add(this.particles);
    data.forEach((d,i)=>this.particles.setColorAt(i,new THREE.Color(i%17===0?O:i%5===0?0x4a514a:I)));
  }
  private buildWeave(){
    const g=this.chapters[7];
    const geo=new THREE.BoxGeometry(23,.055,.42,150,1,4),pa=geo.getAttribute('position');
    for(let i=0;i<pa.count;i++){const u=pa.getX(i)/23+.5;pa.setY(i,pa.getY(i)+Math.sin(u*TAU*1.5)*2.2);pa.setZ(i,pa.getZ(i)+Math.cos(u*TAU*1.5)*1.7);}geo.computeVertexNormals();
    const mat=this.m.ivory.clone();mat.side=THREE.DoubleSide;
    for(let i=0;i<17;i++){const m=new THREE.Mesh(geo,i%8===0?this.m.orange:mat);m.castShadow=m.receiveShadow=true;g.add(m);this.weave.push(m);}
  }
  private buildMonument(){
    const g=this.chapters[8];
    for(let i=0;i<14;i++){
      const layer=new THREE.Group();g.add(layer);this.monument.push(layer);
      this.box(layer,5.6,.18,3.8,0,0,0,i%5===0?'orange':'ivory');
      this.box(layer,.28,1.1,3.5,-2.5,.55,0,'dark');this.box(layer,.28,1.1,3.5,2.5,.55,0,'dark');
      for(let j=0;j<5;j++)this.box(layer,.55,.05,3.6,-1.7+j*.85,.16,0,'dark');
    }
  }
  private buildBowl(){
    this.bowl=this.world.groups[0].clone(true);this.bowl.visible=true;this.bowl.children[0].visible=true;this.chapters[9].add(this.bowl);
  }
  public hide(){this.root.visible=false;}
  public activate(){this.root.visible=true;this.world.groups.forEach(g=>g.visible=false);this.world.morph.visible=false;}
  public deactivate(){this.root.visible=false;this.world.morph.visible=true;}
  public render(t:number,chapter:number,p:number,energy:number){
    chapter=this.mapping[Math.max(0,Math.min(9,Math.floor(chapter)))];p=clamp(p);energy=clamp(energy);
    this.root.visible=true;this.world.groups.forEach(g=>g.visible=false);this.world.morph.visible=false;
    this.chapters.forEach((g,i)=>g.visible=i===chapter);
    const camera=this.world.camera;camera.up.set(0,1,0);let x=10,y=6,z=18,tx=0,ty=0,tz=0,fov=49;
    const g=this.chapters[chapter];g.rotation.set(0,0,0);g.position.set(0,0,0);g.scale.set(1,1,1);
    if(chapter===0){
      this.cityData.forEach((d,i)=>{const s=.025+smooth((p-(i%16)*.018)/.55)*.975;this.dummy.position.set(d.x,d.h*s/2,d.z);this.dummy.scale.set(d.w,d.h*s,d.d);this.dummy.rotation.set(0,0,0);this.dummy.updateMatrix();this.city.setMatrixAt(i,this.dummy.matrix);});this.city.instanceMatrix.needsUpdate=true;
      x=.8*Math.sin(p*3);y=3.4+p*2.6;z=16-p*23;tx=0;ty=3.7;tz=z-18;fov=60;
    }else if(chapter===1){
      this.pages.forEach((m,i)=>{const u=i/71,repeat=t>75?1:0,a=u*TAU*(2.4-repeat*.35)+p*(.8+repeat*.55),r=1+u*5.3,lift=.65+.35*smooth((p-u*.26)/.5);m.position.set(Math.cos(a)*r*lift,-3.5+u*10*lift,Math.sin(a)*r*lift);m.rotation.set(u*1.0+lift*.2+Math.sin(p*4+u*5)*.12,-a+.5,Math.sin(a)*.24);});
      x=7-p*5;y=4.3-p*.9;z=14-p*1.3;ty=.6;g.rotation.z=-.15+(t>75?p*.18:0);
    }else if(chapter===2){
      this.stars.forEach((s,i)=>{const a=p*2.3+i*Math.PI;s.position.set(Math.cos(a)*3.1,Math.sin(a)*1.4,Math.sin(a)*2.7);s.rotation.set(.1+p*.3,p+i*.6,.15*Math.sin(p*3+i));});
      x=5-p*8;y=4;z=18-p*1.5;ty=.6;fov=47;
    }else if(chapter===3){
      this.wave.forEach((m,i)=>{const q=i/44,spread=.36+smooth(p/.45)*.64;m.position.set((q-.5)*24*spread,Math.sin(q*TAU*2-p*TAU)*1.4,Math.sin(q*TAU+p*2)*.35);m.scale.y=.32+Math.pow(.5+.5*Math.sin(q*TAU*3-p*5),1.2)*.85;m.rotation.x=Math.sin(q*TAU+p*2)*.18;});
      x=14-p*9;y=5;z=17-p*1.6;ty=0;fov=53;
    }else if(chapter===4){
      this.racks.forEach((r,i)=>{r.rotation.y=(i%2?1:-1)*(.05+Math.sin(p*2+i*.2)*.05);});
      this.chips.forEach((m,i)=>{const q=(p*1.8+i/9)%1;m.position.set(Math.sin(q*5)*1.2,1.1+Math.sin(q*Math.PI)*2.2,10-q*40);m.rotation.set(p*.5,i*.2+p,0);const depth=(13-p*23)-m.position.z;m.visible=depth>6;const safeScale=smooth((depth-6)/3);m.scale.set(.5*safeScale,.1*safeScale,.7*safeScale);});
      x=Math.sin(p*2)*.9;y=3.3;z=13-p*23;ty=3.5;tz=z-18;fov=59;
    }else if(chapter===5){
      const split=smooth((p-.17)/.62);
      this.clock.forEach((c,i)=>{const a=i/12*TAU,depth=t>100?3.1:2;c.rotation.set(Math.sin(i*2)*split*.22,Math.cos(i*3)*split*(t>100?.38:.23),a+split*Math.sin(i)*.065);c.position.set(Math.cos(a)*split*(i%3)*.6,Math.sin(a)*split*(i%3)*.6,Math.sin(i*1.7)*split*depth);});
      this.clockHands.forEach((m,i)=>{const a=p*(i?1.8:7)*(t>100?-1.35:1)+i*1.3;m.rotation.z=-a;m.position.set(Math.sin(a)*(i?1.5:2.4),Math.cos(a)*(i?1.5:2.4),.8+i*.15);});
      x=5-p*8;y=2.2;z=19;ty=0;fov=48;
    }else if(chapter===6){
      const blast=smooth((p-.28)/.58);
      this.particleData.forEach((d,i)=>{this.dummy.position.lerpVectors(d.home,d.fly,blast);this.dummy.rotation.set(blast*(i%5)*.7,blast*(i%7)*.6,blast*(i%3));this.dummy.scale.setScalar(d.size*(1-blast*.2));this.dummy.updateMatrix();this.particles.setMatrixAt(i,this.dummy.matrix);});this.particles.instanceMatrix.needsUpdate=true;
      x=5-p*7;y=2.6;z=15+p*7;fov=51;
    }else if(chapter===7){
      this.weave.forEach((m,i)=>{m.position.set(0,(i-8)*.36,(i-8)*.28);m.rotation.set(Math.sin(p*2+i*.13)*.2,0,(i-8)*.012+Math.sin(p*2)*.1);});
      x=-9+p*17;y=5-p*2;z=15;ty=.8;fov=57;
    }else if(chapter===8){
      this.monument.forEach((m,i)=>{const open=smooth((p-i*.024)/.52);m.position.set(Math.sin(i*.4+p*.7)*(1.0+open*.25),-6+i*.86,Math.cos(i*.35+p)*.45);m.rotation.y=i*.16+open*Math.sin(i*.45)*.75;m.rotation.z=(1-open)*(i%2?1:-1)*.35;});
      x=8.5-p*6.5;y=-.7+p*7;z=15-p;tx=2;ty=.8+p*1.6;g.position.x=2.0;g.scale.set(1.7,1.02,1.5);fov=50;
    }else{
      this.bowl.rotation.y=.08*Math.sin(p*Math.PI);g.position.set(2,-.6,0);
      x=4-p*2;y=9+p*3;z=15+p*6;tx=1;ty=-.4;fov=46;
    }
    if(t>100&&chapter!==9){
      // Reprises use the opposite camera side and a lower / closer path, not a replay.
      x=-x*.82;y=y*.84+Math.sin(p*Math.PI)*.7;
      if(chapter!==0&&chapter!==4)z*=.91;
      if(chapter===1||chapter===7||chapter===8)g.rotation.y=-.18+Math.sin(p*Math.PI)*.18;
    }
    this.head.visible=chapter!==9;this.head.position.set(Math.sin(t*.41)*2,.5+Math.sin(t*.6)*1.0,chapter===0||chapter===4?z-9:3.5);this.head.scale.setScalar(.8+energy*.45);
    this.world.key.position.set(-7,13,9);this.world.key.target.position.set(chapter===0||chapter===4?0:1,2,chapter===0||chapter===4?z-12:0);
    camera.position.set(x,y,z);camera.fov=fov;camera.updateProjectionMatrix();camera.lookAt(tx,ty,tz);
    this.world.renderer.render(this.world.scene,camera);
  }
}

export default ExpandedWorld;
