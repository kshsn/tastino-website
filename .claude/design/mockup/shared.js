// Shared header/footer, EN/AR switch and reveal animations for the inner-page mockups.
// Text swap: any element with data-ar="..." shows that Arabic HTML when Arabic is active.
const LOGO='../../source/logo/tastino-logo.svg';
const page=document.body.dataset.page||'';
const T={en:{},ar:{}};
let AR=false;
try{AR=localStorage.getItem('tf-lang')==='ar'}catch(e){}

function header(){
  const L=[['brands','brand.html','Brands','علاماتنا'],['products','products.html','Products','المنتجات'],['quality','about.html#quality','Quality','الجودة'],['about','about.html','About','من نحن'],['contact','distributors.html','Contact','تواصل معنا']];
  return `<nav class="site" id="nav"><div class="wrap nav-in">
    <a class="logo" href="index.html" aria-label="Tastino Foods Inc"><img src="${LOGO}" alt="Tastino Foods Inc"></a>
    <div class="menu">${L.map(l=>`<a href="${l[1]}" class="${l[0]===page?'on':''}" data-ar="${l[3]}">${l[2]}</a>`).join('')}</div>
    <div class="nav-r"><button class="lang" id="lang">عربي</button><a class="btn btn-primary" href="distributors.html" data-ar="كن موزعاً">Become a Distributor</a></div>
  </div></nav>`;
}
function footer(){
  return `<footer class="site"><div class="wrap">
    <div class="foot">
      <div><img src="${LOGO}" alt="Tastino Foods Inc" style="height:90px;width:auto;margin-bottom:14px"><p data-ar="صُنع بعناية، مستوحى من الطبيعة.">Crafted with care. Inspired by nature.</p></div>
      <div><h5 data-ar="علاماتنا">Brands</h5><a href="brand.html">Lora</a><a href="brand.html">Liora</a><a href="brand.html">Andiamo</a><a href="brand.html">TAMA</a></div>
      <div><h5 data-ar="الشركة">Company</h5><a href="about.html" data-ar="من نحن">About</a><a href="about.html#quality" data-ar="الجودة">Quality</a><a href="distributors.html" data-ar="كن موزعاً">Become a Distributor</a><a href="#" data-ar="سياسة الخصوصية">Privacy</a></div>
      <div><h5 data-ar="تواصل معنا">Contact</h5><a href="https://wa.me/201100111887" dir="ltr">+20 110 011 1887</a><a href="mailto:info@tastinofoods.com">info@tastinofoods.com</a><p data-ar="المنطقة الصناعية، العاشر من رمضان، C5، مبنى 21">Industrial City, 10th of Ramadan, C5, Building 21</p></div>
    </div>
    <p class="copy-line" data-ar="© 2026 تستينو فودز. جميع الحقوق محفوظة.">© 2026 Tastino Foods Inc. All rights reserved.</p>
  </div></footer>`;
}
document.getElementById('hdr').outerHTML=header();
document.getElementById('ftr').outerHTML=footer();

function applyLang(){
  document.documentElement.lang=AR?'ar':'en';
  document.documentElement.dir=AR?'rtl':'ltr';
  document.getElementById('lang').textContent=AR?'English':'عربي';
  document.querySelectorAll('[data-ar]').forEach(el=>{
    if(el.dataset.en===undefined) el.dataset.en=el.innerHTML;
    el.innerHTML=AR?el.dataset.ar:el.dataset.en;
  });
  (window.onLang||[]).forEach(f=>f(AR));
}
document.getElementById('lang').onclick=()=>{AR=!AR;try{localStorage.setItem('tf-lang',AR?'ar':'en')}catch(e){};applyLang()};

const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target;const sib=[...el.parentElement.children].filter(c=>c.classList.contains('rv'));el.style.transitionDelay=Math.min(6,Math.max(0,sib.indexOf(el)))*80+'ms';el.classList.add('in');io.unobserve(el)}),{threshold:.12});
window.reveal=()=>document.querySelectorAll('.rv:not(.in)').forEach(el=>io.observe(el));
addEventListener('scroll',()=>document.getElementById('nav').classList.toggle('scrolled',scrollY>10),{passive:true});
window.onLang=window.onLang||[];
addEventListener('DOMContentLoaded',()=>{applyLang();reveal()});
