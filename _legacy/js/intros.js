/* ============================================================
   INTROS.JS — Animaciones de intro por modo (canvas)
   Extraído de ui.js para mejorar modularidad y mantenibilidad.
   ============================================================ */

import { getAvatarColorsByName, getInitials } from './participants.js';
import { perf } from './performance.js';

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════

/** Detector de rendimiento para intros (usa sistema centralizado) */
export function _isSlowDevice() {
  // Usar sistema centralizado si está disponible
  if (perf.level) {
    return perf.level !== 'full';
  }
  // Fallback al método original
  const cores = navigator.hardwareConcurrency || 4;
  const mem   = navigator.deviceMemory || 4;
  return cores <= 6 || mem <= 6;
}

/** Utilidad: crea el overlay base */
export function _introBase(dur) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9997;
    background:rgba(4,2,14,0.96);
    pointer-events:none;
    animation:overlayFadeIn 180ms ease both;
  `;
  document.body.appendChild(overlay);

  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  const W = Math.min(screenW, 480);
  const H = Math.min(screenH, 680);
  const offX = Math.floor((screenW - W) / 2);
  const offY = Math.floor((screenH - H) / 2);

  const canvas = document.createElement('canvas');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  canvas.style.cssText = `position:absolute;left:${offX}px;top:${offY}px;width:${W}px;height:${H}px;`;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);
  overlay.appendChild(canvas);

  const FADE = 250;
  setTimeout(() => {
    overlay.style.transition = `opacity ${FADE}ms ease`;
    overlay.style.opacity = '0';
  }, dur - FADE);
  setTimeout(() => overlay.remove(), dur + 50);

  return { overlay, canvas, ctx, W, H };
}

// ══════════════════════════════════════════════════════════
// ANIMACIONES FREE
// ══════════════════════════════════════════════════════════

/** NORMAL — Diana con crosshair animado + dardo que cae */
export function introNormal(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=1500; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const cx=W/2, cy=H*0.44;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const sparks=[]; let impacted=false, t=0;

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);
      ctx.fillStyle='rgba(0,0,0,0.04)'; ctx.fillRect(0,0,W,H);
      [80,62,44,28,13].forEach((r,i)=>{
        const show=Math.min(Math.max((p-i*0.05)/0.3,0),1);
        const er=1-Math.pow(1-show,3); if(er<=0) return;
        const pulse=1+0.055*Math.sin(t*0.013+i*0.9);
        const isRed=i%2===0;
        const outerR = Math.max(0, r*S*er*pulse);
        const innerR = Math.max(0, r*S*er*pulse-3*S);
        ctx.beginPath(); ctx.arc(cx,cy,outerR,0,Math.PI*2);
        ctx.fillStyle=isRed?`rgba(160,0,25,${0.22*er})`:`rgba(255,255,255,${0.06*er})`; ctx.fill();
        ctx.strokeStyle=isRed?`rgba(230,30,50,${er})`:`rgba(255,255,255,${er*0.28})`; ctx.lineWidth=2*S; ctx.stroke();
        if(innerR > 0) { ctx.beginPath(); ctx.arc(cx,cy,innerR,0,Math.PI*2);
        ctx.strokeStyle=isRed?`rgba(255,80,80,${er*0.3})`:`rgba(255,255,255,${er*0.1})`; ctx.lineWidth=0.8*S; ctx.stroke(); }
      });
      if(p>0.05&&p<0.95){
        const ca=Math.min((p-0.05)*4,1)*Math.min(1,(0.95-p)*10)*0.22;
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*0.0014);
        ctx.strokeStyle=`rgba(255,255,255,${ca})`; ctx.lineWidth=1.2*S; ctx.setLineDash([7,5]);
        ctx.beginPath(); ctx.moveTo(-W,0); ctx.lineTo(W,0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,-H); ctx.lineTo(0,H); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
          ctx.strokeStyle=`rgba(0,245,255,${ca*1.5})`; ctx.lineWidth=1.5*S;
          ctx.beginPath(); ctx.moveTo(cx+dx*88*S,cy+dy*88*S); ctx.lineTo(cx+dx*96*S,cy+dy*96*S); ctx.stroke();
        });
      }
      const dartP=Math.min(Math.max((p-0.36)/0.42,0),1);
      if(dartP>0){
        const ep=1-Math.pow(1-dartP,3);
        const dartY=cy-168*S+168*S*ep;
        if(ep<0.97){
          const tl=58*S*(1-ep);
          const trailGrad=ctx.createLinearGradient(cx,dartY-tl,cx,dartY);
          trailGrad.addColorStop(0,'rgba(0,245,255,0)');
          trailGrad.addColorStop(1,`rgba(0,245,255,${dartP*0.35})`);
          ctx.fillStyle=trailGrad; ctx.fillRect(cx-2.5*S,dartY-tl,5*S,tl);
        }
        ctx.save(); ctx.translate(cx,dartY);
        ctx.fillStyle=accent;
        ctx.beginPath(); ctx.moveTo(0,-24*S); ctx.lineTo(9*S,13*S); ctx.lineTo(-9*S,13*S); ctx.closePath(); ctx.fill();
        ctx.strokeStyle='rgba(0,245,255,0.5)'; ctx.lineWidth=1*S; ctx.stroke();
        ctx.fillStyle='#fff';
        ctx.beginPath(); ctx.moveTo(0,-30*S); ctx.lineTo(5*S,-20*S); ctx.lineTo(-5*S,-20*S); ctx.closePath(); ctx.fill();
        ctx.fillStyle=accent+'88';
        ctx.beginPath(); ctx.moveTo(-9*S,13*S); ctx.lineTo(-18*S,22*S); ctx.lineTo(-9*S,5*S); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(9*S,13*S); ctx.lineTo(18*S,22*S); ctx.lineTo(9*S,5*S); ctx.closePath(); ctx.fill();
        ctx.restore();
        if(dartP>0.92&&!impacted){
          impacted=true;
          const n=slow?8:14;
          for(let i=0;i<n;i++){const a=Math.PI*2/n*i+(Math.random()-0.5)*0.4,spd=(1.5+Math.random()*6)*S;sparks.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-1.2*S,alpha:1,color:i%3===0?'#FFD700':i%3===1?accent:'#FF3344',size:(2+Math.random()*3)*S});}
        }
      }
      if(p>0.77&&p<0.88){const fp=(p-0.77)/0.11,fb=fp<0.5?fp*2:2-fp*2;ctx.beginPath();ctx.arc(cx,cy,46*S*fb,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${fb*0.52})`;ctx.fill();}
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.11*S;s.alpha-=0.028;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      if(impacted){const gp=Math.min((p-0.79)/0.21,1)*0.92,pp=0.65+0.35*Math.sin(t*0.026);ctx.beginPath();ctx.arc(cx,cy,14*S*pp,0,Math.PI*2);ctx.fillStyle=accent;ctx.globalAlpha=gp*pp;ctx.fill();ctx.globalAlpha=1;}
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** ELIMINACION — Bombillas con cables realistas + explosion */
export function introElimination(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=1700; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const cy_b=H*0.42;
    const bulbs=[W*0.25,W*0.5,W*0.75].map((x,i)=>({x,y:cy_b,offAt:420+i*360,sparked:false}));
    const sparks=[]; let t=0;

    function drawBulb(b,lit,flicker){
      const alpha=flicker?(Math.sin(t*0.32)>0?0.08:1):1;
      ctx.save(); ctx.globalAlpha=alpha;
      const swing=lit?Math.sin(t*0.009+b.x)*2.5:0;
      const cableGrad=ctx.createLinearGradient(b.x,0,b.x+swing,b.y-32*S);
      cableGrad.addColorStop(0,'#333'); cableGrad.addColorStop(1,'#555');
      ctx.strokeStyle=cableGrad; ctx.lineWidth=3*S; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(b.x,0); ctx.lineTo(b.x+swing,b.y-32*S); ctx.stroke();
      ctx.fillStyle='#8a8a8a';
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(b.x+swing-9*S,b.y+24*S,18*S,10*S,2*S);ctx.fill();}
      else ctx.fillRect(b.x+swing-9*S,b.y+24*S,18*S,10*S);
      ctx.fillStyle='#666';
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(b.x+swing-11*S,b.y+34*S,22*S,5*S,1*S);ctx.fill();}
      else ctx.fillRect(b.x+swing-11*S,b.y+34*S,22*S,5*S);
      ctx.beginPath(); ctx.arc(b.x+swing,b.y,26*S,0,Math.PI*2);
      if(lit){
        const bulbGrad=ctx.createRadialGradient(b.x+swing-6*S,b.y-8*S,2*S,b.x+swing,b.y,26*S);
        bulbGrad.addColorStop(0,'rgba(255,255,200,0.98)');
        bulbGrad.addColorStop(0.4,'rgba(255,210,60,0.95)');
        bulbGrad.addColorStop(1,'rgba(255,150,20,0.85)');
        ctx.fillStyle=bulbGrad;
      } else {
        ctx.fillStyle='rgba(15,15,25,0.95)';
      }
      ctx.fill();
      ctx.strokeStyle=lit?'rgba(255,200,80,0.4)':'rgba(40,40,60,0.4)'; ctx.lineWidth=2*S; ctx.stroke();
      if(lit){
        ctx.strokeStyle='rgba(255,255,150,0.7)'; ctx.lineWidth=1.5*S;
        ctx.beginPath();
        ctx.moveTo(b.x+swing-6*S,b.y+6*S);
        for(let i=0;i<6;i++){ctx.lineTo(b.x+swing-6*S+i*2*S,b.y+(i%2===0?6:0)*S);}
        ctx.stroke();
        [55,43,34].forEach((gr,gi)=>{
          ctx.beginPath(); ctx.arc(b.x+swing,b.y,gr*S,0,Math.PI*2);
          ctx.fillStyle=`rgba(255,200,50,${0.1-gi*0.028})`; ctx.fill();
        });
      } else if(!flicker){
        const xp=0.65+0.35*Math.sin(t*0.022);
        ctx.strokeStyle=`rgba(255,0,80,${xp})`; ctx.lineWidth=4*S; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(b.x-13*S,b.y-13*S); ctx.lineTo(b.x+13*S,b.y+13*S); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x+13*S,b.y-13*S); ctx.lineTo(b.x-13*S,b.y+13*S); ctx.stroke();
        ctx.beginPath(); ctx.arc(b.x,b.y,30*S*xp,0,Math.PI*2);
        ctx.strokeStyle=`rgba(255,0,80,${0.2*xp})`; ctx.lineWidth=2*S; ctx.stroke();
      }
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H);
      const lit=bulbs.filter(b=>t<b.offAt).length;
      const warmth=lit/3;
      const bg=ctx.createRadialGradient(W/2,cy_b,20*S,W/2,cy_b,W*0.8);
      bg.addColorStop(0,`rgba(${Math.round(50*warmth)},${Math.round(20*warmth)},0,0.3)`);
      bg.addColorStop(1,'rgba(0,0,0,0.5)');
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
      bulbs.forEach(b=>{
        const isLit=t<b.offAt, flicker=!isLit&&t<b.offAt+200;
        if(!isLit&&!b.sparked&&t>b.offAt+70){
          b.sparked=true;
          const n=slow?6:9;
          for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2;sparks.push({x:b.x,y:b.y,vx:Math.cos(a)*(1.2+Math.random()*4.5)*S,vy:Math.sin(a)*(1.2+Math.random()*4.5)*S-0.9*S,alpha:1,color:i%3===0?'#FFD700':i%3===1?'#FFA500':'#fff'});}
        }
        drawBulb(b,isLit,flicker);
      });
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.alpha-=0.028;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,2.5*S*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** EQUIPO — Campo de fuerza que separa particulas en A y B */
export function introTeam(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1500; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const primary=getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()||'#7B2FBE';
    const N=slow?6:8;
    const pts=Array.from({length:N},(_,i)=>({a:Math.PI*2/N*i,r:40*S+Math.random()*10*S,spd:0.05+Math.random()*0.025,team:i<N/2?0:1,size:(5+Math.random()*3)*S}));
    const bSparks=[]; let blasted=false, t=0;

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);
      const cx=W/2,cy=H*0.42;
      const sep=Math.min(Math.max((p-0.22)/0.48,0),1);
      const eSep=1-Math.pow(1-sep,3);
      const offset=eSep*90*S;
      if(sep>0.1){
        const ep=(sep-0.1)/0.9;
        ctx.beginPath(); ctx.arc(cx-offset,cy,55*S,0,Math.PI*2);
        ctx.fillStyle=`rgba(0,245,255,${ep*0.08})`; ctx.fill();
        ctx.beginPath(); ctx.arc(cx+offset,cy,55*S,0,Math.PI*2);
        ctx.fillStyle=`rgba(123,47,190,${ep*0.08})`; ctx.fill();
      }
      if(sep>=1&&!blasted){blasted=true;const n=slow?6:12;for(let i=0;i<n;i++){const a=Math.PI*2/n*i,spd=(2+Math.random()*5)*S;bSparks.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,alpha:1,color:i%2===0?accent:primary});}}
      pts.forEach(pt=>{
        pt.a+=pt.spd*(0.28+0.72*(1-eSep));
        const teamX=cx+(pt.team===0?-offset:offset);
        const x=teamX+Math.cos(pt.a)*pt.r, y=cy+Math.sin(pt.a)*pt.r*0.62;
        const col=pt.team===0?accent:primary;
        ctx.beginPath(); ctx.arc(x,y,pt.size*2.8,0,Math.PI*2);
        const hGrad=ctx.createRadialGradient(x,y,0,x,y,pt.size*2.8);
        hGrad.addColorStop(0,col+'40'); hGrad.addColorStop(1,'transparent');
        ctx.fillStyle=hGrad; ctx.fill();
        const pGrad=ctx.createRadialGradient(x-pt.size*0.3,y-pt.size*0.3,0,x,y,pt.size);
        pGrad.addColorStop(0,'#fff'); pGrad.addColorStop(0.3,col); pGrad.addColorStop(1,col+'aa');
        ctx.beginPath(); ctx.arc(x,y,pt.size,0,Math.PI*2);
        ctx.fillStyle=pGrad; ctx.fill();
      });
      if(sep>0.28){
        const lp=Math.min((sep-0.28)/0.32,1);
        const lineGrad=ctx.createLinearGradient(cx,cy-85*S,cx,cy+85*S);
        lineGrad.addColorStop(0,'transparent'); lineGrad.addColorStop(0.3,`rgba(255,255,255,${lp*0.3})`);
        lineGrad.addColorStop(0.7,`rgba(255,255,255,${lp*0.3})`); lineGrad.addColorStop(1,'transparent');
        ctx.strokeStyle=lineGrad; ctx.lineWidth=1.5*S; ctx.setLineDash([8,5]);
        ctx.beginPath(); ctx.moveTo(cx,cy-85*S*lp); ctx.lineTo(cx,cy+85*S*lp); ctx.stroke(); ctx.setLineDash([]);
      }
      if(sep>0.58){
        const lp=Math.min((sep-0.58)/0.32,1), pulse=0.85+0.15*Math.sin(t*0.02);
        ['A','B'].forEach((lbl,i)=>{
          const col=i===0?accent:primary, lx=cx+(i===0?-offset-22*S:offset+22*S);
          ctx.save();
          ctx.font=`bold ${Math.round(34*S*lp*pulse)}px sans-serif`; ctx.textAlign='center';
          ctx.fillStyle=col+'44'; ctx.globalAlpha=lp;
          ctx.fillText(lbl,lx,cy+94*S+2);
          ctx.fillStyle=col; ctx.fillText(lbl,lx,cy+92*S);
          ctx.restore();
        });
      }
      bSparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.06*S;s.alpha-=0.038;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,3.5*S*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** ORDEN — Podio 3D con countdown + confeti */
