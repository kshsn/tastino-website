// Mockup catalogue, taken from the 2026 company profile. img:null means the client has not supplied a packshot yet.
const IMG='../../source/cutouts/';
const BRANDS={
  lora:{name:'Lora',c:'#E23B3B',en:'Premium Jams',ar:'مربى فاخر'},
  liora:{name:'Liora',c:'#C8102E',en:'Tomato Products',ar:'منتجات الطماطم'},
  andiamo:{name:'Andiamo',c:'#D62828',en:'Sauces & Tahini',ar:'صوصات وطحينة'},
  tama:{name:'TAMA',c:'#2F8F3A',en:'Juices & Nectars',ar:'عصائر ونكتار'},
  tastino:{name:'Tastino Lines',nameAr:'خطوط تستينو',c:'#0F6B3E',en:'Syrups, Traditional & Iced Tea',ar:'شراب، مشروبات تقليدية وشاي مثلج'},
};
const P=(brand,slug,en,ar,cat,pack,sizes,img)=>({brand,slug,en,ar,cat,pack,sizes,img});
const PRODUCTS=[
  // Lora — jams (glass). Individual Lora-labelled packshots not yet supplied.
  P('lora','lora-strawberry','Premium Strawberry Jam','مربى الفراولة الفاخرة','jam','glass','400g · 650g',null),
  P('lora','lora-apricot','Premium Apricot Jam','مربى المشمش الفاخرة','jam','glass','400g · 650g',null),
  P('lora','lora-fig','Premium Fig Jam','مربى التين الفاخرة','jam','glass','400g · 650g',null),
  P('lora','lora-blueberry','Premium Blueberry Jam','مربى التوت الفاخرة','jam','glass','400g · 650g',null),
  P('lora','lora-orange','Premium Orange Marmalade','مربى البرتقال الفاخرة','jam','glass','400g · 650g',null),
  P('lora','lora-guava','Premium Guava Jam','مربى الجوافة الفاخرة','jam','glass','400g · 650g',null),
  P('lora','lora-mixed-berry','Mixed Berry Jam','مربى التوت المشكل','jam','glass','400g · 650g',null),
  P('lora','lora-peach','Peach Jam','مربى الخوخ','jam','glass','400g · 650g',null),
  P('lora','lora-mango','Mango Jam','مربى المانجو','jam','glass','400g · 650g',null),
  // Liora — tomato
  P('liora','liora-tomato-paste','Tomato Paste','معجون طماطم','tomato','tin','400g · 800g · 1kg · 3kg','liora-tomato-paste-can.png'),
  P('liora','liora-tomato-paste-glass','Tomato Paste (Glass)','معجون طماطم (زجاج)','tomato','glass','285g · 300g · 320g',null),
  P('liora','liora-ketchup','Tomato Ketchup','كاتشب طماطم','tomato','glass','400g',null),
  // Andiamo — sauces
  P('andiamo','andiamo-ketchup','Tomato Ketchup','كاتشب طماطم','sauce','pet','400g','andiamo-ketchup.png'),
  P('andiamo','andiamo-mustard','Mustard Sauce','صوص مستردة','sauce','pet','400g','andiamo-mustard.png'),
  P('andiamo','andiamo-bbq','Barbecue Sauce','صوص الباربكيو','sauce','pet','400g','andiamo-bbq.png'),
  P('andiamo','andiamo-hot-sauce','Hot Sauce Special','شطة حارة','sauce','pet','400g','andiamo-hot-sauce.png'),
  P('andiamo','andiamo-hummus-tahini','Hummus Tahini','حمص بالطحينة','sauce','pet','400g','andiamo-hummus-tahini.png'),
  P('andiamo','andiamo-sesame-tahini','Sesame Tahini','طحينة السمسم','sauce','pet','400g','andiamo-sesame-tahini.png'),
  P('andiamo','andiamo-tomato-paste','Tomato Paste','معجون طماطم','tomato','tin','400g','andiamo-tomato-paste-400g.png'),
  // TAMA — juices
  P('tama','tama-mango','Mango Nectar','نكتار مانجو','juice','glass','200ml · 250ml · 1L','tama-mango-nectar-250ml.png'),
  P('tama','tama-lemon','Lemon Nectar','نكتار ليمون','juice','glass','200ml · 250ml · 1L','tama-lemon-nectar-250ml.png'),
  P('tama','tama-guava-orange','Guava & Orange Nectar','نكتار جوافة برتقال','juice','glass','200ml · 250ml · 1L','tama-guava-orange-250ml.png'),
  P('tama','tama-guava','Guava Nectar','نكتار جوافة','juice','glass','200ml · 250ml · 1L',null),
  P('tama','tama-strawberry','Strawberry Nectar','نكتار فراولة','juice','glass','200ml · 250ml · 1L',null),
  P('tama','tama-peach','Peach Nectar','نكتار خوخ','juice','glass','200ml · 250ml · 1L',null),
  P('tama','tama-apple','Apple Nectar','نكتار تفاح','juice','glass','200ml · 250ml · 1L',null),
  P('tama','tama-cocktail','Cocktail Nectar','نكتار كوكتيل','juice','glass','200ml · 250ml · 1L',null),
  P('tama','tama-cranberry','Cranberry Nectar','نكتار توت بري','juice','glass','200ml · 250ml · 1L',null),
  P('tama','tama-orange','Orange Nectar','نكتار برتقال','juice','glass','200ml · 250ml · 1L',null),
  P('tama','tama-berry','Berry Nectar','نكتار توت','juice','glass','200ml · 250ml · 1L',null),
  // Tastino lines
  P('tastino','freshness-vanilla','Freshness Vanilla Syrup','شراب الفانيليا فريشنس','syrup','glass','800ml','freshness-vanilla-syrup-800ml.png'),
  P('tastino','freshness-caramel','Freshness Caramel Syrup','شراب الكراميل فريشنس','syrup','glass','800ml','freshness-caramel-syrup-pump-800ml.png'),
  P('tastino','freshness-passion','Freshness Passion Fruit Syrup','شراب فاكهة الباشن فريشنس','syrup','glass','800ml','freshness-passion-fruit-syrup-800ml.png'),
  P('tastino','freshness-hazelnut','Freshness Hazelnut Syrup','شراب البندق فريشنس','syrup','glass','800ml',null),
  P('tastino','freshness-mojito','Freshness Mojito Syrup','شراب الموهيتو فريشنس','syrup','glass','800ml',null),
  P('tastino','freshness-pina-colada','Freshness Piña Colada Syrup','شراب بينا كولادا فريشنس','syrup','glass','800ml',null),
  P('tastino','karkadeh','Hibiscus (Karkadeh)','كركديه','traditional','glass','330ml',null),
  P('tastino','kharrub','Carob (Kharrub)','خروب','traditional','glass','330ml',null),
  P('tastino','qamar-al-din','Qamar Al Din','قمر الدين','traditional','glass','330ml',null),
  P('tastino','erq-sous','Licorice (Erq Sous)','عرقسوس','traditional','glass','330ml',null),
  P('tastino','the-leaf','THE LEAF Iced Tea','ذا ليف شاي مثلج','icedtea','glass','330ml',null),
];
const CATS={jam:['Jams','مربى'],tomato:['Tomato','طماطم'],sauce:['Sauces','صوصات'],juice:['Juices','عصائر'],syrup:['Syrups','شراب'],traditional:['Traditional','تقليدية'],icedtea:['Iced Tea','شاي مثلج']};
const PACKS={glass:['Glass','زجاج'],pet:['PET','بلاستيك'],tin:['Tin','صفيح']};

function card(p,ar){
  const b=BRANDS[p.brand];
  const ph=p.img?`<img src="${IMG+p.img}" alt="" loading="lazy">`:`<div class="none"><b>${b.name[0]}</b>${ar?'صورة المنتج قريباً':'Packshot coming soon'}</div>`;
  return `<a class="pcard rv" style="--c:${b.c}" href="product.html?p=${p.slug}">
    <span class="tag">${ar&&b.nameAr?b.nameAr:b.name}</span>
    <div class="ph">${ph}</div>
    <h4>${ar?p.ar:p.en}</h4>
    <div class="meta">${ar?PACKS[p.pack][1]:PACKS[p.pack][0]} · <span dir="ltr">${p.sizes}</span></div>
    <div class="go"><span>${ar?'التفاصيل':'View details'}</span><span>${ar?'←':'→'}</span></div>
  </a>`;
}
