'use strict';
/* renderer.js — WebGL2 native: shader GLSL custom, mesh prosedural, batch statis,
   atlas teks (canvas texture), shadow map, langit, siklus siang-malam. Gaya shader mengikuti proyek ZIP
   (flat shading dari turunan layar, hemisphere + matahari, PCF shadow, fog). */

const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const lerp=(a,b,k)=>a+(b-a)*k;
const sstep=(a,b,x)=>{const t=cl((x-a)/(b-a));return t*t*(3-2*t)};
const _hc={};
function hex(h){let r=_hc[h];if(!r){const n=parseInt(h.slice(1),16);r=_hc[h]=[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}return r}
function rnd(s){const x=Math.sin(s*127.1+311.7)*43758.5453;return x-Math.floor(x)}
const mixc=(a,b,k)=>[lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)];
const vsub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const vcross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const vdot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const vnorm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l]};

/* ---------- matriks (kolom-mayor, sama seperti ZIP) ---------- */
const M4={
  mul(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o},
  persp(fov,asp,n,f){const t=1/Math.tan(fov/2);return [t/asp,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]},
  ortho(l,r,b,t,n,f){return [2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]},
  look(e,c,u){const z=vnorm(vsub(e,c)),x=vnorm(vcross(u,z)),y=vcross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-vdot(x,e),-vdot(y,e),-vdot(z,e),1]},
  /* T·Ry·Rx·Rz·S */
  trs(p,r,s){const [x,y,z]=p,[rx,ry,rz]=r||[0,0,0],[sx,sy,sz]=s||[1,1,1];const cy=Math.cos(ry),sy_=Math.sin(ry),cx=Math.cos(rx),sx_=Math.sin(rx),cz=Math.cos(rz),sz_=Math.sin(rz);
    return [(cy*cz+sy_*sx_*sz_)*sx,(cx*sz_)*sx,(-sy_*cz+cy*sx_*sz_)*sx,0,(-cy*sz_+sy_*sx_*cz)*sy,(cx*cz)*sy,(sy_*sz_+cy*sx_*cz)*sy,0,(sy_*cx)*sz,(-sx_)*sz,(cy*cx)*sz,0,x,y,z,1]},
  T(x,y,z){return [1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]},
  S(x,y,z){return [x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1]},
  Ry(a){const c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]},
  Rx(a){const c=Math.cos(a),s=Math.sin(a);return [1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]},
  I:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
};

