/* =====================================================
   ӘР ТҰҚЫМНЫҢ КӨКТЕУ УАҚЫТЫ — ауысулар қозғалтқышы
   crack — тұқым қабығы сияқты қисық сызықпен жарылып, камера ішке кіреді (бөлім шекарасы)
   zoom  — алдыңғы суреттің бір нүктесіне кіру (портал)
   pan   — жанама панорама, алдыңғы қабат артқыдан жылдам (параллакс)
   wave  — дыбыс толқыны экранды сызып өтеді (сөйлеуге қатысты слайдтар)
   rise  — жаңа парақ төменнен көтеріледі
   ===================================================== */
const DUR = {intro:1.6, crack:1.7, zoom:1.45, pan:1.25, wave:1.35, rise:1.2, back:.6};
const EASE = 'cubic-bezier(.72,0,.24,1)';
const TIP = {
  1:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -40 80 80"><path d="M-30 4c0-18 14-28 30-25 16 3 23 16 20 30-4 13-16 20-30 18-12-2-20-10-20-23z" fill="#9a4a26"/></svg>',
  2:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -60 80 80"><path d="M0 18V-22" stroke="#4d8a3c" stroke-width="5"/><path d="M0-20c-14-2-24-12-24-24 14 0 24 10 24 24z" fill="#7fb35a"/><path d="M0-22c10-4 20-12 22-24-12 0-22 10-22 24z" fill="#7fb35a"/></svg>',
  3:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -80 80 100"><path d="M0 18V-60" stroke="#4d8a3c" stroke-width="5"/><path d="M0 0c-16 0-28-8-30-20 14-2 28 6 30 20z" fill="#7fb35a"/><path d="M0-14c14-2 26-12 26-24-14 0-26 10-26 24z" fill="#7fb35a"/><path d="M0-36c-12-2-20-10-20-20 12 0 20 8 20 20z" fill="#7fb35a"/></svg>',
  4:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -90 80 110"><path d="M0 18V-55" stroke="#4d8a3c" stroke-width="5"/><path d="M0-4c-16 0-26-8-28-18 14-2 26 6 28 18z" fill="#7fb35a"/><g transform="translate(0 -66)"><circle r="11" cy="-12" fill="#d8513d"/><circle r="11" cx="12" fill="#d8513d"/><circle r="11" cy="12" fill="#d8513d"/><circle r="11" cx="-12" fill="#d8513d"/><circle r="8" fill="#f2c14e"/></g></svg>'
};

