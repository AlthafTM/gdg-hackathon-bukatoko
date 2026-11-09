const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

async function fixture(){
  const {Window}=await import('happy-dom');
  const window=new Window({url:'https://example.test/jelajah.html'});
  let language='id';
  window.document.documentElement.lang='id';
  window.BukatokoLocale={getLanguage:()=>language,text:(value,lang)=>lang==='en' && value==='Bekas'?'Used':value};
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../app/assets/react-ui.js'),'utf8'),{
    window,document:window.document,navigator:window.navigator,console,
    setTimeout,clearTimeout,setImmediate,clearImmediate,queueMicrotask,performance,
  });
  const target=window.document.createElement('div');window.document.body.appendChild(target);
  const helpers={backendURL:value=>value,referencePhoto:()=>null,photo:()=> 'assets/dummy.jpg',timeAgo:()=> 'baru saja'};
  const item={id:'dummy',title:'Kamera <script>dummy</script>',price:150000,condition:'Bekas',city:'Bandung',owner:{name:'dummy-user'},created_at:'2026-11-08',photo_urls:['/uploads/dummy.jpg'],status:'active'};
  async function until(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}assert.ok(predicate(),'React update did not complete');}
  return {window,target,helpers,item,until,language:value=>{language=value;window.document.dispatchEvent(new window.CustomEvent('bukatoko:language'));},
    close:async()=>{window.BukatokoReact.clearCards(target);await window.happyDOM.abort();window.close();}};
}

test('React cards preserve keyed elements when appending and clear their roots',async()=>{
  const f=await fixture();try{
    f.window.BukatokoReact.renderCards(f.target,[f.item],f.helpers);
    await f.until(()=>f.target.querySelectorAll('article').length===1);
    const first=f.target.querySelector('article');
    assert.equal(first.querySelector('img').getAttribute('height'),'480');
    assert.equal(first.querySelector('img').getAttribute('src'),'/uploads/dummy.jpg');
    assert.equal(first.querySelector('script'),null);
    assert.match(first.textContent,/<script>dummy<\/script>/);
    f.window.BukatokoReact.renderCards(f.target,[{...f.item,id:'second'}],f.helpers,true);
    await f.until(()=>f.target.querySelectorAll('article').length===2);
    assert.equal(f.target.querySelector('article'),first);
    f.window.BukatokoReact.clearCards(f.target);
    assert.equal(f.target.querySelectorAll('article').length,0);
    f.window.BukatokoReact.renderCards(f.target,[f.item],f.helpers);
    await f.until(()=>f.target.querySelectorAll('article').length===1);
  }finally{await f.close();}
});

test('React translates UI state without translating product titles or replacing the card',async()=>{
  const f=await fixture();try{
    f.window.BukatokoReact.renderCards(f.target,[f.item],f.helpers);
    await f.until(()=>f.target.querySelector('article'));
    const first=f.target.querySelector('article');
    f.language('en');await f.until(()=>first.textContent.includes('Used'));
    assert.equal(f.target.querySelector('article'),first);
    assert.match(first.querySelector('.product-title').textContent,/Kamera/);
    f.language('id');await f.until(()=>first.textContent.includes('Bekas'));
  }finally{await f.close();}
});

test('catalog engagement shows real counts without offering actions on the card',async()=>{
  const f=await fixture();try{
    f.window.BukatokoReact.renderCards(f.target,[{...f.item,likes:5,comments:7}],f.helpers);
    await f.until(()=>f.target.querySelector('.card-engagement'));
    const stats=f.target.querySelector('.card-engagement');
    assert.deepEqual([...stats.children].map(stat=>stat.textContent.trim()),['Suka 5','Komentar 7']);
    assert.equal(stats.querySelector('button,a'),null);
    assert.equal(f.target.querySelector('.product-title').getAttribute('href'),'listing.html?id=dummy');
  }finally{await f.close();}
});