/* ---------- mesh prosedural (data mentah) ---------- */
const GEO={};
(function(){
  const qd=(P,a,b,c,d)=>P.push(...a,...b,...c,...a,...c,...d);
  // kotak: berpusat di origin, ukuran 1
  {const P=[],v=(x,y,z)=>[x-.5,y-.5,z-.5];
   qd(P,v(0,0,1),v(1,0,1),v(1,1,1),v(0,1,1));qd(P,v(1,0,0),v(0,0,0),v(0,1,0),v(1,1,0));qd(P,v(1,0,1),v(1,0,0),v(1,1,0),v(1,1,1));
   qd(P,v(0,0,0),v(0,0,1),v(0,1,1),v(0,1,0));qd(P,v(0,1,1),v(1,1,1),v(1,1,0),v(0,1,0));qd(P,v(0,0,0),v(1,0,0),v(1,0,1),v(0,0,1));
   GEO.box={p:P};}
  // silinder/kerucut: dasar y=0, tinggi 1, radius bawah 1
  const cylCache={};
  GEO.cyl=function(n,rt,rb){const k=n+'_'+rt+'_'+rb;if(cylCache[k])return cylCache[k];const P=[];
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,A=[Math.cos(a),Math.sin(a)],B=[Math.cos(b),Math.sin(b)];
      qd(P,[A[0]*rb,0,A[1]*rb],[B[0]*rb,0,B[1]*rb],[B[0]*rt*rb,1,B[1]*rt*rb],[A[0]*rt*rb,1,A[1]*rt*rb]);
      if(rt>0)P.push(0,1,0,A[0]*rt*rb,1,A[1]*rt*rb,B[0]*rt*rb,1,B[1]*rt*rb);
      P.push(0,0,0,B[0]*rb,0,B[1]*rb,A[0]*rb,0,A[1]*rb)}
    return cylCache[k]={p:P}};
  // bola low-poly (ikosahedron)
  const icoCache={};
  GEO.ico=function(sd){if(icoCache[sd])return icoCache[sd];const t=(1+Math.sqrt(5))/2;
    let V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(vnorm);
    let F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
    for(let s=0;s<sd;s++){const NF=[];const mid=(a,b)=>{V.push(vnorm([(V[a][0]+V[b][0])/2,(V[a][1]+V[b][1])/2,(V[a][2]+V[b][2])/2]));return V.length-1};
      for(const [a,b,c] of F){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);NF.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])}F=NF}
    const P=[];for(const f of F)for(const i of f)P.push(...V[i]);return icoCache[sd]={p:P}};
  // atap pelana: punggung sepanjang x, dasar y=0, lebar x 1, dalam z 1, tinggi 1
  {const P=[];qd(P,[-.5,0,.5],[.5,0,.5],[.5,1,0],[-.5,1,0]);qd(P,[.5,0,-.5],[-.5,0,-.5],[-.5,1,0],[.5,1,0]);
   P.push(.5,0,.5,.5,0,-.5,.5,1,0,-.5,0,-.5,-.5,0,.5,-.5,1,0);GEO.gable={p:P};}
  // atap limas-pelana (hip)
  {const P=[],r=.2;qd(P,[-.5,0,.5],[.5,0,.5],[r,1,0],[-r,1,0]);qd(P,[.5,0,-.5],[-.5,0,-.5],[-r,1,0],[r,1,0]);
   P.push(.5,0,.5,.5,0,-.5,r,1,0,-.5,0,-.5,-.5,0,.5,-r,1,0);GEO.hip={p:P};}
  // bidang bertekstur (menghadap +z), berpusat di origin
  GEO.plane={p:[-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,-.5,0,.5,.5,0,-.5,.5,0],uv:[0,1,1,1,1,0,0,1,1,0,0,0]};
})();

/* ---------- batch statis: gabung banyak objek jadi satu draw call ---------- */
class Batch{
  constructor(o){this.o=Object.assign({cast:1,recv:1,ao:1,tex:0,emis:0,gmix:0,alpha:1,nofog:0,night:0,k:1},o||{});this.a=new Float32Array(1<<16);this.n=0;this.vao=null;this.cnt=0}
  _g(k){if(this.n+k>this.a.length){const b=new Float32Array(Math.max(this.a.length*2,this.n+k));b.set(this.a);this.a=b}}
  add(mesh,col,pos,rot,scl){this.addM(mesh,col,M4.trs(pos,rot||[0,0,0],scl||[1,1,1]))}
  addM(mesh,col,m){
    const c=typeof col==='string'?hex(col):col,p=mesh.p,N=p.length/3;this._g(N*8);const a=this.a,ao=this.o.ao;let o=this.n;
    for(let i=0;i<N;i++){const x=p[i*3],y=p[i*3+1],z=p[i*3+2];
      const wx=m[0]*x+m[4]*y+m[8]*z+m[12],wy=m[1]*x+m[5]*y+m[9]*z+m[13],wz=m[2]*x+m[6]*y+m[10]*z+m[14];
      const k=ao?.82+.18*sstep(0,1.3,wy):1;
      a[o++]=wx;a[o++]=wy;a[o++]=wz;a[o++]=c[0]*k;a[o++]=c[1]*k;a[o++]=c[2]*k;a[o++]=0;a[o++]=0}
    this.n=o;this.cnt+=N}
  v(p,c,u,w){this._g(8);const a=this.a;let o=this.n;a[o++]=p[0];a[o++]=p[1];a[o++]=p[2];a[o++]=c[0];a[o++]=c[1];a[o++]=c[2];a[o++]=u||0;a[o++]=w||0;this.n=o;this.cnt++}
  tri(p0,p1,p2,col){const c=typeof col==='string'?hex(col):col;this.v(p0,c);this.v(p1,c);this.v(p2,c)}
  /* sudut: kiri-bawah, kanan-bawah, kanan-atas, kiri-atas; uv dari atlas */
  quad(p0,p1,p2,p3,col,uv){const c=typeof col==='string'?hex(col):col;uv=uv||{u0:0,v0:0,u1:0,v1:0};
    this.v(p0,c,uv.u0,uv.v1);this.v(p1,c,uv.u1,uv.v1);this.v(p2,c,uv.u1,uv.v0);this.v(p0,c,uv.u0,uv.v1);this.v(p2,c,uv.u1,uv.v0);this.v(p3,c,uv.u0,uv.v0)}
  upload(gl){
    this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
    gl.bufferData(gl.ARRAY_BUFFER,this.a.subarray(0,this.n),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,32,0);
    gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,3,gl.FLOAT,false,32,12);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,32,24);
    this.verts=this.n/8;this.a=null;gl.bindVertexArray(null)}
}

