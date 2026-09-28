import * as THREE from 'three';

// All transforms are evaluated from the supplied time, never from frame deltas.
const TAU = Math.PI * 2;
const smooth = (v: number) => { const x=Math.max(0,Math.min(1,v)); return x*x*(3-2*x); };
const ORANGE = 0xf27031;
const VERT = `
varying vec3 vP;
varying vec3 vN;
varying vec2 vU;
varying float vD;
void main(){vP=position;vN=normalize(normalMatrix*normal);vU=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vD=-mv.z;gl_Position=projectionMatrix*mv;}
`;
const FRAG = `
precision highp float;
uniform float uKind;
uniform float uEnergy;
uniform float uTime;
varying vec3 vP;
varying vec3 vN;
varying vec2 vU;
varying float vD;
float line(float q,float thickness){float w=max(fwidth(q),.0001);return 1.-smoothstep(thickness*w,(thickness+1.)*w,abs(fract(q+.5)-.5));}
void main(){
 float q=mix(vU.y*80.+vU.x*3.,vP.y*3.,clamp(uKind,0.,1.));
 q=mix(q,vU.y*48.,clamp(uKind-1.,0.,1.));q=mix(q,vU.y*23.,clamp(uKind-2.,0.,1.));
 float crossLine=mix(line(vU.x*72.,.20)*.19,line(vU.y*94.,.25)*.10,clamp(uKind,0.,1.));
 crossLine=mix(crossLine,line(vU.x*40.,.40)*.38,clamp(uKind-1.,0.,1.));
 crossLine=mix(crossLine,line(vU.x*100.,.30)*.26,clamp(uKind-2.,0.,1.));
 float hair=line(q,.57);
 vec3 surfaceNormal=normalize(cross(dFdx(vP),dFdy(vP)));
 float diffuse=.14+.86*abs(dot(surfaceNormal,normalize(vec3(-.4,.8,.5))));
 float brushed=line(vU.x*440.+vU.y*15.,.15)*.07;
 float gloss=pow(abs(dot(surfaceNormal,normalize(vec3(-.25,.65,.72)))),24.)*.12;
 vec3 dark=vec3(.11,.115,.112)*diffuse+vec3(.016+gloss+brushed*.11);
 vec3 ivory=vec3(.76,.74,.66);
 float ink=max(hair,crossLine);
 vec3 col=mix(dark,ivory*diffuse,ink*.66);
 float orangeBand=(1.-smoothstep(.017,.029,abs(vU.y-.61-.014*sin(vU.x*6.283))))*(1.-clamp(uKind,0.,1.));col=mix(col,vec3(.92,.245,.052),orangeBand*(.65+.35*hair));
 float vignette=1.;
 float fog=1.-exp(-max(0.,vD-7.)*.018);
 col=mix(col,vec3(.025,.029,.030),fog*.82);
 gl_FragColor=vec4(col*vignette,1.);
}
`;

export class World {
  renderer:THREE.WebGLRenderer;
  camera:THREE.PerspectiveCamera;
  scene:THREE.Scene;
  groups:THREE.Group[]=[];
  mats:THREE.ShaderMaterial[]=[];
  rings:THREE.Group[]=[];
  orangeHeads:THREE.Mesh[]=[];
  bowl!:THREE.Mesh;
  morph!:THREE.Mesh;
  morphMat!:THREE.ShaderMaterial;
  target=new THREE.Vector3();
  key!:THREE.DirectionalLight;