export function introOrder(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=1800; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const n=slow?14:26;
    const confetti=Array.from({length:n},()=>({x:Math.random()*W,y:-15-Math.random()*80,vx:(Math.random()-0.5)*2.5*S,vy:(0.8+Math.random()*2)*S,rot:Math.random()*Math.PI*2,rotV:(Math.random()-0.5)*0.18,w:(4+Math.random()*7)*S,h:(3+Math.random()*5)*S,color:['#FFD700','#00F5FF','#FF006E','#A855F7','#39FF14','#FF6B00'][Math.floor(Math.random()*6)],delay:Math.random()*0.22}));
    const podium=[
      {label:'2',color:'#C0C0C0',sideColor:'#888',targetH:80*S,x:W/2-62*S,delay:0.33},
      {label:'1',color:'#FFD700',sideColor:'#B8860B',targetH:116*S,x:W/2,delay:0.26},
      {label:'3',color:'#CD7F32',sideColor:'#8B4513',targetH:58*S,x:W/2+62*S,delay:0.40},
    ];
    const baseY=H*0.72, barW=46*S; let t=0;

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);
      const spot=ctx.createRadialGradient(W/2,0,0,W/2,H*0.5,W*0.6);
      spot.addColorStop(0,'rgba(255,215,0,0.06)'); spot.addColorStop(1,'rgba(0,0,0,0.5)');
      ctx.fillStyle=spot; ctx.fillRect(0,0,W,H);
      if(p<0.26){
        const cp=p/0.26, digit=cp<0.33?'3':cp<0.66?'2':'1';
        const dp=(cp%0.333)/0.333;
        const sc=dp<0.2?dp*5:dp>0.82?(1-(dp-0.82)*5.5):1;
        const bounce=1+0.18*Math.sin(dp*Math.PI);
        ctx.font=`bold ${Math.round(76*S*sc*bounce)}px sans-serif`; ctx.textAlign='center';
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.globalAlpha=Math.min(sc*3,1);
        ctx.fillText(digit,W/2+3,H*0.46+3+8*S);
        ctx.fillStyle='#FFD700';
        ctx.fillText(digit,W/2,H*0.46+8*S); ctx.globalAlpha=1;
      }
      podium.forEach(pod=>{
        const bp=Math.max(0,Math.min((p-pod.delay)/0.40,1));
        const ep=1-Math.pow(1-bp,4);
        const h=pod.targetH*ep; if(h<1) return;
        const faceGrad=ctx.createLinearGradient(pod.x-barW/2,0,pod.x+barW/2,0);
        faceGrad.addColorStop(0,pod.color+'66'); faceGrad.addColorStop(0.5,pod.color+'99'); faceGrad.addColorStop(1,pod.color+'44');
        ctx.fillStyle=faceGrad; ctx.strokeStyle=pod.color; ctx.lineWidth=2;
        ctx.beginPath();
        if(ctx.roundRect) ctx.roundRect(pod.x-barW/2,baseY-h,barW,h,4); else ctx.rect(pod.x-barW/2,baseY-h,barW,h);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle=pod.sideColor+'44';
        ctx.beginPath();
        ctx.moveTo(pod.x+barW/2,baseY-h); ctx.lineTo(pod.x+barW/2+10*S,baseY-h-6*S);
        ctx.lineTo(pod.x+barW/2+10*S,baseY-6*S); ctx.lineTo(pod.x+barW/2,baseY);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle=pod.sideColor; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle=pod.color+'cc';
        ctx.beginPath();
        ctx.moveTo(pod.x-barW/2,baseY-h); ctx.lineTo(pod.x+barW/2,baseY-h);
        ctx.lineTo(pod.x+barW/2+10*S,baseY-h-6*S); ctx.lineTo(pod.x-barW/2+10*S,baseY-h-6*S);
        ctx.closePath(); ctx.fill(); ctx.strokeStyle=pod.color; ctx.stroke();
        if(bp>0.5){
          const np=Math.min((bp-0.5)/0.4,1), spring=1+Math.sin(np*Math.PI)*0.22;
          ctx.font=`bold ${Math.round(32*S*np*spring)}px sans-serif`; ctx.textAlign='center';
          ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.globalAlpha=np;
          ctx.fillText(pod.label,pod.x+1,baseY-h-11*S+1);
          ctx.fillStyle=pod.color; ctx.fillText(pod.label,pod.x,baseY-h-12*S);
          ctx.globalAlpha=1;
        }
      });
      ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(W*0.06,baseY); ctx.lineTo(W*0.94,baseY); ctx.stroke();
      confetti.forEach(c=>{
        if(p<c.delay+0.40) return;
        c.x+=c.vx; c.y+=c.vy; c.rot+=c.rotV;
        if(c.y>H+12){c.y=-12;c.x=Math.random()*W;}
        ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.rot);
        ctx.fillStyle=c.color; ctx.globalAlpha=0.9;
        ctx.fillRect(-c.w/2,-c.h/2,c.w,c.h); ctx.restore();
      });
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** DUELO — Dos avatares con energia que chocan */
export function introDuel(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1500; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const r=30*S, cy=H*0.44; const sparks=[]; let clashed=false, t=0;

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);
      const approach=Math.min(Math.max((p-0.14)/0.5,0),1);
      const ea=1-Math.pow(1-approach,3);
      const maxDist=W*0.37-r;
      const cx1=W/2-maxDist*(1-ea)-r, cx2=W/2+maxDist*(1-ea)+r;
      if(approach>0.3){
        const ep=(approach-0.3)/0.7;
        [cx1,cx2].forEach((x,i)=>{
          const col=i===0?accent:impact;
          const g=ctx.createRadialGradient(x,cy,0,x,cy,r*3);
          g.addColorStop(0,col+'22'); g.addColorStop(1,'transparent');
          ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
        });
      }
      if(p<0.2){
        const vp=p/0.2, pulse=0.88+0.12*Math.sin(t*0.04);
        ctx.font=`bold ${Math.round(52*S*vp*pulse)}px sans-serif`; ctx.textAlign='center';
        ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.globalAlpha=vp; ctx.fillText('VS',W/2+2,cy+12*S);
        ctx.fillStyle='#fff'; ctx.fillText('VS',W/2,cy+10*S); ctx.globalAlpha=1;
      }
      if(approach>0&&approach<1){[0.12,0.07,0.03].forEach((oa,i)=>{const trx=W/2-maxDist*(1-Math.max(ea-oa,0))-r;ctx.beginPath();ctx.arc(trx,cy,r,0,Math.PI*2);ctx.fillStyle=accent;ctx.globalAlpha=0.04+i*0.025;ctx.fill();ctx.beginPath();ctx.arc(W/2+maxDist*(1-Math.max(ea-oa,0))+r,cy,r,0,Math.PI*2);ctx.fillStyle=impact;ctx.globalAlpha=0.04+i*0.025;ctx.fill();ctx.globalAlpha=1;});}
      [cx1,cx2].forEach((x,i)=>{
        const col=i===0?accent:impact;
        const ag=ctx.createRadialGradient(x-r*0.3,cy-r*0.3,0,x,cy,r);
        ag.addColorStop(0,'#fff'); ag.addColorStop(0.25,col); ag.addColorStop(1,col+'88');
        ctx.beginPath(); ctx.arc(x,cy,r,0,Math.PI*2);
        ctx.fillStyle=ag; ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1.5*S; ctx.stroke();
      });
      if(approach>0.5){const ep=(approach-0.5)/0.5,mid=(cx1+cx2)/2,dist=(cx2-cx1)/2;if(dist>0){ctx.beginPath();ctx.arc(mid,cy,dist,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${ep*0.07})`;ctx.fill();}}
      if(approach>=1&&!clashed){clashed=true;const n=slow?8:16;for(let i=0;i<n;i++){const a=Math.PI*2/n*i,spd=(2+Math.random()*7)*S;sparks.push({x:W/2,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,alpha:1,color:i%2===0?accent:impact,size:(2+Math.random()*3)*S});}}
      const clashT=DUR*0.64;
      if(t>clashT&&t<clashT+260){const fp=(t-clashT)/260,fb=fp<0.5?fp*2:2-fp*2;ctx.beginPath();ctx.arc(W/2,cy,72*S*fb,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${fb*0.65})`;ctx.fill();}
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.vx*=0.97;s.alpha-=0.028;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      if(clashed){const rb=Math.min((t-DUR*0.64)/(DUR*0.36),1),eRb=1-Math.pow(1-rb,2);ctx.globalAlpha=(1-rb)*0.55;ctx.beginPath();ctx.arc(W/2-r-eRb*maxDist*0.75,cy,r*(1-rb*0.45),0,Math.PI*2);ctx.fillStyle=accent;ctx.fill();ctx.beginPath();ctx.arc(W/2+r+eRb*maxDist*0.75,cy,r*(1-rb*0.45),0,Math.PI*2);ctx.fillStyle=impact;ctx.fill();ctx.globalAlpha=1;}
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** VENGANZA — Llamas orbitando + rayo + explosion */
export function introRevenge(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=1500; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const orange='#FF6B00';
    const maxFlames=slow?11:20;
    const flames=Array.from({length:maxFlames},()=>({a:Math.random()*Math.PI*2,fr:(6+Math.random()*20)*S,life:Math.random(),spawnAt:Math.random()*0.18,size:(4+Math.random()*7)*S}));
    const bSparks=[]; let struck=false, t=0;

    function draw(){
      ctx.clearRect(0,0,W,H);
      const p=Math.min(t/DUR,1);
      const cx=W/2, cy=H*0.44, r=38*S;
      ctx.fillStyle=`rgba(60,5,0,${p*0.12})`; ctx.fillRect(0,0,W,H);
      const ap=Math.min(p/0.26,1), aEase=1-Math.pow(1-ap,3);
      const avGrad=ctx.createRadialGradient(cx-r*0.25,cy-r*0.25,0,cx,cy,r*aEase);
      avGrad.addColorStop(0,'#ff6688'); avGrad.addColorStop(0.5,'#cc2244'); avGrad.addColorStop(1,'#880022');
      ctx.beginPath(); ctx.arc(cx,cy,r*aEase,0,Math.PI*2);
      ctx.fillStyle=avGrad; ctx.fill();
      ctx.strokeStyle='rgba(255,50,80,0.4)'; ctx.lineWidth=2*S; ctx.stroke();
      if(p>0.08) flames.forEach(f=>{
        if(p<f.spawnAt) return;
        f.life=(f.life+0.042)%1;
        const lp=f.life<0.5?f.life*2:2-f.life*2;
        const wobble=Math.sin(t*0.02+f.a)*3*S;
        const fx=cx+Math.cos(f.a)*(r+f.fr*lp+8*S)+wobble;
        const fy=cy+Math.sin(f.a)*(r+f.fr*lp+8*S)*0.78;
        const fGrad=ctx.createRadialGradient(fx,fy,0,fx,fy,f.size*lp);
        fGrad.addColorStop(0,'rgba(255,230,100,0.9)');
        fGrad.addColorStop(0.5,lp>0.5?'rgba(255,140,0,0.7)':'rgba(255,60,0,0.6)');
        fGrad.addColorStop(1,'transparent');
        ctx.beginPath(); ctx.arc(fx,fy,f.size*lp,0,Math.PI*2);
        ctx.fillStyle=fGrad; ctx.fill();
      });
      if(p>0.05){
        const rp=Math.min(p*4,1);
        for(let ring=1;ring<=3;ring++){
          const pulse=0.82+0.18*Math.sin(t*0.02+ring*1.1);
          const rr=(r+ring*24*S)*rp*pulse;
          ctx.beginPath(); ctx.arc(cx,cy,rr,0,Math.PI*2);
          ctx.strokeStyle=ring===1?impact:orange;
          ctx.lineWidth=(5-ring*0.8)*S;
          ctx.globalAlpha=(1/ring)*rp*0.72; ctx.stroke(); ctx.globalAlpha=1;
          if(ring===1){ctx.beginPath();ctx.arc(cx,cy,rr,0,Math.PI*2);ctx.strokeStyle=impact;ctx.lineWidth=(8)*S;ctx.globalAlpha=0.08*rp;ctx.stroke();ctx.globalAlpha=1;}
        }
      }
      if(p>0.34){
        const lp=Math.min((p-0.34)/0.38,1), el=1-Math.pow(1-lp,3);
        const boltY=cy-148*S+108*S*el;
        ctx.save(); ctx.translate(cx,boltY); ctx.globalAlpha=lp*0.4;
        ctx.fillStyle='rgba(255,220,50,0.5)';
        ctx.beginPath(); ctx.moveTo(12*S,-24*S); ctx.lineTo(-8*S,8*S); ctx.lineTo(6*S,8*S);
        ctx.lineTo(-12*S,32*S); ctx.lineTo(8*S,4*S); ctx.lineTo(-4*S,4*S);
        ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(cx,boltY); ctx.globalAlpha=lp;
        ctx.fillStyle='#FFD700';
        ctx.beginPath(); ctx.moveTo(10*S,-22*S); ctx.lineTo(-6*S,6*S); ctx.lineTo(4*S,6*S);
        ctx.lineTo(-10*S,28*S); ctx.lineTo(6*S,2*S); ctx.lineTo(-4*S,2*S);
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      if(p>0.72&&!struck){struck=true;const n=slow?7:13;for(let i=0;i<n;i++){const a=Math.PI*2/n*i,spd=(2+Math.random()*6)*S;bSparks.push({x:cx,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2*S,alpha:1,color:i%2===0?'#FFD700':orange});}}
      if(p>0.72&&p<0.85){const fp=(p-0.72)/0.13,fb=fp<0.5?fp*2:2-fp*2;ctx.beginPath();ctx.arc(cx,cy,54*S*fb,0,Math.PI*2);ctx.fillStyle=`rgba(255,220,50,${fb*0.55})`;ctx.fill();}
      bSparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.alpha-=0.030;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,3*S*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      if(p>0.78){const pp=(p-0.78)/0.22,pulse2=0.62+0.38*Math.sin(t*0.026);ctx.beginPath();ctx.arc(cx,cy,r*(1+pp*1.6),0,Math.PI*2);ctx.strokeStyle=impact;ctx.lineWidth=4*S*(1-pp)*pulse2;ctx.globalAlpha=(1-pp)*pulse2*0.75;ctx.stroke();ctx.globalAlpha=1;}
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/* ═══════════════════════════════════════════════════════════
   ANIMACIONES PRO
   ═══════════════════════════════════════════════════════════ */

/** NORMAL PRO A — Misil: lanzamiento con trail → impacto */
export function introNormalMissile(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1800; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const cx=W/2, cy=H*0.44, c=winnerColors||{color:accent,gradient:accent};
    const sparks=[]; let impacted=false, t=0, targetX=cx, targetY=cy, trailPts=[];

    function draw(){
      ctx.clearRect(0,0,W,H); const p=Math.min(t/DUR,1);
      ctx.strokeStyle='rgba(0,245,255,0.04)'; ctx.lineWidth=1;
      for(let i=0;i<8;i++){ctx.beginPath(); ctx.arc(cx,cy,(i+1)*48*S,0,Math.PI*2); ctx.stroke();}
      ctx.globalAlpha=0.06;
      for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*W,cy+Math.sin(a)*W); ctx.stroke();}
      ctx.globalAlpha=1;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*0.025);
      const sweep=ctx.createLinearGradient(0,0,W*0.5,0);
      sweep.addColorStop(0,'rgba(0,245,255,0.12)'); sweep.addColorStop(1,'rgba(0,245,255,0)');
      ctx.fillStyle=sweep; ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,W*0.7,-Math.PI*0.1,0.1); ctx.closePath(); ctx.fill(); ctx.restore();

      const launch=Math.min(p/0.4,1), eLaunch=1-Math.pow(1-launch,3);
      const mX=W*0.1+(targetX-W*0.1)*eLaunch, mY=H*0.05+(targetY-H*0.05)*eLaunch-Math.sin(launch*Math.PI)*H*0.18;
      const angle=Math.atan2((targetY-H*0.05+Math.cos(launch*Math.PI)*H*0.18*Math.PI/1), targetX-W*0.1);
      trailPts.push({x:mX,y:mY}); if(trailPts.length>14) trailPts.shift();
      trailPts.forEach((pt,i)=>{const ta=i/trailPts.length;ctx.beginPath();ctx.arc(pt.x,pt.y,5*S*ta,0,Math.PI*2);ctx.fillStyle=`rgba(0,245,255,${ta*0.25})`;ctx.fill();});

      if(p<0.42){
        ctx.save(); ctx.translate(mX,mY); ctx.rotate(angle+Math.PI/2);
        const mGrad=ctx.createLinearGradient(0,-24*S,0,16*S); mGrad.addColorStop(0,'#fff'); mGrad.addColorStop(0.3,accent); mGrad.addColorStop(1,accent+'88');
        ctx.fillStyle=mGrad; ctx.beginPath(); ctx.moveTo(0,-24*S); ctx.lineTo(9*S,10*S); ctx.lineTo(-9*S,10*S); ctx.closePath(); ctx.fill();
        ctx.fillStyle=accent+'aa'; ctx.beginPath(); ctx.moveTo(-9*S,10*S); ctx.lineTo(-18*S,18*S); ctx.lineTo(-9*S,0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(9*S,10*S); ctx.lineTo(18*S,18*S); ctx.lineTo(9*S,0); ctx.closePath(); ctx.fill();
        const flame=0.6+0.4*Math.sin(t*0.3);
        ctx.fillStyle=`rgba(255,180,0,${flame*0.9})`; ctx.beginPath(); ctx.moveTo(-5*S,12*S); ctx.lineTo(5*S,12*S); ctx.lineTo(0,(18+flame*10)*S); ctx.closePath(); ctx.fill();
        ctx.fillStyle=`rgba(255,255,100,${flame*0.7})`; ctx.beginPath(); ctx.moveTo(-3*S,12*S); ctx.lineTo(3*S,12*S); ctx.lineTo(0,(14+flame*6)*S); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      if(p>0.38){
        const ip=Math.min((p-0.38)/0.37,1);
        if(ip<0.06&&!impacted){impacted=true;const n=slow?10:17;for(let i=0;i<n;i++){const a=Math.PI*2/n*i,spd=(2+Math.random()*8)*S;sparks.push({x:targetX,y:targetY,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,alpha:1,color:i%3===0?'#FFD700':i%3===1?accent:'#FF3344',size:(2+Math.random()*3.5)*S});}}
        if(ip<0.3){const fb=(ip<0.15?ip/0.15:(0.3-ip)/0.15);ctx.beginPath();ctx.arc(targetX,targetY,65*S*fb,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${fb*0.65})`;ctx.fill();}
        [70,52,36,22,10].forEach((r,i)=>{const show=Math.min(Math.max((ip-i*0.07)/0.3,0),1),er=1-Math.pow(1-show,3);if(er<=0)return;const pulse=1+0.05*Math.sin(t*0.015+i*0.8);ctx.beginPath();ctx.arc(targetX,targetY,r*S*er*pulse,0,Math.PI*2);ctx.fillStyle=i%2===0?`rgba(160,0,25,${0.22*er})`:`rgba(255,255,255,${0.06*er})`;ctx.fill();ctx.strokeStyle=i%2===0?`rgba(230,30,50,${er})`:`rgba(255,255,255,${er*0.3})`;ctx.lineWidth=2*S;ctx.stroke();});
      }
      if(p>0.72){const gp=Math.min((p-0.72)/0.28,1),pulse=0.8+0.2*Math.sin(t*0.025);ctx.beginPath();ctx.arc(targetX,targetY,40*S*gp*pulse,0,Math.PI*2);const wGrad=ctx.createRadialGradient(targetX,targetY,0,targetX,targetY,40*S*gp);wGrad.addColorStop(0,c.color+'66');wGrad.addColorStop(1,'transparent');ctx.fillStyle=wGrad;ctx.fill();ctx.beginPath();ctx.arc(targetX,targetY,28*S*gp,0,Math.PI*2);ctx.fillStyle=c.gradient||c.color;ctx.globalAlpha=gp;ctx.fill();ctx.globalAlpha=1;}
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.alpha-=0.025;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1; t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** NORMAL PRO B — Francotirador: mira con viñeta busca y hace lock */
export function introNormalSniper(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=2000; const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const c=winnerColors||{color:accent}; const targetX=W/2, targetY=H*0.44;
    const sparks=[]; let locked=false, t=0;

    function drawScope(cx,cy,alpha,lockP){
      ctx.save(); ctx.globalAlpha=alpha; const R=58*S;
      const lensGrad=ctx.createRadialGradient(cx,cy,R*0.7,cx,cy,R);
      lensGrad.addColorStop(0,'rgba(0,245,255,0.08)'); lensGrad.addColorStop(1,'rgba(0,245,255,0.3)');
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fillStyle='rgba(0,20,30,0.4)'; ctx.fill();
      ctx.strokeStyle=lensGrad; ctx.lineWidth=4*S; ctx.stroke();
      ctx.strokeStyle='rgba(0,245,255,0.6)'; ctx.lineWidth=2*S; ctx.stroke();
      const chCol=lockP>0.5?`rgba(255,50,50,${0.6+0.4*Math.sin(t*0.05)})`:`rgba(0,245,255,0.75)`;
      ctx.strokeStyle=chCol; ctx.lineWidth=1.2*S;
      ctx.beginPath(); ctx.moveTo(cx-R,cy); ctx.lineTo(cx-R*0.25,cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+R*0.25,cy); ctx.lineTo(cx+R,cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy-R); ctx.lineTo(cx,cy-R*0.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy+R*0.25); ctx.lineTo(cx,cy+R); ctx.stroke();
      [0.55,0.35,0.18].forEach((f,i)=>{ctx.beginPath();ctx.arc(cx,cy,R*f,0,Math.PI*2);ctx.strokeStyle=`rgba(0,245,255,${0.25-i*0.07})`;ctx.lineWidth=1*S;ctx.stroke();});
      ctx.beginPath(); ctx.arc(cx,cy,2.5*S,0,Math.PI*2); ctx.fillStyle=lockP>0.5?'#ff3333':accent; ctx.fill();
      for(let i=0;i<12;i++){const a=i*Math.PI/6,mark=i%3===0?10*S:5*S;ctx.strokeStyle=`rgba(0,245,255,0.35)`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*(R-mark),cy+Math.sin(a)*(R-mark));ctx.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);ctx.stroke();}
      if(lockP>0){const lp=lockP,cs=22*S,lr=R;ctx.strokeStyle=`rgba(255,50,50,${lp})`;ctx.lineWidth=3*S;[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx,sy])=>{ctx.beginPath();ctx.moveTo(cx+sx*(lr-cs),cy+sy*lr);ctx.lineTo(cx+sx*lr,cy+sy*lr);ctx.lineTo(cx+sx*lr,cy+sy*(lr-cs));ctx.stroke();});
        if(lp>0.5){ctx.font=`bold ${Math.round(9*S)}px monospace`;ctx.textAlign='center';ctx.fillStyle=`rgba(255,50,50,${lp})`;ctx.fillText('TARGET LOCKED',cx,cy+R+18*S);ctx.fillStyle=`rgba(0,245,255,${lp*0.6})`;ctx.fillText(`DST: ${Math.round(138-lp*38)}m`,cx-R*0.6,cy-R-8*S);ctx.fillText(`WND: ${Math.round(2.4-lp*2.1)}m/s`,cx+R*0.5,cy-R-8*S);}}
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H); const p=Math.min(t/DUR,1);
      const vig=ctx.createRadialGradient(W/2,H/2,W*0.22,W/2,H/2,W*0.75);
      vig.addColorStop(0,'transparent'); vig.addColorStop(1,'rgba(0,0,0,0.82)');
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
      const search=Math.min(p/0.6,1), lock=Math.min(Math.max((p-0.6)/0.4,0),1);
      const eSearch=1-Math.pow(1-search,2), eLock=1-Math.pow(1-lock,4);
      let scX,scY;
      if(p<0.6){scX=W*0.15+(W*0.55-W*0.15)*eSearch+Math.sin(t*0.014)*22*S*(1-eSearch);scY=H*0.25+(H*0.6-H*0.25)*eSearch+Math.cos(t*0.018)*14*S*(1-eSearch);}
      else{scX=W*0.7+(targetX-W*0.7)*eLock;scY=H*0.6+(targetY-H*0.6)*eLock;}
      if(p>0.08&&p<0.9){ctx.strokeStyle=`rgba(0,245,255,${0.12*(1-lock)})`;ctx.lineWidth=1*S;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(W*0.15,H*0.25);ctx.lineTo(scX,scY);ctx.stroke();ctx.setLineDash([]);}
      drawScope(scX,scY,Math.min(p*5,1),lock);
      if(lock>0.7){const gp=(lock-0.7)/0.3,pulse=0.7+0.3*Math.sin(t*0.03);ctx.beginPath();ctx.arc(targetX,targetY,44*S*gp*pulse,0,Math.PI*2);const rg=ctx.createRadialGradient(targetX,targetY,0,targetX,targetY,44*S);rg.addColorStop(0,'rgba(255,0,0,0.2)');rg.addColorStop(1,'transparent');ctx.fillStyle=rg;ctx.fill();ctx.beginPath();ctx.arc(targetX,targetY,9*S*gp,0,Math.PI*2);ctx.fillStyle=`rgba(255,50,50,${gp*0.8})`;ctx.fill();}
      if(p>0.94&&!locked){locked=true;for(let i=0;i<18;i++){const a=Math.random()*Math.PI*2,spd=(1+Math.random()*5)*S;sparks.push({x:targetX,y:targetY,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,alpha:1,color:i%2===0?accent:'#FF3344',size:(1.5+Math.random()*2.5)*S});}}
      if(p>0.94&&p<0.99){const fp=(p-0.94)/0.05,fb=fp<0.5?fp*2:2-fp*2;ctx.beginPath();ctx.arc(targetX,targetY,55*S*fb,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${(1-fb)*0.7})`;ctx.fill();}
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.09*S;s.alpha-=0.038;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1; t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** ELIMINACIÓN PRO A — Sillas musicales con física */
export function introElimChairs(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=1800; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const gold='#FFD700'; const sparks=[]; let t=0;
    const chairs=[{x:W*0.22,fallAt:320,color:accent,rot:0,rotDir:1,fallen:false,sparked:false},{x:W*0.5,fallAt:700,color:gold,rot:0,rotDir:-1,fallen:false,sparked:false},{x:W*0.78,fallAt:1100,color:impact,rot:0,rotDir:1,fallen:false,sparked:false}];
    const baseY=H*0.52;

    function drawChair(x,y,rot,col,fallen){
      ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
      const cGrad=ctx.createLinearGradient(-20*S,-30*S,20*S,30*S); cGrad.addColorStop(0,col+'ee'); cGrad.addColorStop(1,col+'88');
      ctx.strokeStyle=cGrad; ctx.lineWidth=5*S; ctx.lineCap='round'; ctx.lineJoin='round';
      ctx.beginPath(); ctx.moveTo(-18*S,-2*S); ctx.lineTo(18*S,-2*S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14*S,-2*S); ctx.lineTo(-14*S,26*S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14*S,-2*S); ctx.lineTo(14*S,26*S); ctx.stroke();
      ctx.lineWidth=3*S; ctx.beginPath(); ctx.moveTo(-14*S,14*S); ctx.lineTo(14*S,14*S); ctx.stroke();
      ctx.lineWidth=5*S; ctx.beginPath(); ctx.moveTo(-14*S,-2*S); ctx.lineTo(-14*S,-28*S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14*S,-2*S); ctx.lineTo(14*S,-28*S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14*S,-28*S); ctx.lineTo(14*S,-28*S); ctx.stroke();
      ctx.lineWidth=2*S; ctx.strokeStyle=col+'44';
      ctx.beginPath(); ctx.moveTo(-5*S,-28*S); ctx.lineTo(-5*S,-2*S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5*S,-28*S); ctx.lineTo(5*S,-2*S); ctx.stroke();
      if(fallen){ctx.strokeStyle=impact;ctx.lineWidth=3.5*S;ctx.beginPath();ctx.moveTo(-14*S,-12*S);ctx.lineTo(14*S,12*S);ctx.stroke();ctx.beginPath();ctx.moveTo(14*S,-12*S);ctx.lineTo(-14*S,12*S);ctx.stroke();}
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H); const p=Math.min(t/DUR,1);
      ctx.fillStyle='rgba(80,50,20,0.15)'; for(let i=0;i<6;i++){ctx.fillRect(W*i/6,baseY+22*S,W/6-1,8*S);}
      ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,baseY+22*S); ctx.lineTo(W,baseY+22*S); ctx.stroke();
      if(p<0.85){const np=Math.abs(Math.sin(t*0.06))*0.6+0.2;ctx.fillStyle=`rgba(255,215,0,${np})`;ctx.font=`bold ${Math.round(26*S)}px sans-serif`;ctx.textAlign='center';ctx.fillText('do',W/2,H*0.18);ctx.fillText('re',W/2-60*S,H*0.22);ctx.fillText('mi',W/2+55*S,H*0.2);}
      chairs.forEach(ch=>{
        if(!ch.fallen&&t>ch.fallAt) ch.fallen=true;
        if(ch.fallen&&Math.abs(ch.rot)<Math.PI/2) ch.rot+=0.08*ch.rotDir*(1-Math.abs(ch.rot)/(Math.PI/2)*0.4);
        if(ch.fallen&&!ch.sparked&&Math.abs(ch.rot)>Math.PI/3){ch.sparked=true;const n=slow?6:8;for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2;sparks.push({x:ch.x,y:baseY,vx:Math.cos(a)*(1+Math.random()*3.5)*S,vy:Math.sin(a)*(1+Math.random()*3.5)*S-1*S,alpha:1,color:ch.color});}}
        ctx.save(); ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(ch.x,baseY+24*S,22*S*(1-Math.abs(ch.rot)/(Math.PI/2)*0.4),5*S,0,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fill(); ctx.restore();
        drawChair(ch.x,baseY,ch.fallen?Math.min(ch.rot,Math.PI/2*ch.rotDir):0,ch.color,ch.fallen&&Math.abs(ch.rot)>Math.PI/2.2);
      });
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.alpha-=0.035;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,2.5*S*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1; t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** ELIMINACIÓN PRO B — Tragamonedas / Jackpot */
export function introElimSlots(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=2400; const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const gold='#FFD700', goldDim='#B8860B';
    const symbols=['7','$','BAR','*','7'], symColors=['#FF4444','#44FF88','#FFD700','#4488FF','#FF4444'];
    const mW=200*S, mH=260*S, mX=W/2-mW/2, mY=H/2-mH/2-10*S;
    const reelW=50*S, reelH=160*S, reelY=mY+58*S;
    const reels=[{x:mX+18*S+reelW/2,stopAt:700,done:false},{x:mX+18*S+reelW+6*S+reelW/2,stopAt:1200,done:false},{x:mX+18*S+2*(reelW+6*S)+reelW/2,stopAt:1700,done:false}];
    const sparks=[]; let fired=false, t=0;

    function machine(){
      ctx.fillStyle='#140828'; if(ctx.roundRect){ctx.beginPath();ctx.roundRect(mX,mY,mW,mH,14*S);ctx.fill();} else ctx.fillRect(mX,mY,mW,mH);
      ctx.strokeStyle=gold; ctx.lineWidth=4*S; if(ctx.roundRect){ctx.beginPath();ctx.roundRect(mX,mY,mW,mH,14*S);ctx.stroke();} else ctx.strokeRect(mX,mY,mW,mH);
      ctx.fillStyle='#200a40'; ctx.fillRect(mX+8*S,mY+8*S,mW-16*S,40*S);
      ctx.strokeStyle=goldDim; ctx.lineWidth=1.5*S; ctx.strokeRect(mX+8*S,mY+8*S,mW-16*S,40*S);
      const pulse=0.7+0.3*Math.sin(t*0.04);
      ctx.font=`bold ${Math.round(20*S)}px sans-serif`; ctx.textAlign='center';
      ctx.fillStyle=`rgba(255,215,0,${pulse})`; ctx.fillText('JACKPOT',W/2,mY+36*S);
      ctx.strokeStyle=`rgba(255,215,0,0.65)`; ctx.lineWidth=2*S; ctx.setLineDash([5,4]);
      ctx.beginPath(); ctx.moveTo(mX+10*S,reelY+reelH/2); ctx.lineTo(mX+mW-10*S,reelY+reelH/2); ctx.stroke(); ctx.setLineDash([]);
      const lx=mX+mW+2*S, ly0=mY+mH*0.3, lyEnd=mY+mH*0.65, lyKnob=ly0+(lyEnd-ly0)*Math.min(t/500,1);
      ctx.strokeStyle=gold; ctx.lineWidth=5*S; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(lx,ly0); ctx.lineTo(lx,lyKnob); ctx.stroke();
      ctx.beginPath(); ctx.arc(lx,lyKnob,8*S,0,Math.PI*2); ctx.fillStyle='#FF3333'; ctx.fill(); ctx.strokeStyle=goldDim; ctx.lineWidth=2*S; ctx.stroke();
      ctx.fillStyle='#0a0418'; ctx.fillRect(mX+mW*0.2,mY+mH-26*S,mW*0.6,18*S);
      ctx.strokeStyle=goldDim; ctx.lineWidth=1*S; ctx.strokeRect(mX+mW*0.2,mY+mH-26*S,mW*0.6,18*S);
    }

    function reel(r,idx){
      const stopped=t>r.stopAt, speed=stopped?0:Math.max(0,(r.stopAt-t)/r.stopAt);
      ctx.fillStyle='#080012'; ctx.fillRect(r.x-reelW/2,reelY,reelW,reelH);
      ctx.save(); ctx.beginPath(); ctx.rect(r.x-reelW/2+2,reelY+2,reelW-4,reelH-4); ctx.clip();
      const symH=reelH/3, scroll=(t*speed*0.55)%symH;
      for(let i=-1;i<=3;i++){
        const si=stopped?(i===1?0:(i+symbols.length*5)%symbols.length):(Math.floor(t*speed*0.04+idx*3+i+50))%symbols.length;
        const sy=reelY+i*symH-scroll, onLine=Math.abs(sy+symH/2-(reelY+reelH/2))<symH*0.55;
        ctx.font=`bold ${Math.round(onLine&&stopped?24*S:18*S)}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle=stopped&&onLine?symColors[si]:'rgba(255,255,255,0.5)'; ctx.globalAlpha=stopped&&onLine?1:0.65;
        ctx.fillText(symbols[si],r.x,sy+symH/2); ctx.globalAlpha=1;
      }
      ctx.restore();
      ctx.strokeStyle=stopped?gold:'rgba(255,255,255,0.2)'; ctx.lineWidth=stopped?2.5*S:1.5*S; ctx.strokeRect(r.x-reelW/2,reelY,reelW,reelH);
      [1,2].forEach(f=>{ctx.strokeStyle='rgba(255,215,0,0.1)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(r.x-reelW/2,reelY+reelH*f/3);ctx.lineTo(r.x+reelW/2,reelY+reelH*f/3);ctx.stroke();});
      if(stopped){const gp=Math.min((t-r.stopAt)/280,1)*0.7,pp=0.5+0.5*Math.sin(t*0.03+idx);ctx.beginPath();ctx.arc(r.x,reelY+reelH/2,reelW*0.52,0,Math.PI*2);ctx.fillStyle=`rgba(255,215,0,${gp*0.22*pp})`;ctx.fill();if(!r.done)r.done=true;}
    }

    function draw(){
      ctx.clearRect(0,0,W,H); machine(); reels.forEach((r,i)=>reel(r,i));
      if(t>1700&&!fired){fired=true;for(let i=0;i<28;i++){const a=Math.random()*Math.PI*2,spd=(3+Math.random()*9)*S;sparks.push({x:W/2,y:mY+mH*0.5,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-5*S,alpha:1,size:(2+Math.random()*4)*S,color:i%3===0?gold:i%3===1?'#FF4444':'#44FF88'});}}
      if(t>1700){const fp=Math.min((t-1700)/350,1),pp=0.7+0.3*Math.sin(t*0.04);ctx.strokeStyle=`rgba(255,215,0,${fp*pp*0.9})`;ctx.lineWidth=7*S;if(ctx.roundRect){ctx.beginPath();ctx.roundRect(mX,mY,mW,mH,14*S);ctx.stroke();}else ctx.strokeRect(mX,mY,mW,mH);ctx.font=`bold ${Math.round(26*S*pp)}px sans-serif`;ctx.textAlign='center';ctx.fillStyle=gold;ctx.globalAlpha=fp;ctx.fillText('! 7  7  7 !',W/2,mY-18*S);ctx.globalAlpha=1;}
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.13*S;s.alpha-=0.022;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1; t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** EQUIPO PRO A — Imán: campo magnético atrae partículas */
export function introTeamMagnet(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1600; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const primary=getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()||'#7B2FBE';
    const cx=W/2, cy=H*0.42, N=slow?6:12;
    const pts=Array.from({length:N},(_,i)=>({x:Math.random()*W,y:Math.random()*H*0.8+H*0.05,team:i<N/2?0:1,size:(4+Math.random()*5)*S,trail:[]}));
    let t=0;

    function draw(){
      ctx.clearRect(0,0,W,H); const p=Math.min(t/DUR,1);
      const pull=Math.min(Math.max((p-0.08)/0.72,0),1), ePull=1-Math.pow(1-pull,3);
      const pA={x:cx-76*S,y:cy}, pB={x:cx+76*S,y:cy};
      if(pull>0.15){const fp=(pull-0.15)/0.85;for(let i=0;i<7;i++){const yOff=(i-3)*26*S;const fieldGrad=ctx.createLinearGradient(pA.x,0,pB.x,0);fieldGrad.addColorStop(0,`rgba(0,245,255,${fp*0.12})`);fieldGrad.addColorStop(0.5,`rgba(255,255,255,${fp*0.05})`);fieldGrad.addColorStop(1,`rgba(123,47,190,${fp*0.12})`);ctx.strokeStyle=fieldGrad;ctx.lineWidth=1.2*S;ctx.beginPath();ctx.moveTo(pA.x,pA.y+yOff);ctx.bezierCurveTo(pA.x+50*S,pA.y+yOff,pB.x-50*S,pB.y+yOff,pB.x,pB.y+yOff);ctx.stroke();}}
      pts.forEach(pt=>{
        const pole=pt.team===0?pA:pB, col=pt.team===0?accent:primary;
        pt.trail.push({x:pt.x,y:pt.y}); if(pt.trail.length>8) pt.trail.shift();
        pt.trail.forEach((tp,ti)=>{const ta=(ti/pt.trail.length)*0.2*ePull;ctx.beginPath();ctx.arc(tp.x,tp.y,pt.size*0.6,0,Math.PI*2);ctx.fillStyle=col;ctx.globalAlpha=ta;ctx.fill();}); ctx.globalAlpha=1;
        pt.x+=(pole.x-pt.x)*ePull*0.07; pt.y+=(pole.y-pt.y)*ePull*0.07;
        const hGrad=ctx.createRadialGradient(pt.x,pt.y,0,pt.x,pt.y,pt.size*2.5); hGrad.addColorStop(0,col+'50'); hGrad.addColorStop(1,'transparent');
        ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.size*2.5,0,Math.PI*2); ctx.fillStyle=hGrad; ctx.fill();
        const pGrad=ctx.createRadialGradient(pt.x-pt.size*0.3,pt.y-pt.size*0.3,0,pt.x,pt.y,pt.size); pGrad.addColorStop(0,'#fff'); pGrad.addColorStop(0.4,col); pGrad.addColorStop(1,col+'88');
        ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.size,0,Math.PI*2); ctx.fillStyle=pGrad; ctx.fill();
      });
      if(pull>0.35){const lp=Math.min((pull-0.35)/0.3,1);[pA,pB].forEach((pole,i)=>{const col=i===0?accent:primary,pulse=0.8+0.2*Math.sin(t*0.022+i*Math.PI);const aura=ctx.createRadialGradient(pole.x,pole.y,0,pole.x,pole.y,36*S);aura.addColorStop(0,col+'44');aura.addColorStop(1,'transparent');ctx.beginPath();ctx.arc(pole.x,pole.y,36*S*pulse*lp,0,Math.PI*2);ctx.fillStyle=aura;ctx.fill();const bg=ctx.createRadialGradient(pole.x-5*S,pole.y-5*S,0,pole.x,pole.y,20*S*lp);bg.addColorStop(0,'#fff');bg.addColorStop(0.3,col);bg.addColorStop(1,col+'88');ctx.beginPath();ctx.arc(pole.x,pole.y,20*S*lp,0,Math.PI*2);ctx.fillStyle=bg;ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=2*S;ctx.stroke();ctx.font=`bold ${Math.round(15*S*lp)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.globalAlpha=lp;ctx.fillText(i===0?'N':'S',pole.x,pole.y);ctx.textBaseline='alphabetic';ctx.globalAlpha=1;});}
      if(pull>0.7){const lp=Math.min((pull-0.7)/0.3,1),pulse=0.85+0.15*Math.sin(t*0.02);[accent,primary].forEach((col,i)=>{const lx=i===0?pA.x:pB.x;ctx.font=`bold ${Math.round(32*S*lp*pulse)}px sans-serif`;ctx.textAlign='center';ctx.fillStyle=col+'44';ctx.globalAlpha=lp;ctx.fillText(i===0?'A':'B',lx,cy+58*S+2);ctx.fillStyle=col;ctx.fillText(i===0?'A':'B',lx,cy+56*S);ctx.globalAlpha=1;});}
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** EQUIPO PRO B — Cartas: baraja con física real */
export function introTeamCards(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1700; const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const primary=getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()||'#7B2FBE';
    const cx=W/2, cy=H*0.44, cW=36*S, cH=50*S, N=10;
    const cards=Array.from({length:N},(_,i)=>({team:i%2,launchAt:180+i*130,x:cx,y:cy,vx:0,vy:0,rot:0,rotV:0,landed:false,launched:false,targetX:i%2===0?cx-85*S-Math.floor(i/2)*5*S:cx+85*S+Math.floor(i/2)*5*S,targetY:cy+(Math.random()-0.5)*18*S,finalRot:(Math.random()-0.5)*0.4}));
    let t=0;

    function drawCard(x,y,rot,col,landed,i){
      ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
      ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(-cW/2+3,cH/2-2,cW,4*S,2); else ctx.rect(-cW/2+3,cH/2-2,cW,4*S); ctx.fill();
      const bg=ctx.createLinearGradient(-cW/2,-cH/2,cW/2,cH/2); bg.addColorStop(0,landed?col+'cc':'#1a1030'); bg.addColorStop(1,landed?col+'88':'#0d0820');
      ctx.fillStyle=bg; ctx.strokeStyle=landed?col:'rgba(255,255,255,0.2)'; ctx.lineWidth=1.5*S;
      ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(-cW/2,-cH/2,cW,cH,4*S); else ctx.rect(-cW/2,-cH/2,cW,cH); ctx.fill(); ctx.stroke();
      if(landed){const suits=['A','K','Q','J'],suit=suits[i%4];ctx.fillStyle='#fff';ctx.font=`bold ${Math.round(18*S)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(suit,0,0);ctx.font=`bold ${Math.round(9*S)}px sans-serif`;ctx.fillText(suit,-cW/2+8*S,-cH/2+10*S);}
      ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(-cW/2,-cH/2,cW*0.5,cH*0.5,4*S); else ctx.rect(-cW/2,-cH/2,cW*0.5,cH*0.5); ctx.fill();
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H); const p=Math.min(t/DUR,1);
      if(p<0.85){ctx.save();ctx.globalAlpha=1-p*1.1;for(let i=3;i>=0;i--){ctx.fillStyle=i===0?'#2a1a4e':'#1a0e30';ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=1.5*S;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(cx-cW/2-i,cy-cH/2-i*2,cW,cH,4*S);else ctx.rect(cx-cW/2-i,cy-cH/2-i*2,cW,cH);ctx.fill();ctx.stroke();}ctx.restore();}
      cards.forEach((card,i)=>{
        if(t<card.launchAt) return;
        if(!card.launched){card.launched=true;const dir=card.team===0?-1:1,angle=(Math.random()-0.5)*0.4;card.vx=dir*(3+Math.random()*3)*S*Math.cos(angle);card.vy=(-2.5-Math.random()*1.5)*S;card.rotV=dir*(0.06+Math.random()*0.12);}
        if(!card.landed){card.x+=card.vx;card.y+=card.vy;card.vy+=0.14*S;card.rot+=card.rotV;card.rotV*=0.96;if(card.y>=card.targetY&&Math.abs(card.x-card.targetX)<55*S){card.landed=true;card.x=card.targetX;card.y=card.targetY;card.rot=card.finalRot;card.vx=0;card.vy=0;}}
        drawCard(card.x,card.y,card.rot,card.team===0?accent:primary,card.landed,i);
      });
      if(p>0.55){const lp=Math.min((p-0.55)/0.3,1);ctx.font=`bold ${Math.round(28*S*lp)}px sans-serif`;ctx.textAlign='center';ctx.fillStyle=accent;ctx.globalAlpha=lp;ctx.fillText('A',cx-85*S,cy+52*S);ctx.fillStyle=primary;ctx.fillText('B',cx+85*S,cy+52*S);ctx.globalAlpha=1;}
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** ORDEN PRO A — Carrera de caballos estilo retro */
export function introOrderRace(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=2000; const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const colors=['#FFD700','#C0C0C0','#CD7F32'], labels=['1°','2°','3°'];
    const trackW=W*0.72, startX=W*0.13, endX=startX+trackW, cy=H*0.44;
    const speeds=[1.0, 0.7+Math.random()*0.18, 0.52+Math.random()*0.18];
    let t=0;

    function drawHorse(x,y,col,stride){
      ctx.save(); ctx.translate(x,y);
      const bodyGrad=ctx.createLinearGradient(-16*S,-8*S,16*S,8*S); bodyGrad.addColorStop(0,col+'ee'); bodyGrad.addColorStop(1,col+'99');
      ctx.fillStyle=bodyGrad; ctx.beginPath(); ctx.ellipse(0,0,16*S,8*S,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=col; ctx.lineWidth=1*S; ctx.stroke();
      ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(18*S,-6*S,8*S,5*S,0.3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(10*S,-10*S); ctx.quadraticCurveTo(14*S,-16*S,20*S,-10*S); ctx.closePath(); ctx.fill();
      const s=Math.sin(stride)*10*S; ctx.strokeStyle=col; ctx.lineWidth=3*S; ctx.lineCap='round';
      [[-8,-8,-12,8],[-2,-8,-6,8],[4,-8,8,8],[10,-8,14,8]].forEach(([x1,y1,x2,y2],li)=>{const phaseOff=(li%2===0?1:-1)*Math.PI/2,leg=Math.sin(stride+phaseOff)*8*S;ctx.beginPath();ctx.moveTo(x1*S,y1*S);ctx.lineTo(x2*S+leg,(y2+4)*S);ctx.stroke();});
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H); const p=Math.min(t/DUR,1);
      const trackBg=ctx.createLinearGradient(0,cy-25*S,0,cy+25*S); trackBg.addColorStop(0,'rgba(40,80,20,0.15)'); trackBg.addColorStop(1,'rgba(20,50,10,0.3)');
      ctx.fillStyle=trackBg; ctx.fillRect(0,cy-25*S,W,50*S);
      colors.forEach((_,i)=>{const yc=cy+(i-1)*30*S;ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1;ctx.setLineDash([12,8]);ctx.beginPath();ctx.moveTo(startX,yc+14*S);ctx.lineTo(endX,yc+14*S);ctx.stroke();ctx.setLineDash([]);});
      ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=2.5*S; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(endX,cy-55*S); ctx.lineTo(endX,cy+55*S); ctx.stroke();
      const sq=8*S; for(let r=0;r<4;r++) for(let c=0;c<2;c++){if((r+c)%2===0){ctx.fillStyle='rgba(255,255,255,0.5)';ctx.fillRect(endX+c*sq,cy-52*S+r*sq,sq,sq);}}
      colors.forEach((col,i)=>{
        const yPos=cy+(i-1)*30*S, progress=Math.min(p*speeds[i],1), ep=1-Math.pow(1-progress,3), hx=startX+trackW*ep, stride=t*0.02*(0.7+i*0.1);
        if(ep>0.05){const pathGrad=ctx.createLinearGradient(startX,0,hx,0);pathGrad.addColorStop(0,'transparent');pathGrad.addColorStop(1,col+'22');ctx.fillStyle=pathGrad;ctx.fillRect(startX,yPos-14*S,hx-startX,28*S);}
        ctx.font=`bold ${Math.round(13*S)}px sans-serif`; ctx.textAlign='right'; ctx.fillStyle=col; ctx.fillText(labels[i],startX-8*S,yPos+5*S);
        drawHorse(hx,yPos,col,stride);
        if(progress>=1){const pulse=0.5+0.5*Math.sin(t*0.04+i),glow=ctx.createRadialGradient(endX,yPos,0,endX,yPos,28*S);glow.addColorStop(0,col+'55');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(endX-28*S,yPos-28*S,56*S,56*S);}
      });
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** ORDEN PRO B — Ruleta de posiciones con física de inercia */
export function introOrderWheel(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=2000; const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const gold='#FFD700', accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const positions=['1°','2°','3°','4°','5°','1°','2°','3°'], posColors=['#FFD700','#C0C0C0','#CD7F32','#888','#666','#FFD700','#C0C0C0','#CD7F32'];
    const N=positions.length, R=Math.min(W,H)*0.26, cx=W/2, cy=H*0.44;
    let t=0, totalAngle=0;

    function draw(){
      ctx.clearRect(0,0,W,H); const p=Math.min(t/DUR,1);
      let vel; if(p<0.15) vel=p/0.15*0.35; else if(p<0.68) vel=0.35; else vel=0.35*Math.pow(1-(p-0.68)/0.32,2.5);
      totalAngle+=vel; const angle=-Math.PI/2+totalAngle, slice=Math.PI*2/N;
      ctx.beginPath(); ctx.arc(cx,cy,R+8*S,0,Math.PI*2);
      const rimGrad=ctx.createRadialGradient(cx-R*0.3,cy-R*0.3,R*0.1,cx,cy,R+8*S); rimGrad.addColorStop(0,'#888'); rimGrad.addColorStop(0.5,'#FFD700'); rimGrad.addColorStop(1,'#555');
      ctx.fillStyle=rimGrad; ctx.fill();
      positions.forEach((pos,i)=>{
        const startA=angle+i*slice, endA=startA+slice, midA=startA+slice/2;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R,startA,endA); ctx.closePath();
        const sg=ctx.createRadialGradient(cx,cy,R*0.2,cx+Math.cos(midA)*R*0.6,cy+Math.sin(midA)*R*0.6,R*0.5); sg.addColorStop(0,posColors[i]+'88'); sg.addColorStop(1,posColors[i]+'44');
        ctx.fillStyle=sg; ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1.5*S; ctx.stroke();
        ctx.save(); ctx.translate(cx+Math.cos(midA)*R*0.65,cy+Math.sin(midA)*R*0.65); ctx.rotate(midA+Math.PI/2);
        ctx.font=`bold ${Math.round(15*S)}px sans-serif`; ctx.textAlign='center'; ctx.fillStyle=posColors[i]; ctx.fillText(pos,0,0); ctx.restore();
      });
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.strokeStyle=gold; ctx.lineWidth=3*S; ctx.stroke();
      positions.forEach((_,i)=>{const a=angle+i*slice;ctx.beginPath();ctx.arc(cx+Math.cos(a)*R,cy+Math.sin(a)*R,4*S,0,Math.PI*2);ctx.fillStyle=gold;ctx.fill();});
      const pColor=vel<0.05?'#ff3333':accent; ctx.save(); ctx.translate(cx,cy-R-12*S);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-11*S,-20*S); ctx.lineTo(11*S,-20*S); ctx.closePath(); ctx.fillStyle=pColor; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=1.5*S; ctx.stroke(); ctx.restore();
      const cGrad=ctx.createRadialGradient(cx-4*S,cy-4*S,0,cx,cy,14*S); cGrad.addColorStop(0,'#888'); cGrad.addColorStop(1,'#333');
      ctx.beginPath(); ctx.arc(cx,cy,14*S,0,Math.PI*2); ctx.fillStyle=cGrad; ctx.fill(); ctx.strokeStyle=gold; ctx.lineWidth=2.5*S; ctx.stroke();
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** VENGANZA PRO A — Diana roja persigue al objetivo */
export function introRevengeTarget(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1700; const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const red='#FF1133'; let dX=W*0.06, dY=H*0.12;
    const targetX=W/2, targetY=H*0.42; const sparks=[]; let fired=false, t=0, trail=[];

    function drawTarget(x,y,scale,alpha,lockP){
      ctx.save(); ctx.globalAlpha=alpha;
      [70,52,36,22,9].forEach((r,i)=>{const pulse=scale*(1+0.05*Math.sin(t*0.016+i*0.8)),rr=r*S*pulse,isRed=i%2===0;ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.fillStyle=isRed?`rgba(200,0,20,0.25)`:`rgba(255,255,255,0.06)`;ctx.fill();ctx.strokeStyle=isRed?`rgba(255,20,50,${0.9-i*0.08})`:`rgba(255,255,255,0.25)`;ctx.lineWidth=2.5*S;ctx.stroke();});
      ctx.strokeStyle=`rgba(255,0,50,${0.6+0.4*Math.sin(t*0.03)})`;ctx.lineWidth=1.2*S;
      [[x-75*S*scale,y,x-10*S*scale,y],[x+10*S*scale,y,x+75*S*scale,y],[x,y-75*S*scale,x,y-10*S*scale],[x,y+10*S*scale,x,y+75*S*scale]].forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();});
      if(lockP>0){ctx.strokeStyle=`rgba(255,20,50,${lockP})`;ctx.lineWidth=3.5*S;const cs=24*S*scale,lr=72*S*scale;[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx,sy])=>{ctx.beginPath();ctx.moveTo(x+sx*(lr-cs),y+sy*lr);ctx.lineTo(x+sx*lr,y+sy*lr);ctx.lineTo(x+sx*lr,y+sy*(lr-cs));ctx.stroke();});}
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H); const p=Math.min(t/DUR,1);
      if(p>0.6){const ap=(p-0.6)/0.4,pulse=Math.abs(Math.sin(t*0.025));ctx.fillStyle=`rgba(80,0,0,${ap*pulse*0.2})`;ctx.fillRect(0,0,W,H);}
      const pursuit=Math.min(p/0.68,1), ePursuit=1-Math.pow(1-pursuit,3);
      dX=W*0.06+(targetX-W*0.06)*ePursuit; dY=H*0.12+(targetY-H*0.12)*ePursuit;
      trail.push({x:dX,y:dY,p:ePursuit}); if(trail.length>10) trail.shift();
      trail.forEach((pt,i)=>{const ta=(i/trail.length)*0.08*ePursuit;ctx.beginPath();ctx.arc(pt.x,pt.y,5*S,0,Math.PI*2);ctx.fillStyle=`rgba(255,0,50,${ta})`;ctx.fill();});
      const scale=1.4-0.4*ePursuit, lockP=Math.min(Math.max((ePursuit-0.82)/0.18,0),1);
      drawTarget(dX,dY,scale,Math.min(p*5,1),lockP);
      if(p>0.7&&!fired){fired=true;for(let i=0;i<20;i++){const a=Math.PI*2/20*i,spd=(2+Math.random()*6)*S;sparks.push({x:targetX,y:targetY,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,alpha:1,color:i%2===0?red:impact,size:(2+Math.random()*3)*S});}}
      if(p>0.7&&p<0.84){const fp=(p-0.7)/0.14,fb=fp<0.5?fp*2:2-fp*2;ctx.beginPath();ctx.arc(targetX,targetY,60*S*fb,0,Math.PI*2);ctx.fillStyle=`rgba(255,0,50,${fb*0.55})`;ctx.fill();}
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.alpha-=0.028;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1; t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** VENGANZA PRO B — Tormenta eléctrica dramática */
export function introRevengeStorm(winner, winnerColors) {
  return new Promise(resolve => {
    const DUR=1700; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const cx=W/2, targetY=H*0.54;
    const bolts=Array.from({length:slow?6:8},(_,i)=>({x:cx+(Math.random()-0.5)*W*0.38,fireAt:350+i*160,fired:false,alpha:0,segs:Array.from({length:7},()=>({dx:(Math.random()-0.5)*22*S,dy:16*S+Math.random()*10*S}))}));
    const sparks=[]; let t=0;

    function drawCloud(x,y,w,h,alpha){
      ctx.save(); ctx.globalAlpha=alpha;
      const cg=ctx.createRadialGradient(x,y,0,x,y,w); cg.addColorStop(0,'rgba(30,30,50,0.9)'); cg.addColorStop(1,'rgba(10,10,25,0)');
      ctx.fillStyle=cg;
      [[0,0,w],[w*0.4,-h*0.3,w*0.7],[w*-0.35,-h*0.25,w*0.65],[w*0.2,-h*0.45,w*0.5],[w*-0.15,-h*0.5,w*0.4]].forEach(([bx,by,br])=>{ctx.beginPath();ctx.arc(x+bx,y+by,br,0,Math.PI*2);ctx.fill();});
      ctx.restore();
    }

    function drawBolt(bolt,alpha){
      if(alpha<=0) return; ctx.save();
      ctx.strokeStyle=`rgba(180,220,255,${alpha*0.2})`; ctx.lineWidth=12*S; ctx.lineCap='round';
      let bx=bolt.x, by=H*0.1; ctx.beginPath(); ctx.moveTo(bx,by); bolt.segs.forEach(seg=>{bx+=seg.dx;by+=seg.dy;ctx.lineTo(bx,by);}); ctx.stroke();
      ctx.strokeStyle=`rgba(180,230,255,${alpha*0.8})`; ctx.lineWidth=4*S;
      bx=bolt.x; by=H*0.1; ctx.beginPath(); ctx.moveTo(bx,by); bolt.segs.forEach(seg=>{bx+=seg.dx;by+=seg.dy;ctx.lineTo(bx,by);}); ctx.stroke();
      ctx.strokeStyle=`rgba(255,255,255,${alpha})`; ctx.lineWidth=1.5*S;
      bx=bolt.x; by=H*0.1; ctx.beginPath(); ctx.moveTo(bx,by); bolt.segs.forEach(seg=>{bx+=seg.dx;by+=seg.dy;ctx.lineTo(bx,by);}); ctx.stroke();
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H); const p=Math.min(t/DUR,1);
      if(p>0.04){const cp=Math.min(p/0.35,1);[[cx-55*S,H*0.1,60*S,20*S],[cx+45*S,H*0.12,50*S,18*S],[cx-15*S,H*0.07,55*S,22*S],[cx+75*S,H*0.14,42*S,16*S],[cx-85*S,H*0.13,46*S,17*S]].forEach(([x,y,w,h])=>drawCloud(x,y,w,h,cp*0.9));}
      if(p>0.28){const dp=Math.min((p-0.28)/0.4,1),pulse=0.55+0.45*Math.sin(t*0.025);const ig=ctx.createRadialGradient(cx,targetY,0,cx,targetY,55*S);ig.addColorStop(0,`rgba(150,0,255,${dp*0.25*pulse})`);ig.addColorStop(1,'transparent');ctx.fillStyle=ig;ctx.fillRect(0,0,W,H);ctx.beginPath();ctx.arc(cx,targetY,42*S*dp*pulse,0,Math.PI*2);ctx.strokeStyle=`rgba(180,50,255,${dp*0.5})`;ctx.lineWidth=2.5*S;ctx.stroke();}
      bolts.forEach(bolt=>{
        if(t>=bolt.fireAt&&!bolt.fired){bolt.fired=true;bolt.alpha=1;const n=slow?6:9;for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,spd=(2+Math.random()*6)*S;sparks.push({x:cx,y:targetY,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd-2*S,alpha:1,color:i%2===0?'#9DE8FF':impact,size:(1.5+Math.random()*3)*S});}}
        if(bolt.fired) bolt.alpha=Math.max(0,bolt.alpha-0.048);
        drawBolt(bolt,bolt.alpha);
        if(bolt.fired&&bolt.alpha>0.8){ctx.fillStyle=`rgba(200,220,255,${(bolt.alpha-0.8)*0.4})`;ctx.fillRect(0,0,W,H);}
      });
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.09*S;s.vx*=0.97;s.alpha-=0.026;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1; t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** DUELO PRO A — Western: escenario desierto + pistolas + disparo */
export function introDuelWestern(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1800; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const gold='#FFD700', cy=H*0.46; const sparks=[]; let fired=false, t=0;

    function scene(){
      const sky=ctx.createLinearGradient(0,0,0,H*0.55); sky.addColorStop(0,'rgba(10,5,20,0)'); sky.addColorStop(1,'rgba(60,20,10,0.22)');
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
      const ground=ctx.createLinearGradient(0,H*0.68,0,H); ground.addColorStop(0,'rgba(80,55,20,0.22)'); ground.addColorStop(1,'rgba(40,25,5,0.38)');
      ctx.fillStyle=ground; ctx.fillRect(0,H*0.68,W,H*0.32);
      ctx.strokeStyle='rgba(180,120,40,0.18)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,H*0.68); ctx.lineTo(W,H*0.68); ctx.stroke();
      ctx.fillStyle='rgba(20,35,10,0.45)';
      ctx.fillRect(W*0.08-4*S,H*0.5,8*S,H*0.2); ctx.fillRect(W*0.08-14*S,H*0.54,10*S,5*S); ctx.fillRect(W*0.08+4*S,H*0.57,10*S,5*S);
      ctx.fillRect(W*0.92-4*S,H*0.51,8*S,H*0.19); ctx.fillRect(W*0.92-14*S,H*0.56,10*S,5*S); ctx.fillRect(W*0.92+4*S,H*0.53,10*S,5*S);
    }

    function drawGun(x,y,flipped,col,scale,alpha){
      ctx.save(); ctx.translate(x,y); ctx.scale(flipped?-1:1,1); ctx.scale(scale,scale); ctx.globalAlpha=alpha;
      ctx.strokeStyle=col; ctx.lineWidth=5*S; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-36*S,0); ctx.lineTo(8*S,0); ctx.stroke();
      ctx.lineWidth=7*S; ctx.beginPath(); ctx.moveTo(-4*S,0); ctx.lineTo(-4*S,20*S); ctx.stroke();
      ctx.strokeStyle=col+'aa'; ctx.lineWidth=6*S; ctx.beginPath(); ctx.moveTo(-4*S,20*S); ctx.quadraticCurveTo(8*S,24*S,12*S,18*S); ctx.stroke();
      ctx.strokeStyle=col+'88'; ctx.lineWidth=2.5*S; ctx.beginPath(); ctx.moveTo(-4*S,8*S); ctx.lineTo(2*S,14*S); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1.5*S; ctx.beginPath(); ctx.moveTo(-32*S,-2*S); ctx.lineTo(4*S,-2*S); ctx.stroke();
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H); const p=Math.min(t/DUR,1); scene();
      if(p<0.42){const cp=p/0.42,digit=cp<0.33?'3':cp<0.66?'2':'1',dp=(cp%0.333)/0.333,sc=dp<0.12?dp/0.12:dp>0.82?(1-(dp-0.82)/0.18):1;ctx.font=`bold ${Math.round(72*S*sc)}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,0.5)';ctx.globalAlpha=sc;ctx.fillText(digit,W/2+3,H*0.38+3);ctx.fillStyle=gold;ctx.fillText(digit,W/2,H*0.38);ctx.globalAlpha=1;}
      if(p>0.32){const gp=Math.min((p-0.32)/0.4,1),eGp=1-Math.pow(1-gp,3),gunDist=W*0.33-38*S,shake=p>0.68?Math.sin(t*0.25)*(p-0.68)*10*S:0;drawGun(W/2-(gunDist*(0.3+0.7*(1-eGp))+38*S)+shake,cy+8*S,false,accent,gp,gp);drawGun(W/2+(gunDist*(0.3+0.7*(1-eGp))+38*S)+shake,cy+8*S,true,impact,gp,gp);if(gp>0.7){const lp=(gp-0.7)/0.3;ctx.strokeStyle=`rgba(255,200,50,${lp*0.12})`;ctx.lineWidth=1*S;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(W/2-80*S,cy+8*S);ctx.lineTo(W/2+80*S,cy+8*S);ctx.stroke();ctx.setLineDash([]);}}
      if(p>0.75&&!fired){fired=true;const n=slow?8:14;for(let i=0;i<n;i++){const a=(Math.random()-0.5)*Math.PI*0.7,spd=(3+Math.random()*7)*S;sparks.push({x:i<n/2?W/2-80*S:W/2+80*S,y:cy+8*S,vx:Math.cos(a)*spd*(i<n/2?1:-1),vy:Math.sin(a)*spd-2*S,alpha:1,color:i%3===0?gold:i%3===1?accent:impact,size:(1.5+Math.random()*3)*S});}}
      if(p>0.75&&p<0.88){const fp=(p-0.75)/0.13,fb=fp<0.5?fp*2:2-fp*2;ctx.fillStyle=`rgba(255,200,50,${fb*0.48})`;ctx.fillRect(0,0,W,H);}
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.08*S;s.vx*=0.97;s.alpha-=0.026;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1;
      if(p>0.82){const dp2=Math.min((p-0.82)/0.12,1),pulse=0.85+0.15*Math.sin(t*0.05);ctx.font=`bold ${Math.round(36*S*dp2*pulse)}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillText('DRAW!',W/2+2,H*0.3+2);ctx.fillStyle=gold;ctx.fillText('DRAW!',W/2,H*0.3);}
      t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}

/** DUELO PRO B — Ring de boxeo con campana, guantes y KO */
export function introDuelBoxing(winner, winnerColors, participants) {
  return new Promise(resolve => {
    const DUR=1800; const slow=_isSlowDevice();
    const {overlay,ctx,W,H}=_introBase(DUR); const S=Math.min(W,H)/480;
    const accent=getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()||'#00F5FF';
    const impact=getComputedStyle(document.documentElement).getPropertyValue('--color-impact').trim()||'#FF006E';
    const cy=H*0.46; const sparks=[]; let hit=false, t=0;

    function ring(alpha){
      ctx.save(); ctx.globalAlpha=alpha; const rW=200*S, rY=cy+40*S;
      ctx.fillStyle='rgba(180,140,80,0.15)'; ctx.fillRect(W/2-rW/2,rY,rW,18*S);
      [0,12,24].forEach(yo=>{ctx.strokeStyle=`rgba(255,255,255,${0.32-yo*0.01})`;ctx.lineWidth=(2.5-yo*0.05)*S;ctx.beginPath();ctx.moveTo(W/2-rW/2,rY-yo*S);ctx.lineTo(W/2+rW/2,rY-yo*S);ctx.stroke();});
      [-1,1].forEach(side=>{ctx.strokeStyle='rgba(255,255,255,0.45)';ctx.lineWidth=4*S;ctx.beginPath();ctx.moveTo(W/2+side*rW/2,rY-28*S);ctx.lineTo(W/2+side*rW/2,rY+18*S);ctx.stroke();});
      ctx.restore();
    }

    function glove(x,y,col,flipped){
      ctx.save(); ctx.translate(x,y); ctx.scale(flipped?-1:1,1);
      ctx.fillStyle=col+'99'; ctx.fillRect(-18*S,14*S,36*S,18*S);
      ctx.strokeStyle=col; ctx.lineWidth=1.5*S; ctx.strokeRect(-18*S,14*S,36*S,18*S);
      ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(0,0,22*S,18*S,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=1.5*S; ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-6*S,-6*S,10*S,7*S,-0.4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(17*S,-9*S,9*S,6*S,-0.5,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    function draw(){
      ctx.clearRect(0,0,W,H); const p=Math.min(t/DUR,1);
      const vg=ctx.createRadialGradient(W/2,cy,60*S,W/2,cy,W*0.8); vg.addColorStop(0,'rgba(60,20,10,0.28)'); vg.addColorStop(1,'rgba(0,0,0,0.65)');
      ctx.fillStyle=vg; ctx.fillRect(0,0,W,H); ring(Math.min(p*4,1));
      if(p<0.22){const bx=W/2,by=H*0.18,swing=Math.sin(t*0.22)*10*S*Math.max(0,1-t/350);ctx.save();ctx.translate(bx+swing,by);ctx.fillStyle='#FFD700';ctx.strokeStyle='#B8860B';ctx.lineWidth=2*S;ctx.beginPath();ctx.arc(0,0,12*S,Math.PI,0);ctx.lineTo(12*S,10*S);ctx.arc(0,10*S,12*S,0,Math.PI);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
      if(p<0.22){const rp=p/0.22;ctx.font=`bold ${Math.round(36*S*rp)}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='#FFD700';ctx.globalAlpha=rp*(1-Math.max(0,(p-0.16)/0.06));ctx.fillText('ROUND 1',W/2,cy-62*S);ctx.globalAlpha=1;}
      const approach=Math.min(Math.max((p-0.18)/0.47,0),1), ea=1-Math.pow(1-approach,3);
      const maxDist=W*0.36-28*S, gx1=W/2-maxDist*(1-ea)-28*S, gx2=W/2+maxDist*(1-ea)+28*S;
      const gBounce=approach<1?Math.abs(Math.sin(approach*Math.PI*3))*10*S:0;
      glove(gx1,cy-gBounce,accent,false); glove(gx2,cy-gBounce,impact,true);
      if(approach>=1&&!hit){hit=true;const n=slow?8:14;for(let i=0;i<n;i++){const a=Math.PI*2/n*i,spd=(2+Math.random()*7)*S;sparks.push({x:W/2,y:cy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,alpha:1,color:i%2===0?accent:impact,size:(2+Math.random()*3)*S});}}
      const chashT=DUR*0.65;if(t>chashT&&t<chashT+260){const fp=(t-chashT)/260,fb=fp<0.5?fp*2:2-fp*2;ctx.fillStyle=`rgba(255,255,255,${fb*0.55})`;ctx.fillRect(0,0,W,H);}
      if(p>0.72){const kp=Math.min((p-0.72)/0.14,1),kPulse=0.85+0.15*Math.sin(t*0.04),kSize=52*S*kp*kPulse;ctx.font=`bold ${Math.round(kSize)}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillText('KO!',W/2+3,cy-48*S+3);ctx.fillStyle='#FFD700';ctx.fillText('KO!',W/2,cy-48*S);ctx.fillStyle=impact;ctx.globalAlpha=kp;ctx.fillText('KO!',W/2,cy-48*S);ctx.globalAlpha=1;}
      sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.1*S;s.vx*=0.97;s.alpha-=0.028;if(s.alpha<=0)return;ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.alpha,0,Math.PI*2);ctx.fillStyle=s.color;ctx.globalAlpha=s.alpha;ctx.fill();});
      ctx.globalAlpha=1; t+=16; if(t<DUR+200) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw); setTimeout(resolve,DUR);
  });
}