/* ---------- atlas teks: semua papan/tulisan statis dalam satu texture ---------- */
const Atlas={W:2048,H:2048,cv:null,cx:null,x:0,y:0,rowH:0,uv:{},tex:null,
  init(){this.cv=document.createElement('canvas');this.cv.width=this.W;this.cv.height=this.H;this.cx=this.cv.getContext('2d');this.x=this.y=this.rowH=0;this.uv={}},
  add(key,w,h,draw){
    if(this.uv[key])return this.uv[key];
    if(this.x+w>this.W){this.x=0;this.y+=this.rowH+6;this.rowH=0}
    if(this.y+h>this.H)throw new Error('Atlas penuh: '+key);
    const x=this.x,y=this.y,c=this.cx;c.save();c.translate(x,y);c.beginPath();c.rect(0,0,w,h);c.clip();draw(c,w,h);c.restore();
    this.x+=w+6;this.rowH=Math.max(this.rowH,h);
    return this.uv[key]={u0:(x+1.5)/this.W,v0:(y+1.5)/this.H,u1:(x+w-1.5)/this.W,v1:(y+h-1.5)/this.H}},
  upload(gl){this.tex=R.texFromCanvas(this.cv,true)}
};
const FD=s=>`${s}px 'Lilita One','Arial Black',system-ui,sans-serif`;
const FB=s=>`900 ${s}px Nunito,system-ui,sans-serif`;

