import{B as $,P as m,w as E,m as v,_ as I}from"./products-DaRoWPrD.js";const i=(t,a=document)=>a.querySelector(t),u=(t,a=document)=>[...a.querySelectorAll(t)],S=new URLSearchParams(location.search),q=S.get("id")||"lime",s={product:m.find(t=>t.id===q)||m[0],shot:0,size:"M",qty:1,cart:(()=>{try{return JSON.parse(localStorage.getItem($)||"[]")}catch{return[]}})(),front:"A"},C=t=>{try{localStorage.setItem($,JSON.stringify(t))}catch{}};function g(t){var d;const a=(t.looks||[]).slice(0,3).map((e,n)=>({type:"photo",src:e,label:"Look 0"+(n+1)})),o=(t.details||[]).slice(0,3).map((e,n)=>({type:"photo",src:e,label:"Detail 0"+(n+1)})),r=[{type:"3d",label:"360°",src:(d=t.looks)==null?void 0:d[0]}];return[...a,...o,...r]}let p=null;async function z(){if(p)return p;const{JacketInspect:t}=await I(async()=>{const{JacketInspect:a}=await import("./scene3d-DcWVWaON.js");return{JacketInspect:a}},[],import.meta.url);return p=new t(i("#inspect3d"),s.product),p}function T(t){const a=document.documentElement.style;a.setProperty("--accent",t.accent),a.setProperty("--accent-soft",t.accentSoft),a.setProperty("--glow",t.glow),document.documentElement.dataset.theme=t.id,document.title=`MIRRIN — ${t.name} ${t.colorway}`}function L(){const t=s.product,a=g(t);s.shot>=a.length&&(s.shot=0);const o=a[s.shot],r=i("#stage");if(u("#thumbs [data-shot]").forEach(n=>n.classList.toggle("is-on",+n.dataset.shot===s.shot)),o.type==="3d"){r.classList.add("is-3d"),r.style.backgroundImage="none",i("#shotBadge").textContent="3D INSPECT",z().then(n=>{n.setRunning(!0),n._resize()});return}r.classList.remove("is-3d"),p&&p.setRunning(!1);const d=s.front==="A"?i("#stageB"):i("#stageA"),e=s.front==="A"?i("#stageA"):i("#stageB");r.style.backgroundImage=`url(${o.src})`,d.src=o.src,d.alt=`${t.name} ${o.label}`,d.classList.add("is-on"),e.classList.remove("is-on"),s.front=s.front==="A"?"B":"A",i("#shotBadge").textContent=o.label}function y(){const t=s.product,a=g(t);s.shot>=a.length&&(s.shot=0),T(t),i("#crumbs").innerHTML=`<a href="./">Home</a> / <a href="./#shop">Shop</a> / <span>${t.name} ${t.colorway}</span>`,i("#thumbs").innerHTML=a.map((e,n)=>`
    <button type="button" class="pdp__thumb ${n===s.shot?"is-on":""} ${e.type==="3d"?"is-3d":""}"
      data-shot="${n}" data-src="${e.src||""}"
      ${e.type!=="3d"&&n<5?`style="background-image:url(${e.src})"`:""}
      aria-label="${e.label}">${e.type==="3d"?"360°":""}</button>
  `).join("");const o=new IntersectionObserver(e=>{e.forEach(n=>{const c=n.target;!n.isIntersecting||c.style.backgroundImage||c.classList.contains("is-3d")||(c.style.backgroundImage=`url(${c.dataset.src})`,o.unobserve(c))})},{rootMargin:"80px"});u("#thumbs [data-src]").forEach(e=>{!e.style.backgroundImage&&!e.classList.contains("is-3d")&&o.observe(e)}),i("#fitNote").textContent=t.fit||"",i("#reviewCount").textContent=`${t.reviews||2} reviews`,i("#info").innerHTML=`
    <div class="pdp__brand">MIRRIN</div>
    <h1>${t.name} ${t.colorway}</h1>
    <span class="pdp__sticker pdp__sticker--wm">${E(t)}</span>
    <div class="pdp__sub">${t.gender}</div>
    <div class="pdp__stars">★★★★★ <span>${t.rating||5} · ${t.reviews||2} ratings</span></div>
    <div class="pdp__price">${v(t.price)}</div>
    <p class="pdp__blurb">${t.blurb}</p>
    <div class="pdp__label">Colour</div>
    <div class="pdp__swatches">
      ${m.map(e=>{var n;return`
        <a class="pdp__swatch ${e.id===t.id?"is-on":""}" href="./buy.html?id=${e.id}&w=2"
          title="${e.name} ${e.colorway}" style="background-image:url(${((n=e.looks)==null?void 0:n[0])||e.background})"></a>
      `}).join("")}
    </div>
    <div class="pdp__label">Size</div>
    <div class="pdp__sizes">
      ${["XS","S","M","L","XL"].map(e=>`<button type="button" data-size="${e}" class="${s.size===e?"is-on":""}">${e}</button>`).join("")}
    </div>
    <div class="pdp__buyrow">
      <div class="pdp__qty">
        <button type="button" data-q="-1">−</button>
        <span>${s.qty}</span>
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
  `;const r=m.filter(e=>e.id!==t.id);i("#similar").innerHTML=r.map(e=>{var n,c;return`
    <a class="pdp__card" href="./buy.html?id=${e.id}&w=2">
      <span class="pdp__card-img" data-src="${((n=e.looks)==null?void 0:n[2])||((c=e.looks)==null?void 0:c[0])}"></span>
      <span class="pdp__card-name">${e.name}</span>
      <span class="pdp__card-meta">${e.colorway} · ${v(e.price)}</span>
    </a>
  `}).join("");const d=new IntersectionObserver(e=>{e.forEach(n=>{const c=n.target;!n.isIntersecting||c.style.backgroundImage||(c.style.backgroundImage=`url(${c.dataset.src})`,d.unobserve(c))})},{rootMargin:"120px"});u("#similar [data-src]").forEach(e=>d.observe(e)),B(),u("#thumbs [data-shot]").forEach(e=>e.addEventListener("click",()=>l(+e.dataset.shot))),L()}function l(t){const a=g(s.product).length;s.shot=(t%a+a)%a,L()}function B(){var t,a;u("[data-size]").forEach(o=>o.addEventListener("click",()=>{s.size=o.dataset.size,y()})),u("[data-q]").forEach(o=>o.addEventListener("click",()=>{s.qty=Math.max(1,s.qty+Number(o.dataset.q)),y()})),(t=i("#addBag"))==null||t.addEventListener("click",A),(a=i("#inspectBtn"))==null||a.addEventListener("click",()=>l(g(s.product).length-1))}function A(){const t=s.product,a=s.cart.find(o=>o.id===t.id&&o.size===s.size);a?a.qty+=s.qty:s.cart.push({id:t.id,qty:s.qty,size:s.size}),C(s.cart),k(),_(`${t.name} ${t.colorway} · ${s.size} added`),x()}function x(){const t=s.cart.reduce((o,r)=>o+r.qty,0),a=i("#cartCount");a.textContent=t,a.classList.toggle("is-on",t>0)}function k(){const t=s.cart.reduce((e,n)=>e+n.qty,0),a=i("#cartCount");a.textContent=t,a.classList.toggle("is-on",t>0);const o=i("#cartItems"),r=i("#cartEmpty");s.cart.length?(r.classList.add("is-hidden"),o.innerHTML=s.cart.map(e=>{var c;const n=m.find(h=>h.id===e.id);return`<div class="cart__item">
        <span class="cart__item-thumb" style="background-image:url(${((c=n.looks)==null?void 0:c[0])||n.background})"></span>
        <div class="cart__item-meta">
          <div class="cart__item-name">${n.name} ${n.colorway}</div>
          <div class="cart__item-gender">Size ${e.size}</div>
        </div>
        <div class="cart__item-price">${v(n.price*e.qty)}</div>
      </div>`}).join("")):(o.innerHTML="",r.classList.remove("is-hidden"));const d=s.cart.reduce((e,n)=>{const c=m.find(h=>h.id===n.id);return e+c.price*n.qty},0);i("#cartTotal").textContent=v(d)}function M(){i("#cart").classList.add("is-open"),i("#scrim").classList.add("is-open")}function f(){i("#cart").classList.remove("is-open"),i("#scrim").classList.remove("is-open")}function _(t){const a=i("#toast");a.textContent=t,a.classList.add("is-on"),clearTimeout(_._t),_._t=setTimeout(()=>a.classList.remove("is-on"),2200)}i("#prevShot").addEventListener("click",()=>l(s.shot-1));i("#nextShot").addEventListener("click",()=>l(s.shot+1));window.addEventListener("keydown",t=>{t.key==="ArrowRight"&&l(s.shot+1),t.key==="ArrowLeft"&&l(s.shot-1),t.key==="Escape"&&f()});let w=0;i("#stage").addEventListener("pointerdown",t=>{w=t.clientX});i("#stage").addEventListener("pointerup",t=>{var o;if(((o=g(s.product)[s.shot])==null?void 0:o.type)==="3d")return;const a=t.clientX-w;a>40&&l(s.shot-1),a<-40&&l(s.shot+1)});i("#navCart").addEventListener("click",M);i("#cartClose").addEventListener("click",f);i("#scrim").addEventListener("click",f);const b=i("#navBurger"),R=i("#navLinks");b==null||b.addEventListener("click",()=>{const t=R.classList.toggle("is-open");b.setAttribute("aria-expanded",String(t))});y();k();
