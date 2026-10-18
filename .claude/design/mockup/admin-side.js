// Admin sidebar plus a mockup-only role switcher, to preview what each role can access.
const ROLES={super:{label:'Super admin',name:'Sara M.',can:['leads','products','brands','media','pages','users','audit']},
  editor:{label:'Content editor',name:'Omar K.',can:['products','brands','media','pages']},
  sales:{label:'Sales',name:'Mona A.',can:['leads']}};
let ROLE='super';try{ROLE=localStorage.getItem('tf-role')||'super'}catch(e){}
function side(active){
  const R=ROLES[ROLE];
  const items=[['leads','admin-leads.html','Leads','<span class="n">4</span>'],['products','admin-product.html','Products',''],['brands','#','Brands',''],['media','#','Media library',''],['pages','#','Page copy & hero',''],['users','#','Users & roles',''],['audit','#','Audit log','']];
  return `<aside class="side">
    <div class="brand"><img src="../../source/logo/tastino-logo.svg" alt="Tastino Foods Inc"></div>
    <small>Sales</small>${items.slice(0,1).map(row).join('')}
    <small>Content</small>${items.slice(1,5).map(row).join('')}
    <small>Administration</small>${items.slice(5).map(row).join('')}
    <div class="me"><i>${R.name[0]}</i><span><b>${R.name}</b>${R.label}</span></div>
    <label style="font-size:11px;opacity:.6;margin:10px 4px 4px">Preview as role (mockup only)</label>
    <select id="roleSel" style="border-radius:10px;padding:8px;background:#1F2C4A;color:#fff;border:1px solid #33416A">
      ${Object.entries(ROLES).map(([k,r])=>`<option value="${k}" ${k===ROLE?'selected':''}>${r.label}</option>`).join('')}
    </select>
  </aside>`;
  function row([k,href,label,extra]){const ok=R.can.includes(k);return `<a href="${ok?href:'#'}" class="${k===active?'on':''} ${ok?'':'locked'}" title="${ok?'':'Not available for '+R.label}">${label}${ok?extra:' 🔒'}</a>`}
}
function mountSide(active){
  document.getElementById('side').outerHTML=side(active);
  document.getElementById('roleSel').onchange=e=>{try{localStorage.setItem('tf-role',e.target.value)}catch(_){};location.reload()};
  return ROLES[ROLE].can.includes(active);
}
function toast(msg){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2200)}
function noAccess(){return `<div class="card" style="padding:60px;text-align:center;margin-top:20px"><div style="font-size:40px">🔒</div><h2 style="margin:10px 0 6px">You don't have access to this area</h2><p class="note">Your role (${ROLES[ROLE].label}) can't open this page. Ask a Super admin if you need access.</p></div>`}
