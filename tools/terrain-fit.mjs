import { readFileSync } from 'node:fs';
// ---- 原 ground() 移植(擬合基準) ----
const hash=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);};
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const tl=hash(xi,yi),tr=hash(xi+1,yi),bl=hash(xi,yi+1),br=hash(xi+1,yi+1);
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return tl*(1-u)*(1-v)+tr*u*(1-v)+bl*(1-u)*v+br*u*v;}
function fbm(x,y){let a=0,amp=1,f=1,t=0;for(let i=0;i<4;i++){a+=vnoise(x*f,y*f)*amp;t+=amp;amp*=.5;f*=2;}return a/t;}
const RZ=x=>18*Math.sin(x*0.012)-x*0.12;
function ground(x,z){const zc=RZ(x);let d=Math.abs(z-zc);const zr=RZ(150);
  if(z<zr){const xt=150-(zr-z)*0.10;d=Math.min(d,Math.abs(x-xt)*2.6);}
  let h; if(d<34)h=-7*(1-d/34);
  else{const t=d-34;h=Math.min(t*0.18,4)+fbm(x*0.013+5,z*0.013)*Math.min(t*0.14,16);}
  h+=Math.max(0,Math.abs(z)-118)*0.22*(0.4+fbm(x*0.02,z*0.02+7));
  h+=24*Math.exp(-(((x-30)**2)/700+((z-44)**2)/180)); return h;}
// ---- 生成器移植(與 index.html 同邏輯) ----
function _catmull(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;
  const f=(a,b,c,d)=>0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
  return [f(p0[0],p1[0],p2[0],p3[0]), f(p0[1],p1[1],p2[1],p3[1])];}
function _densify(ctrl,perSeg){ if(ctrl.length<2) return ctrl.slice();
  const e=[ctrl[0],...ctrl,ctrl[ctrl.length-1]], out=[];
  for(let i=1;i<e.length-2;i++) for(let s=0;s<perSeg;s++) out.push(_catmull(e[i-1],e[i],e[i+1],e[i+2],s/perSeg));
  out.push(e[e.length-2]); return out;}
function distSeg(px,pz,a,b){const vx=b[0]-a[0],vz=b[1]-a[1];const wx=px-a[0],wz=pz-a[1];
  const L=vx*vx+vz*vz||1e-9;let t=Math.max(0,Math.min(1,(wx*vx+wz*vz)/L));
  return Math.hypot(px-(a[0]+t*vx),pz-(a[1]+t*vz));}
function distPolyline(x,z,pts){let m=Infinity;for(let i=0;i<pts.length-1;i++)m=Math.min(m,distSeg(x,z,pts[i],pts[i+1]));return m;}
function terrainHeight(x,z,T){
  let carved=null,nearD=Infinity,nearR=null;
  for(const r of T.rivers){const d=distPolyline(x,z,r._dense);
    if(d<nearD){nearD=d;nearR=r;} if(d<r.halfWidth){const ch=r.depth*(1-d/r.halfWidth);carved=carved===null?ch:Math.min(carved,ch);}}
  let h; if(carved!==null)h=carved;
  else{const r=nearR,t=nearD-r.halfWidth,bf=r.bankFbm;
    h=Math.min(t*r.bankSlope,r.bankCap)+fbm(x*bf.scale+(bf.xOff||0),z*bf.scale)*Math.min(t*(bf.ampRate||0.14),bf.ampCap);}
  for(const b of T.bands){const v=Math.abs(b.axis==='z'?z:x);
    h+=Math.max(0,v-b.beyond)*b.slope*(b.fbm.base+fbm(x*b.fbm.scale,z*b.fbm.scale+b.fbm.offset));}
  for(const bm of T.bumps){const kx=bm.radius?bm.radius[0]*bm.radius[0]:bm.k[0],kz=bm.radius?bm.radius[1]*bm.radius[1]:bm.k[1];
    h+=bm.height*Math.exp(-(((x-bm.center[0])**2)/kx+((z-bm.center[1])**2)/kz));}
  return h;
}
// ---- 比對 ----
const T=JSON.parse(readFileSync(new URL('../data/terrain.json',import.meta.url)));
for(const r of T.rivers) r._dense=_densify(r.centerline,12);
let n=0,sum=0,mx=0,mxAt=null;
for(let iz=0;iz<=140;iz++)for(let ix=0;ix<=200;ix++){
  const x=-340+ix*(680/200), z=-230+iz*(460/140);
  const d=Math.abs(terrainHeight(x,z,T)-ground(x,z)); sum+=d; n++; if(d>mx){mx=d;mxAt=[x.toFixed(0),z.toFixed(0)];}}
console.log(`mean|Δ|=${(sum/n).toFixed(3)}  max|Δ|=${mx.toFixed(2)} @${mxAt}`);