  constructor(canvas:HTMLCanvasElement){
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(canvas.width||1920,canvas.height||1080,false);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.05;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x090b0d);
    this.scene.fog=new THREE.FogExp2(0x090b0d,.013);
    this.camera=new THREE.PerspectiveCamera(47,(canvas.width||1920)/(canvas.height||1080),.035,150);
    this.scene.add(new THREE.HemisphereLight(0xe3ddc9,0x070909,1.2));
    const key=new THREE.DirectionalLight(0xffdfba,3);key.position.set(-5,12,8);key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:40});key.shadow.normalBias=.018;this.scene.add(key,key.target);this.key=key;
    const rim=new THREE.DirectionalLight(0xbacbd1,1);rim.position.set(9,3,-7);this.scene.add(rim);
    for(let i=0;i<4;i++){const g=new THREE.Group();this.groups.push(g);this.scene.add(g);}
    this.makeBowl();this.makeCanyon();this.makeTunnel();this.makeMachine();this.makeMorph();
  }
  project(x:number,y:number,z:number){
    const v=new THREE.Vector3(x,y,z),distance=this.camera.position.distanceTo(v);v.project(this.camera);
    return {x:(v.x*.5+.5)*1920,y:(.5-v.y*.5)*1080,scale:Math.max(.12,Math.min(3,12/distance)),visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1.25&&Math.abs(v.y)<1.25};
  }
  anchor(phase:number){
    const k=Math.min(3,Math.floor(phase)),p=phase-k;
    if(k===0)return {x:-2.3,y:2.0,z:-2};
    if(k===1)return {x:0,y:2.7,z:1-p*34};
    if(k===2)return {x:Math.sin((.1+p*.6)*5),y:1.7,z:9-(.1+p*.6)*66-8};
    return {x:0,y:.6,z:-62.5};
  }
  makeMorph(){
    const geo=this.surface(240,144,(u,v)=>new THREE.Vector3(u,v,0));
    const shapes:number[][]=[[],[],[],[]];
    for(let j=0;j<=144;j++)for(let i=0;i<=240;i++){
      const u=i/240,v=j/144,a=u*TAU,r=.35+v*6.6;
      const q0=new THREE.Vector3(r*Math.cos(a),.125*r*r-2.7+.085*Math.sin(a*9+v*11)*v,r*Math.sin(a));
      const x=(u-.5)*28,z=14-v*72;
      const q1=new THREE.Vector3(x,this.canyonHeight(x,z),z),q2=this.tunnelPoint(u,v),rr=2.9+v*4.2;
      const q3=new THREE.Vector3(Math.cos(a)*rr,Math.sin(a)*rr,-60+(v-.5)*4+.65*Math.sin(a*4+v*5));
      [q0,q1,q2,q3].forEach((q,k)=>shapes[k].push(q.x,q.y,q.z));
    }
    shapes.forEach((p,i)=>geo.setAttribute('aShape'+i,new THREE.Float32BufferAttribute(p,3)));
    const vertex=`attribute vec3 aShape0;attribute vec3 aShape1;attribute vec3 aShape2;attribute vec3 aShape3;
    uniform float uStage;uniform float uBlend;varying vec3 vP;varying vec3 vN;varying vec2 vU;varying float vD;
    void main(){vec3 a=aShape0,b=aShape0;if(uStage>.5){a=aShape0;b=aShape1;}if(uStage>1.5){a=aShape1;b=aShape2;}if(uStage>2.5){a=aShape2;b=aShape3;}vec3 pos=mix(a,b,uBlend);vP=pos;vU=uv;vN=normalize(normalMatrix*vec3(.3,.7,.65));vec4 mv=modelViewMatrix*vec4(pos,1.);vD=-mv.z;gl_Position=projectionMatrix*mv;}`;
    this.morphMat=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:FRAG,side:THREE.DoubleSide,uniforms:{uStage:{value:0},uBlend:{value:0},uKind:{value:0},uEnergy:{value:0},uTime:{value:0}}});
    this.morph=new THREE.Mesh(geo,this.morphMat);this.morph.frustumCulled=false;this.scene.add(this.morph);
    for(let i=0;i<3;i++)this.groups[i].children[0].visible=false;
  }
  material(kind:number){
    const m=new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,side:THREE.DoubleSide,uniforms:{uKind:{value:kind},uEnergy:{value:0},uTime:{value:0}}});
    this.mats.push(m);return m;
  }
  surface(nu:number,nv:number,fn:(u:number,v:number)=>THREE.Vector3){
    const p:number[]=[],uv:number[]=[],idx:number[]=[];
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const u=i/nu,v=j/nv,a=fn(u,v);p.push(a.x,a.y,a.z);uv.push(u,v);}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+nu+1;idx.push(a,b,a+1,b,b+1,a+1);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();return geo;
  }
  tube(g:THREE.Group,points:THREE.Vector3[],r=.035,color=ORANGE){
    const c=new THREE.CatmullRomCurve3(points);
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(c,Math.min(600,points.length*3),r,6,false),new THREE.MeshBasicMaterial({color}));g.add(mesh);return mesh;
  }
  head(g:THREE.Group,r=.095){const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),new THREE.MeshBasicMaterial({color:0xffd7a6}));g.add(m);this.orangeHeads.push(m);return m;}
  makeBowl(){
    const g=this.groups[0];
    const shape=(u:number,v:number)=>{const a=u*TAU,r=.35+v*6.6;const rip=.085*Math.sin(a*9+v*11)*v;return new THREE.Vector3(r*Math.cos(a),.125*r*r-2.7+rip,r*Math.sin(a));};
    this.bowl=new THREE.Mesh(this.surface(240,144,shape),this.material(0));g.add(this.bowl);
    // The solid rib runs continuously around the inside of the bowl, not around a sphere.
    const spiral:THREE.Vector3[]=[];
    for(let i=0;i<=1300;i++){const v=.13+i/1300*.84,a=i/1300*TAU*17,r=.35+v*6.6;spiral.push(new THREE.Vector3(r*Math.cos(a),.125*r*r-2.66+.085*Math.sin(a*9+v*11)*v,r*Math.sin(a)));}
    this.tube(g,spiral,.024,0xee6828);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(6.95,.033,7,200),new THREE.MeshBasicMaterial({color:0xe4dac0}));rim.rotation.x=Math.PI/2;rim.position.y=.125*6.95*6.95-2.7;g.add(rim);
    const dark=new THREE.Mesh(new THREE.CylinderGeometry(.58,.28,.18,48),new THREE.MeshStandardMaterial({color:0x191c1d,roughness:.65,metalness:.28}));dark.position.y=-2.67;g.add(dark);
    for(let i=0;i<2;i++){
      const rod=new THREE.Mesh(new THREE.CylinderGeometry(.031,.052,11.5,10),new THREE.MeshStandardMaterial({color:i?0xcbbea2:0xd86a31,roughness:.42,metalness:.25}));
      rod.position.set(2.6+i*.42,3.55,-1.8+i*.35);rod.rotation.z=-.96;rod.rotation.x=.22;g.add(rod);
    }
    this.head(g,.085);
  }
  canyonHeight(x:number,z:number){return -2.8+Math.pow(Math.abs(x)/3.3,1.72)*2.1+.65*Math.sin(z*.24+x*.45)+.28*Math.sin(z*.7-x*.8);}
  makeCanyon(){
    const g=this.groups[1];
    const geo=this.surface(180,240,(u,v)=>{const x=(u-.5)*28,z=14-v*72;return new THREE.Vector3(x,this.canyonHeight(x,z),z);});
    g.add(new THREE.Mesh(geo,this.material(1)));
    const pts:THREE.Vector3[]=[];
    for(let i=0;i<=280;i++){const z=14-i/280*70,x=Math.sin(z*.18)*.72;pts.push(new THREE.Vector3(x,this.canyonHeight(x,z)+.11,z));}
    this.tube(g,pts,.048);this.head(g,.12);
    // Thin contour bridges provide a clear near / middle / distant scale reference.
    for(let i=0;i<8;i++){const z=2-i*6.4,pts:THREE.Vector3[]=[];for(let j=0;j<=60;j++){const x=-8+j/60*16;pts.push(new THREE.Vector3(x,this.canyonHeight(x,z)+.015,z));}this.tube(g,pts,.014,0xafa997);}
  }
  tunnelPoint(u:number,v:number){
    const a=u*TAU,tw=v*1.9,r=1+.065*Math.sin(a*5+v*8);
    const x=Math.cos(a)*5.2*r,y=Math.sin(a)*4.1*r;
    return new THREE.Vector3(x*Math.cos(tw)-y*Math.sin(tw)+Math.sin(v*5)*1.2,y*Math.cos(tw)+x*Math.sin(tw),9-v*66);
  }
  makeTunnel(){
    const g=this.groups[2];g.add(new THREE.Mesh(this.surface(144,220,(u,v)=>this.tunnelPoint(u,v)),this.material(2)));
    for(let j=0;j<11;j++){
      const pts:THREE.Vector3[]=[];for(let i=0;i<=100;i++)pts.push(this.tunnelPoint(i/100,j/12));
      this.tube(g,pts,j%3===0?.055:.025,j%3===0?0xc5bfae:0x79796f);
    }
    const path:THREE.Vector3[]=[];
    for(let i=0;i<=240;i++){const v=i/240;const a=this.tunnelPoint(.75,v);a.y+=.12;path.push(a);}
    this.tube(g,path,.043);this.head(g,.1);
  }
  makeMachine(){
    const g=this.groups[3];g.position.z=-60;
    for(let i=0;i<9;i++){
      const layer=new THREE.Group();g.add(layer);this.rings.push(layer);
      const r=3.3+i*.44;
      const geo=this.surface(240,16,(u,v)=>{
        const a=u*TAU,b=v*TAU,radial=Math.sign(Math.cos(b))*Math.pow(Math.abs(Math.cos(b)),.28)*.19,depth=Math.sign(Math.sin(b))*Math.pow(Math.abs(Math.sin(b)),.28)*.105,rr=r+radial;
        return new THREE.Vector3(Math.cos(a)*rr,Math.sin(a)*rr,.44*Math.sin(a*4+i*.65)+depth);
      });
      const solidRing=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:i%3===0?0x777a72:0xbeb6a4,metalness:.43,roughness:.36}));solidRing.castShadow=true;solidRing.receiveShadow=true;layer.add(solidRing);
      const edge:THREE.Vector3[]=[];for(let j=0;j<=180;j++){const a=j/180*TAU;edge.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,.44*Math.sin(a*4+i*.65)));}
      this.tube(layer,edge,.019,i===4?ORANGE:0xb8b2a0);
      // A small mechanical rib on each ring makes rotation, depth and occlusion unambiguous.
      for(let j=0;j<6;j++){
        const a=j/6*TAU+i*.17;
        const rib=new THREE.Mesh(new THREE.BoxGeometry(.42,.085,.13),new THREE.MeshStandardMaterial({color:j===0?ORANGE:0x777c78,roughness:.45,metalness:.55}));
        rib.position.set(Math.cos(a)*r,Math.sin(a)*r,.44*Math.sin(a*4+i*.65));rib.rotation.z=a;layer.add(rib);
      }
    }
    this.head(g,.11);
  }
  render(t:number,phase:number,energy:number){
    const k=Math.max(0,Math.min(3,Math.floor(phase))),p=Math.max(0,Math.min(.999999,phase-k)),e=Math.max(0,Math.min(1,energy));
    this.groups.forEach((g,i)=>g.visible=i===k);
    this.key.position.z=k===3?-52:8;this.key.target.position.z=k===3?-60:0;
    this.orangeHeads.forEach(h=>h.scale.setScalar(.9+e*.35));
    const morphBlend=k===0?0:smooth(p/.38);
    this.morphMat.uniforms.uStage.value=k;this.morphMat.uniforms.uBlend.value=morphBlend;
    this.morphMat.uniforms.uKind.value=k===0?0:k-1+morphBlend;
    this.mats.forEach(m=>{m.uniforms.uTime.value=t;m.uniforms.uEnergy.value=e;});
    this.camera.up.set(0,1,0);
    let x=0,y=0,z=0,tx=0,ty=0,tz=0,fov=47;
    if(k===0){
      const dive=smooth((p-.48)/.52),a=-.24+p*.46;
      x=Math.sin(a)*(17-dive*10);y=12-dive*6;z=Math.cos(a)*(17-dive*10);ty=-.7-dive*1.4;tz=-dive*2;
      this.groups[0].rotation.y=0;
      const r=5.3-p*3.8;this.orangeHeads[0].position.set(r*Math.cos(t*.75),.125*r*r-2.61,r*Math.sin(t*.75));
      fov=43+dive*13;
    }else if(k===1){
      z=10-p*34;x=Math.sin(p*3.8)*.9;y=1.5+.6*Math.sin(p*Math.PI);tx=Math.sin((p+.2)*3.8)*.7;ty=.2;tz=z-15;fov=61;
      const hz=z-8,hx=Math.sin(hz*.18)*.72;this.orangeHeads[1].position.set(hx,this.canyonHeight(hx,hz)+.16,hz);
    }else if(k===2){
      const v=.10+p*.60;z=9-v*66;x=Math.sin(v*5)*1.05;y=.35*Math.sin(p*3);tx=Math.sin((v+.15)*5)*1.2;tz=z-13;ty=0;
      this.camera.up.set(Math.sin(p*.35),Math.cos(p*.35),0);fov=66;
      const hp=this.tunnelPoint(.75,Math.min(.95,v+.14));hp.y+=.15;this.orangeHeads[2].position.copy(hp);
    }else{
      this.rings.forEach((r,i)=>{r.rotation.set(Math.sin(p*Math.PI+i*.29)*(.18+i*.035),Math.cos(p*Math.PI+i*.21)*(.12+i*.05),p*.27*(i%2?1:-1)+i*.075);r.position.z=(i-4)*(.42+smooth(p)*.20);});
      const pass=smooth((p-.36)/.64);x=1.4*(1-pass)-2.0*p;y=1.4*(1-pass)+1.2*Math.sin(p*Math.PI);z=-40-pass*2;tx=0;ty=0;tz=-60;fov=49;
      const a=t*.5;this.orangeHeads[3].position.set(Math.cos(a)*5.06,Math.sin(a)*5.06,.5);
    }
    // Each next shot starts at exactly the preceding shot's physical camera pose.
    // The same vertex lattice opens from bowl into terrain, curls into corridor,
    // then folds back into the machine; no black-frame transition is involved.
    if(k>0){
      const starts=[[0,0,0,0,0,0,0],[Math.sin(.22)*7,6,Math.cos(.22)*7,0,-2.1,-2,56],
      [Math.sin(3.8)*.9,1.5,-24,Math.sin(4.56)*.7,.2,-39,61],
      [Math.sin(3.5)*1.05,.35*Math.sin(3),-37.2,Math.sin(4.25)*1.2,0,-50.2,66]];
      const q=starts[k],s=smooth(p/.30);
      x=q[0]+(x-q[0])*s;y=q[1]+(y-q[1])*s;z=q[2]+(z-q[2])*s;
      tx=q[3]+(tx-q[3])*s;ty=q[4]+(ty-q[4])*s;tz=q[5]+(tz-q[5])*s;fov=q[6]+(fov-q[6])*s;
      if(k===3){const machineScale=.001+smooth(p/.4)*.999;this.groups[3].scale.setScalar(machineScale);}
    }
    if(this.camera.fov!==fov){this.camera.fov=fov;this.camera.updateProjectionMatrix();}
    this.camera.position.set(x,y,z);this.target.set(tx,ty,tz);this.camera.lookAt(this.target);
    this.renderer.render(this.scene,this.camera);
  }
}

export default World;
