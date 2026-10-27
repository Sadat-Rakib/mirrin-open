import{P as m,_ as I}from"./products-BSnKn5BF.js";const n=(t,a=document)=>a.querySelector(t),u=(t,a=document)=>[...a.querySelectorAll(t)],h=t=>"$"+Number(t).toLocaleString("en-US"),f="velox-bag",S=()=>{try{return JSON.parse(localStorage.getItem(f)||"[]")}catch{return[]}},q=t=>{try{localStorage.setItem(f,JSON.stringify(t))}catch{}},C=new URLSearchParams(location.search),z=C.get("id")||"lime",e={product:m.find(t=>t.id===z)||m[0],shot:0,size:"M",qty:1,cart:S(),front:"A"};function g(t){const a=(t.looks||[]).slice(0,3).map((r,s)=>({type:"photo",src:r,label:"Look 0"+(s+1)})),i=(t.details||[]).slice(0,3).map((r,s)=>({type:"photo",src:r,label:"Detail 0"+(s+1)})),d=[{type:"3d",label:"360°",src:t.looks?.[0]}];return[...a,...i,...d]}let p=null;async function T(){if(p)return p;const{JacketInspect:t}=await I(async()=>{const{JacketInspect:a}=await import("./scene3d-BLmDCGPO.js");return{JacketInspect:a}},[],import.meta.url);return p=new t(n("#inspect3d"),e.product),p}function x(t){const a=document.documentElement.style;a.setProperty("--accent",t.accent),a.setProperty("--accent-soft",t.accentSoft),a.setProperty("--glow",t.glow),document.documentElement.dataset.theme=t.id,document.title=`VELOX — ${t.name} ${t.colorway}`}function $(){const t=e.product,a=g(t);e.shot>=a.length&&(e.shot=0);const i=a[e.shot],d=n("#stage");if(u("#thumbs [data-shot]").forEach(o=>o.classList.toggle("is-on",+o.dataset.shot===e.shot)),i.type==="3d"){d.classList.add("is-3d"),d.style.backgroundImage="none",n("#shotBadge").textContent="3D INSPECT",T().then(o=>{o.setRunning(!0),o._resize()});return}d.classList.remove("is-3d"),p&&p.setRunning(!1);const r=e.front==="A"?n("#stageB"):n("#stageA"),s=e.front==="A"?n("#stageA"):n("#stageB");d.style.backgroundImage=`url(${i.src})`,r.src=i.src,r.alt=`${t.name} ${i.label}`,r.classList.add("is-on"),s.classList.remove("is-on"),e.front=e.front==="A"?"B":"A",n("#shotBadge").textContent=i.label}function v(){const t=e.product,a=g(t);e.shot>=a.length&&(e.shot=0),x(t),n("#crumbs").innerHTML=`<a href="./">Home</a> / <a href="./#shop">Shop</a> / <span>${t.name} ${t.colorway}</span>`,n("#thumbs").innerHTML=a.map((s,o)=>`
    <button type="button" class="pdp__thumb ${o===e.shot?"is-on":""} ${s.type==="3d"?"is-3d":""}" data-shot="${o}" data-src="${s.src||""}" ${s.type!=="3d"&&o<5?`style="background-image:url(${s.src})"`:""} aria-label="${s.label}">${s.type==="3d"?"360°":""}</button>
  `).join("");const i=new IntersectionObserver(s=>{s.forEach(o=>{const c=o.target;!o.isIntersecting||c.style.backgroundImage||c.classList.contains("is-3d")||(c.style.backgroundImage=`url(${c.dataset.src})`,i.unobserve(c))})},{rootMargin:"80px"});u("#thumbs [data-src]").forEach(s=>{!s.style.backgroundImage&&!s.classList.contains("is-3d")&&i.observe(s)}),n("#fitNote").textContent=t.fit||"",n("#reviewCount").textContent=`${t.reviews||2} reviews`,n("#info").innerHTML=`
    <div class="pdp__brand">VELOX</div>
    <h1>${t.name} ${t.colorway}</h1>
    <img class="pdp__sticker" src="${t.mark}" alt="" />
    <div class="pdp__sub">${t.gender}</div>
    <div class="pdp__stars">★★★★★ <span>${t.rating||5} · ${t.reviews||2} ratings</span></div>
    <div class="pdp__price">${h(t.price)}</div>
    <p class="pdp__blurb">${t.blurb}</p>
    <div class="pdp__label">Colour</div>
    <div class="pdp__swatches">
      ${m.map(s=>`
        <a class="pdp__swatch ${s.id===t.id?"is-on":""}" href="./buy.html?id=${s.id}&w=2" title="${s.name} ${s.colorway}" style="background-image:url(${s.looks?.[0]||s.background})"></a>
      `).join("")}
    </div>
    <div class="pdp__label">Size</div>
    <div class="pdp__sizes">
      ${["XS","S","M","L","XL"].map(s=>`<button type="button" data-size="${s}" class="${e.size===s?"is-on":""}">${s}</button>`).join("")}
    </div>
    <div class="pdp__buyrow">
      <div class="pdp__qty">
        <button type="button" data-q="-1">−</button>
        <span>${e.qty}</span>
        <button type="button" data-q="1">+</button>
      </div>
      <button class="btn btn--solid pdp__bag" id="addBag">ADD TO BAG</button>
    </div>
    <button type="button" class="pdp__3d" id="inspectBtn">View in 3D</button>
    <div class="pdp__specs">
      <div><b>Fabric</b><span>${t.fabric}</span></div>
      <div><b>Length</b><span>${t.length}</span></div>
      <div><b>Fit</b><span>${t.fit}</span></div>
    </div>
  `;const d=m.filter(s=>s.id!==t.id);n("#similar").innerHTML=d.map(s=>`
    <a class="pdp__card" href="./buy.html?id=${s.id}&w=2">
      <span class="pdp__card-img" data-src="${s.looks?.[2]||s.looks?.[0]}"></span>
      <span class="pdp__card-name">${s.name}</span>
      <span class="pdp__card-meta">${s.colorway} · ${h(s.price)}</span>
    </a>
  `).join("");const r=new IntersectionObserver(s=>{s.forEach(o=>{const c=o.target;!o.isIntersecting||c.style.backgroundImage||(c.style.backgroundImage=`url(${c.dataset.src})`,r.unobserve(c))})},{rootMargin:"120px"});u("#similar [data-src]").forEach(s=>r.observe(s)),A(),u("#thumbs [data-shot]").forEach(s=>s.addEventListener("click",()=>l(+s.dataset.shot))),$()}function l(t){const a=g(e.product);e.shot=(t+a.length)%a.length,$()}function A(){u("[data-size]").forEach(t=>t.addEventListener("click",()=>{e.size=t.dataset.size,v()})),u("[data-q]").forEach(t=>t.addEventListener("click",()=>{e.qty=Math.max(1,e.qty+Number(t.dataset.q)),v()})),n("#addBag")?.addEventListener("click",B),n("#inspectBtn")?.addEventListener("click",()=>l(g(e.product).length-1))}function B(){const t=e.product,a=e.cart.find(i=>i.id===t.id&&i.size===e.size);a?a.qty+=e.qty:e.cart.push({id:t.id,qty:e.qty,size:e.size}),q(e.cart),L(),b(`${t.name} ${t.colorway} · ${e.size} added`),k()}function L(){const t=e.cart.reduce((s,o)=>s+o.qty,0),a=n("#cartCount");a.textContent=t,a.classList.toggle("is-on",t>0);const i=n("#cartItems"),d=n("#cartEmpty");e.cart.length?(d.classList.add("is-hidden"),i.innerHTML=e.cart.map(s=>{const o=m.find(c=>c.id===s.id);return`<div class="cart__item">
        <span class="cart__item-thumb" style="background-image:url(${o.looks?.[0]||o.background})"></span>
        <div class="cart__item-meta">
          <div class="cart__item-name">${o.name} ${o.colorway}</div>
          <div class="cart__item-gender">Size ${s.size}</div>
        </div>
        <div class="cart__item-price">${h(o.price*s.qty)}</div>
      </div>`}).join("")):(i.innerHTML="",d.classList.remove("is-hidden"));const r=e.cart.reduce((s,o)=>{const c=m.find(w=>w.id===o.id);return s+c.price*o.qty},0);n("#cartTotal").textContent=h(r)}function k(){n("#cart").classList.add("is-open"),n("#scrim").classList.add("is-open")}function _(){n("#cart").classList.remove("is-open"),n("#scrim").classList.remove("is-open")}function b(t){const a=n("#toast");a.textContent=t,a.classList.add("is-on"),clearTimeout(b._t),b._t=setTimeout(()=>a.classList.remove("is-on"),2200)}n("#prevShot").addEventListener("click",()=>l(e.shot-1));n("#nextShot").addEventListener("click",()=>l(e.shot+1));window.addEventListener("keydown",t=>{t.key==="ArrowRight"&&l(e.shot+1),t.key==="ArrowLeft"&&l(e.shot-1),t.key==="Escape"&&_()});let E=0;n("#stage").addEventListener("pointerdown",t=>{E=t.clientX});n("#stage").addEventListener("pointerup",t=>{if(g(e.product)[e.shot]?.type==="3d")return;const i=t.clientX-E;i>40&&l(e.shot-1),i<-40&&l(e.shot+1)});n("#navCart").addEventListener("click",k);n("#cartClose").addEventListener("click",_);n("#scrim").addEventListener("click",_);const y=n("#navBurger"),M=n("#navLinks");y?.addEventListener("click",()=>{const t=M.classList.toggle("is-open");y.setAttribute("aria-expanded",String(t))});v();L();