class Deck{
  constructor(){
    this.stage=document.getElementById('deckStage');
    this.slides=[...document.querySelectorAll('.deck-stage > .slide')];
    this.fx=document.getElementById('fxlayer');
    this.cur=-1; this.busy=false;
    document.querySelectorAll('img[data-src="rose"]').forEach(i=>i.src=ROSE);
    this.scale(); addEventListener('resize',()=>this.scale());
    this.bind();
    const h=parseInt(location.hash.slice(1))||1;
    this.go(Math.min(Math.max(h-1,0),this.slides.length-1),true);
  }
  scale(){
    const f=Math.min(innerWidth/1920,innerHeight/1080);
    this.stage.style.transform=`translate(${(innerWidth-1920*f)/2}px,${(innerHeight-1080*f)/2}px) scale(${f})`;
  }
  /* ---------- навигация ---------- */
  go(i,first=false){
    if(this.busy||i<0||i>=this.slides.length||i===this.cur) return;
    const P=this.slides[this.cur], N=this.slides[i];
    const fwd=i>this.cur;
    let type=first?'intro':(fwd&&i===this.cur+1?N.dataset.tr:'back');
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) type='back';
    const dur=DUR[type]||1.2;
    N.style.setProperty('--td',(type==='back'?.35:dur*.62).toFixed(2)+'s');
    this.cur=i; this.ui(i);
    if(!P){ N.classList.add('active'); this.anim(N,[{opacity:0,transform:'scale(1.08)'},{opacity:1,transform:'none'}],dur); return; }
    this.busy=true;
    const done=()=>{ P.classList.remove('leaving','under'); this.fx.innerHTML=''; this.busy=false; };
    this[type](P,N,dur*1000).then(done);
  }
  anim(el,kf,ms,opt={}){ return el.animate(kf,{duration:ms*(ms<20?1000:1),easing:EASE,fill:'none',...opt}).finished; }
  swap(P,N,pUnder=true){ P.classList.remove('active'); P.classList.add(pUnder?'under':'leaving'); N.classList.add('active'); }

  /* тұқым қабығының жарылуы */
  crack(P,N,ms){
    this.swap(P,N,true); P.classList.remove('under'); P.style.visibility='hidden';
    const pts=[]; for(let y=-20;y<=1100;y+=36){ const x=960+110*Math.sin(y/1080*Math.PI*1.7+.5)+(Math.random()-.5)*26; pts.push([x,y]); }
    const seam=pts.map(p=>`${p[0].toFixed(0)} ${p[1]}`).join(' L ');
    const L=`path('M -400 -20 L ${seam} L -400 1100 Z')`, R=`path('M 2320 -20 L ${seam} L 2320 1100 Z')`;
    const mk=clip=>{ const w=document.createElement('div'); w.className='half frozen'; w.style.clipPath=clip;
      const c=P.cloneNode(true); c.classList.add('active'); c.style.visibility='visible'; c.removeAttribute('id'); w.appendChild(c); this.fx.appendChild(w); return w; };
    const a=mk(L), b=mk(R);
    this.fx.insertAdjacentHTML('beforeend',`<svg class="seam" viewBox="0 0 1920 1080"><path d="M ${seam}"/></svg>`);
    const s=this.fx.querySelector('.seam');
    this.anim(s,[{opacity:0},{opacity:1,offset:.18},{opacity:1,offset:.3},{opacity:0}],ms,{easing:'linear'});
    this.anim(N,[{transform:'scale(1.4)',filter:'brightness(1.25)'},{transform:'scale(1.4)',filter:'brightness(1.25)',offset:.22},{transform:'none',filter:'none'}],ms);
    const k1=[{transform:'none'},{transform:'none',offset:.22},{transform:'translate(-62%,4%) rotate(-8deg) scale(1.06)'}];
    const k2=[{transform:'none'},{transform:'none',offset:.22},{transform:'translate(62%,-4%) rotate(8deg) scale(1.06)'}];
    return Promise.all([this.anim(a,k1,ms),this.anim(b,k2,ms)]).then(()=>{P.style.visibility='';});
  }
  /* портал-зум */
  zoom(P,N,ms){
    this.swap(P,N,true);
    const zx=N.dataset.zx+'%', zy=N.dataset.zy+'%';
    P.style.transformOrigin=`${zx} ${zy}`;
    const p1=this.anim(P,[{transform:'scale(1)',filter:'blur(0)'},{transform:'scale(2.8)',filter:'blur(6px)'}],ms);
    const p2=this.anim(N,[{clipPath:`circle(0px at ${zx} ${zy})`,transform:'scale(1.25)'},{clipPath:`circle(0px at ${zx} ${zy})`,transform:'scale(1.25)',offset:.18},{clipPath:`circle(2300px at ${zx} ${zy})`,transform:'none'}],ms);
    return Promise.all([p1,p2]).then(()=>{P.style.transformOrigin='';});
  }
  /* жанама панорама + параллакс */
  pan(P,N,ms){
    this.swap(P,N,false);
    const pp=P.querySelector('.props'), np=N.querySelector('.props');
    const r=[this.anim(P,[{transform:'none'},{transform:'translateX(-1920px)'}],ms),
             this.anim(N,[{transform:'translateX(1920px)'},{transform:'none'}],ms)];
    if(pp) r.push(this.anim(pp,[{transform:'none'},{transform:'translateX(-420px)'}],ms));
    if(np) r.push(this.anim(np,[{transform:'translateX(420px) rotate(2deg)'},{transform:'none'}],ms));
    return Promise.all(r);
  }
  /* дыбыс толқыны */
  wave(P,N,ms){
    this.swap(P,N,true);
    this.fx.insertAdjacentHTML('beforeend','<svg class="wavecut" viewBox="0 0 1920 1080"><path/></svg>');
    const line=this.fx.querySelector('.wavecut path');
    return new Promise(res=>{
      const t0=performance.now();
      const step=now=>{
        let t=Math.min(1,(now-t0)/ms); const e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
        const ex=-260+e*2440; const pts=[];
        for(let y=-20;y<=1100;y+=30){ const amp=70*(1-Math.abs(e-.5)*1.2); pts.push(`${(ex+amp*Math.sin(y/70+t*18)).toFixed(1)} ${y}`); }
        N.style.clipPath=`path('M -10 -20 L ${pts.join(' L ')} L -10 1100 Z')`;
        line.setAttribute('d','M '+pts.join(' L '));
        if(t<1) requestAnimationFrame(step); else { N.style.clipPath=''; res(); }
      };
      requestAnimationFrame(step);
    });
  }
  /* төменнен көтерілу */
  rise(P,N,ms){
    this.swap(P,N,true);
    return Promise.all([
      this.anim(N,[{transform:'translateY(1100px) rotate(5deg)'},{transform:'none'}],ms),
      this.anim(P,[{transform:'none',filter:'brightness(1)'},{transform:'scale(.9)',filter:'brightness(.45)'}],ms)]);
  }
  intro(P,N,ms){ this.swap(P,N,true); return this.anim(N,[{opacity:0,transform:'scale(1.08)'},{opacity:1,transform:'none'}],ms); }
  back(P,N,ms){ this.swap(P,N,true); return this.anim(N,[{opacity:0},{opacity:1}],ms,{easing:'ease'}); }

  /* ---------- өсу сабағы мен басқа UI ---------- */
  ui(i){
    const n=i+1, tot=this.slides.length, act=+this.slides[i].dataset.act;
    document.getElementById('vine').style.strokeDashoffset=(1-n/tot).toFixed(3);
    const tip=document.getElementById('tip');
    tip.style.left=(60+1800*n/tot)/19.2+'%';
    tip.style.backgroundImage=`url("data:image/svg+xml;utf8,${encodeURIComponent(TIP[act])}")`;
    document.getElementById('actlbl').textContent=['','I','II','III','IV'][act]+' · '+ACTS[act];
    document.getElementById('counter').textContent=`${String(n).padStart(2,'0')} / ${tot}`;
    document.getElementById('notes').textContent=NOTES[i]||'';
    history.replaceState(null,'','#'+n);
  }
  bind(){
    addEventListener('keydown',e=>{
      if(document.body.classList.contains('editing')){ if(e.key==='Escape') this.edit(false); if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();this.save();} return; }
      if(['ArrowRight','ArrowDown',' ','PageDown','Enter'].includes(e.key)){e.preventDefault();this.go(this.cur+1)}
      else if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(e.key)){e.preventDefault();this.go(this.cur-1)}
      else if(e.key==='Home') this.go(0); else if(e.key==='End') this.go(this.slides.length-1);
      else if(e.key==='n'||e.key==='N') document.getElementById('notes').classList.toggle('on');
      else if(e.key==='f'||e.key==='F') document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
      else if(e.key==='e'||e.key==='E') this.edit(true);
      else if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();this.save();}
    });
    let x0=null;
    addEventListener('touchstart',e=>x0=e.touches[0].clientX,{passive:true});
    addEventListener('touchend',e=>{ if(x0===null)return; const dx=e.changedTouches[0].clientX-x0; if(Math.abs(dx)>40) this.go(this.cur+(dx<0?1:-1)); x0=null; });
    document.querySelector('.deck-viewport').addEventListener('click',e=>{ if(!document.body.classList.contains('editing')) this.go(this.cur+(e.clientX>innerWidth/3?1:-1)); });
  }
  edit(on){
    document.body.classList.toggle('editing',on);
    document.querySelectorAll('.slide .panel *, .slide .note *, .slide .cap, .slide .cr *, .slide .door-cap *, .slide .path-cap')
      .forEach(el=>{ if(el.children.length===0||el.tagName==='H2'||el.tagName==='P') on?el.setAttribute('contenteditable','true'):el.removeAttribute('contenteditable'); });
  }
  save(){
    this.edit(false);
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['<!DOCTYPE html>\n'+document.documentElement.outerHTML],{type:'text/html'}));
    a.download='index.html'; a.click();
  }
}
document.fonts.ready.then(()=>window.deck=new Deck());