/* ---------- lingkungan: siklus siang-malam berdasarkan jam WIB ---------- */
const ENVKEYS=[
  {h:0,   top:'#0b1030',bot:'#2a3a73',fog:'#1c2650',sky:[.46,.54,.88],gnd:[.28,.31,.52],sun:[.46,.58,1],amb:.09,sunI:.95},
  {h:4.8, top:'#0b1030',bot:'#2a3a73',fog:'#1c2650',sky:[.46,.54,.88],gnd:[.28,.31,.52],sun:[.46,.58,1],amb:.09,sunI:.95},
  {h:6.0, top:'#6fa3e6',bot:'#ffc9a0',fog:'#ffd2b0',sky:[.95,.86,.86],gnd:[.70,.60,.55],sun:[1,.74,.52],amb:.04,sunI:.8},
  {h:7.6, top:'#5fb4ee',bot:'#d6f0ff',fog:'#cdeaff',sky:[1,1,1],gnd:[.80,.76,.64],sun:[1,.96,.84],amb:.04,sunI:1},
  {h:16.4,top:'#5fb4ee',bot:'#d6f0ff',fog:'#cdeaff',sky:[1,1,1],gnd:[.80,.76,.64],sun:[1,.96,.84],amb:.04,sunI:1},
  {h:17.8,top:'#5b7fd0',bot:'#ff9a6b',fog:'#f6b08a',sky:[.92,.78,.80],gnd:[.66,.55,.52],sun:[1,.62,.42],amb:.04,sunI:.8},
  {h:19.2,top:'#0b1030',bot:'#2a3a73',fog:'#1c2650',sky:[.46,.54,.88],gnd:[.28,.31,.52],sun:[.46,.58,1],amb:.09,sunI:.95},
  {h:24,  top:'#0b1030',bot:'#2a3a73',fog:'#1c2650',sky:[.46,.54,.88],gnd:[.28,.31,.52],sun:[.46,.58,1],amb:.09,sunI:.95}
];
function makeEnv(h){
  let i=0;while(i<ENVKEYS.length-2&&h>=ENVKEYS[i+1].h)i++;
  const A=ENVKEYS[i],B=ENVKEYS[i+1],k=cl((h-A.h)/(B.h-A.h));
  const L=(f)=>mixc(Array.isArray(A[f])?A[f]:hex(A[f]),Array.isArray(B[f])?B[f]:hex(B[f]),k);
  const sunI=lerp(A.sunI,B.sunI,k),sun=L('sun').map(v=>v*sunI);
  const night=h<12?1-sstep(5.3,6.6,h):sstep(17.2,18.6,h);
  const t=cl((h-6)/12),w=sstep(5,6.3,h)*(1-sstep(17.7,19,h));
  const sd=vnorm([Math.cos(Math.PI*t)*.85,Math.max(.28,Math.sin(Math.PI*t)),.38]),md=vnorm([-.4,.78,-.32]);
  const dir=vnorm(mixc(md,sd,w));
  return {h,night,dir,visDir:night>.5?md:sd,moon:night>.5,top:L('top'),bot:L('bot'),fog:L('fog'),sky:L('sky'),gnd:L('gnd'),sun,amb:lerp(A.amb,B.amb,k),fogN:55,fogF:175};
}
function wibHour(){
  try{const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',hour:'numeric',minute:'numeric',second:'numeric',hour12:false}).formatToParts(new Date());
    const g=t=>+(p.find(x=>x.type===t)||{value:0}).value;return (g('hour')%24)+g('minute')/60+g('second')/3600}
  catch(e){const d=new Date(Date.now()+7*3600e3);return d.getUTCHours()+d.getUTCMinutes()/60}
}

/* ---------- shader ---------- */
const VS_MAIN=`#version 300 es
in vec3 p; in vec2 uv; in vec3 cA; uniform mat4 M,VP,LVP;
out vec3 vW; out vec4 vL; out vec2 vUV; out vec3 vC;
void main(){vec4 w=M*vec4(p,1.);vW=w.xyz;vL=LVP*w;vUV=uv;vC=cA;gl_Position=VP*w;}`;
const FS_MAIN=`#version 300 es
precision highp float;
in vec3 vW; in vec4 vL; in vec2 vUV; in vec3 vC;
uniform vec3 sunDir,sunCol,skyCol,gndCol,fogCol,eye,gcol;
uniform float fogN,fogF,emis,gmix,useTex,alpha,recv,nofog,amb,shOn,shTs;
uniform sampler2D shm,tex; out vec4 o;
float shadow(){
  vec3 c=vL.xyz/vL.w*.5+.5;
  if(c.x<0.||c.x>1.||c.y<0.||c.y>1.||c.z>1.)return 1.;
  float s=0.;
  for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){float d=texture(shm,c.xy+vec2(float(i),float(j))*shTs*1.4).r;s+=c.z-.0009>d?0.:1.;}
  s/=9.;
  float e=max(abs(c.x-.5),abs(c.y-.5))*2.;
  return mix(s,1.,smoothstep(.78,1.,e));
}
void main(){
  vec3 N=normalize(cross(dFdx(vW),dFdy(vW)));
  vec3 base=vC;
  if(useTex>.5){vec4 tx=texture(tex,vUV);if(tx.a<.04)discard;base=tx.rgb;}
  float ndl=max(dot(N,sunDir),0.);
  float s=(recv>.5&&shOn>.5)?shadow():1.;
  vec3 hemi=mix(gndCol,skyCol,N.y*.5+.5);
  vec3 c=base*(hemi*.56+sunCol*(ndl*s)*.58+amb);
  c=mix(c,mix(base,gcol,gmix),emis);
  float f=smoothstep(fogN,fogF,length(vW-eye))*(1.-nofog);
  c=mix(c,fogCol,f);
  o=vec4(c,alpha);
}`;
const VS_DEPTH=`#version 300 es
in vec3 p; uniform mat4 M,LVP; void main(){gl_Position=LVP*M*vec4(p,1.);}`;
const FS_DEPTH=`#version 300 es
precision mediump float; out vec4 o; void main(){o=vec4(1.);}`;
const VS_SKY=`#version 300 es
in vec3 p; out float y; void main(){y=p.y*.5+.5;gl_Position=vec4(p.xy,.9999,1.);}`;
const FS_SKY=`#version 300 es
precision highp float; in float y; uniform vec3 top,bot; uniform float hy; out vec4 o;
void main(){o=vec4(mix(bot,top,smoothstep(hy-.02,hy+.65,y)),1.);}`;

/* ---------- renderer ---------- */
const R={
  gl:null,cv:null,W:1,H:1,dl:[],B:{},order:[],houseB:[],pools:null,stars:null,clouds:null,
  q:{shadow:true,scale:1,sh:1536},meshes:new Map(),tex:null,
  prog(vs,fs){const gl=this.gl,p=gl.createProgram();
    for(const [t,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(p,s)}
    gl.bindAttribLocation(p,0,'p');gl.bindAttribLocation(p,1,'uv');gl.bindAttribLocation(p,2,'cA');gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
    const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const a=gl.getActiveUniform(p,i);u[a.name]=gl.getUniformLocation(p,a.name)}return {p,u}},
  init(cv){
    const gl=this.gl=cv.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
    if(!gl)return false;this.cv=cv;
    this.P=this.prog(VS_MAIN,FS_MAIN);this.PD=this.prog(VS_DEPTH,FS_DEPTH);this.PS=this.prog(VS_SKY,FS_SKY);
    // segitiga layar penuh untuk langit
    this.tri=gl.createVertexArray();gl.bindVertexArray(this.tri);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    this.initShadow();
    return true},
  initShadow(){
    const gl=this.gl,S=this.q.sh;
    if(this.shTex)gl.deleteTexture(this.shTex);if(this.shFB)gl.deleteFramebuffer(this.shFB);
    this.shTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shTex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,S,S,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
    for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
    this.shFB=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shFB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shTex,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
    this.shOK=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null)},
  setQuality(hi){this.q.shadow=hi;this.q.scale=hi?1:.7;this.resize(true)},
  resize(force){
    const cv=this.cv,dpr=Math.min(window.devicePixelRatio||1,2)*this.q.scale;
    let w=Math.max(1,Math.round(cv.clientWidth*dpr)),h=Math.max(1,Math.round(cv.clientHeight*dpr));
    const px=w*h,maxPx=this.q.scale<1?1.2e6:2.6e6;if(px>maxPx){const k=Math.sqrt(maxPx/px);w=Math.round(w*k);h=Math.round(h*k)}
    if(force||cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}this.W=cv.width;this.H=cv.height},
  texFromCanvas(c,mip){
    const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
    if(mip){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR)}else gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    return t},
  /* mesh mentah → VAO (dengan cache) */
  mesh(raw){
    let m=this.meshes.get(raw);if(m)return m;const gl=this.gl;
    const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(raw.p),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
    if(raw.uv){const b2=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b2);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(raw.uv),gl.STATIC_DRAW);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,0,0)}
    gl.bindVertexArray(null);m={vao,n:raw.p.length/3,uv:!!raw.uv};this.meshes.set(raw,m);return m},
  batch(name,o,order){const b=new Batch(o);this.B[name]=b;if(order!==false)this.order.push(b);return b},
  uploadAll(){const gl=this.gl;for(const k in this.B){const b=this.B[k];if(b.n>0)b.upload(gl)}for(const b of this.houseB)if(b.n>0)b.upload(gl)},
  /* antrean gambar dinamis (pemain, NPC, pintu, awan, dll.) — diisi tiap frame */
  push(mesh,col,M,o){this.dl.push({m:mesh,c:typeof col==='string'?hex(col):col,M,o:o||null})},

  drawBatch(b,env,prog,depth){
    if(!b.vao)return;const gl=this.gl,u=prog.u;
    gl.bindVertexArray(b.vao);gl.uniformMatrix4fv(u.M,false,M4.I);
    if(!depth){
      const o=b.o;gl.uniform1f(u.emis,o.night?env.night*o.k:o.emis);gl.uniform1f(u.gmix,o.gmix);gl.uniform1f(u.useTex,o.tex?1:0);
      gl.uniform1f(u.alpha,o.alpha);gl.uniform1f(u.recv,o.recv?1:0);gl.uniform1f(u.nofog,o.nofog)}
    gl.drawArrays(gl.TRIANGLES,0,b.verts)},
  drawList(env,depth,prog){
    const gl=this.gl,u=prog.u;let blend=false;
    for(const d of this.dl){
      const o=d.o;if(depth&&o&&o.cast===false)continue;if(depth&&o&&o.tex)continue;
      const m=this.mesh(d.m);gl.bindVertexArray(m.vao);gl.uniformMatrix4fv(u.M,false,d.M);
      if(!depth){
        gl.vertexAttrib3f(2,d.c[0],d.c[1],d.c[2]);
        const a=o&&o.alpha!==undefined?o.alpha:1;
        if(a<1&&!blend){gl.enable(gl.BLEND);gl.depthMask(false);blend=true}else if(a>=1&&blend){gl.disable(gl.BLEND);gl.depthMask(true);blend=false}
        gl.uniform1f(u.emis,o&&o.emis||0);gl.uniform1f(u.gmix,o&&o.gmix||0);gl.uniform1f(u.alpha,a);
        gl.uniform1f(u.recv,o&&o.recv===false?0:1);gl.uniform1f(u.nofog,o&&o.nofog?1:0);
        if(o&&o.tex){gl.uniform1f(u.useTex,1);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,o.tex);gl.activeTexture(gl.TEXTURE0)}else gl.uniform1f(u.useTex,0)}
      gl.drawArrays(gl.TRIANGLES,0,m.n)}
    if(blend){gl.disable(gl.BLEND);gl.depthMask(true)}},

  render(cam,env,time){
    const gl=this.gl;this.resize();const W=this.W,H=this.H;
    const proj=M4.persp(cam.fov,W/H,.3,700),view=M4.look(cam.eye,cam.tgt,[0,1,0]),VP=M4.mul(proj,view);
    // ----- shadow map: ortho dari arah matahari/bulan, mengikuti pemain -----
    const hs=cam.top?58:36,S=this.q.sh,doSh=this.q.shadow&&this.shOK;
    let LVP=M4.I;
    {const f=cam.focus,d=env.dir;let c=[f[0],0,f[2]];
      let lv=M4.look([c[0]+d[0]*90,c[1]+d[1]*90,c[2]+d[2]*90],c,[0,1,0]);
      const sn=hs*2/S,rx=[lv[0],lv[4],lv[8]],uy=[lv[1],lv[5],lv[9]];
      const px=vdot(rx,c),py=vdot(uy,c),dx=Math.round(px/sn)*sn-px,dy=Math.round(py/sn)*sn-py;
      c=[c[0]+rx[0]*dx+uy[0]*dy,c[1]+rx[1]*dx+uy[1]*dy,c[2]+rx[2]*dx+uy[2]*dy];
      lv=M4.look([c[0]+d[0]*90,c[1]+d[1]*90,c[2]+d[2]*90],c,[0,1,0]);
      LVP=M4.mul(M4.ortho(-hs,hs,-hs,hs,5,190),lv)}
    if(doSh){
      gl.bindFramebuffer(gl.FRAMEBUFFER,this.shFB);gl.viewport(0,0,S,S);gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.PD.p);gl.uniformMatrix4fv(this.PD.u.LVP,false,LVP);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.CULL_FACE);
      gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(2,3);
      for(const b of this.order)if(b.o.cast)this.drawBatch(b,env,this.PD,true);
      this.drawList(env,true,this.PD);
      gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindFramebuffer(gl.FRAMEBUFFER,null)}
    // ----- pass utama -----
    gl.viewport(0,0,W,H);gl.clearColor(env.bot[0],env.bot[1],env.bot[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);gl.depthFunc(gl.LEQUAL);
    // langit
    gl.disable(gl.DEPTH_TEST);gl.useProgram(this.PS.p);
    const hy=.5+.5*Math.tan(cam.pitchView)/Math.tan(cam.fov/2);
    gl.uniform3fv(this.PS.u.top,env.top);gl.uniform3fv(this.PS.u.bot,env.bot);gl.uniform1f(this.PS.u.hy,cl(hy,-.5,1.4));
    gl.bindVertexArray(this.tri);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.enable(gl.DEPTH_TEST);
    const P=this.P,u=P.u;gl.useProgram(P.p);
    gl.uniformMatrix4fv(u.VP,false,VP);gl.uniformMatrix4fv(u.LVP,false,LVP);
    gl.uniform3fv(u.sunDir,env.dir);gl.uniform3fv(u.sunCol,env.sun);gl.uniform3fv(u.skyCol,env.sky);gl.uniform3fv(u.gndCol,env.gnd);gl.uniform3fv(u.fogCol,env.fog);
    gl.uniform3fv(u.eye,cam.eye);gl.uniform3f(u.gcol,1,.82,.42);gl.uniform1f(u.fogN,env.fogN);gl.uniform1f(u.fogF,env.fogF);gl.uniform1f(u.amb,env.amb);
    gl.uniform1f(u.shOn,doSh?1:0);gl.uniform1f(u.shTs,1/S);
    gl.uniform1i(u.shm,0);gl.uniform1i(u.tex,1);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.shTex);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,Atlas.tex);gl.activeTexture(gl.TEXTURE0);
    gl.vertexAttrib3f(2,1,1,1);
    // bintang & awan (mengikuti kamera)
    if(this.stars&&this.stars.vao&&env.night>.02){const o=this.stars.o;o.alpha=env.night;gl.enable(gl.BLEND);gl.depthMask(false);gl.uniformMatrix4fv(u.M,false,M4.T(cam.eye[0],0,cam.eye[2]));
      gl.bindVertexArray(this.stars.vao);gl.uniform1f(u.emis,1);gl.uniform1f(u.gmix,0);gl.uniform1f(u.useTex,0);gl.uniform1f(u.alpha,env.night);gl.uniform1f(u.recv,0);gl.uniform1f(u.nofog,1);gl.drawArrays(gl.TRIANGLES,0,this.stars.verts);
      gl.disable(gl.BLEND);gl.depthMask(true)}
    // batch statis
    for(const b of this.order)this.drawBatch(b,env,P,false);
    for(const b of this.houseB)this.drawBatch(b,env,P,false);
    // dinamis
    this.drawList(env,false,P);
    // kolam cahaya lampu jalan (malam)
    if(this.pools&&this.pools.vao&&env.night>.02){gl.enable(gl.BLEND);gl.depthMask(false);
      gl.bindVertexArray(this.pools.vao);gl.uniformMatrix4fv(u.M,false,M4.I);gl.uniform1f(u.emis,1);gl.uniform1f(u.gmix,0);gl.uniform1f(u.useTex,0);gl.uniform1f(u.alpha,env.night*.42);gl.uniform1f(u.recv,0);gl.uniform1f(u.nofog,0);
      gl.drawArrays(gl.TRIANGLES,0,this.pools.verts);gl.disable(gl.BLEND);gl.depthMask(true)}
    this.dl.length=0;
  }
};
