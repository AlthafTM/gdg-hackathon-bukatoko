const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../app/assets/router.js'),'utf8');
async function fixture(options={}){
  const {Window}=await import('happy-dom');
  const window=new Window({url:'https://example.test/shop/index.html'});
  const document=window.document;
  document.documentElement.setAttribute('data-app-shell','');
  document.body.innerHTML=fs.readFileSync(path.resolve(__dirname,'../app/index.html'),'utf8').match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];
  const home=document.createElement('a');home.href='index.html';home.textContent='Home';document.querySelector('.nav').prepend(home);
  window.matchMedia=()=>({matches:!options.motion});window.scrollTo=()=>{};window.confirm=()=>false;
  if(options.motion)document.querySelector('#main').animate=()=>({finished:new Promise(()=>{}),cancel(){}});
  window.BukatokoLocale={text:v=>v};
  let disposals=0,mounts=0;
  vm.runInNewContext(source,{window,document,location:window.location,history:window.history,URL,FormData:window.FormData,
    requestAnimationFrame:fn=>fn(),ResizeObserver:class {observe(){}}});
  const router=window.BukatokoRouter;router.prepare();router.start({before:()=>disposals++,after:()=>mounts++});
  return {window,document,router,counts:()=>({disposals,mounts}),close:async()=>{await window.happyDOM.abort();window.close();}};
}
test('five routes share one document and only the selected template has active IDs',async()=>{
  const f=await fixture();try{
    const header=f.document.querySelector('.hdr'),main=f.document.querySelector('#main');
    assert.equal(f.document.querySelectorAll('template[data-screen]').length,5);
    for(const page of ['jelajah','cari','jual','akun','index']){
      await f.router.navigate(page+'.html');
      assert.equal(f.document.body.dataset.page,page==='index'?'home':page);
      assert.equal(f.document.querySelector('.hdr'),header);assert.equal(f.document.querySelector('#main'),main);
      assert.ok(f.document.querySelectorAll('#f-kat').length<=1);
      assert.equal(f.document.querySelectorAll('.nav a[aria-current=page]').length,1);
    }
    assert.deepEqual(f.counts(),{disposals:5,mounts:5});
  }finally{await f.close();}
});
test('route queries survive navigation and an unsaved sell form can prevent leaving',async()=>{
  const f=await fixture();try{
    await f.router.navigate('jelajah.html?q=kamera&kat=elektronik');
    assert.equal(f.window.location.search,'?q=kamera&kat=elektronik');
    await f.router.navigate('jual.html');f.document.querySelector('#f-judul').value='Barang belum disimpan';
    await f.router.navigate('akun.html');assert.equal(f.document.body.dataset.page,'jual');
    f.window.confirm=()=>true;await f.router.navigate('akun.html#pesan');
    assert.equal(f.document.body.dataset.page,'akun');assert.equal(f.window.location.hash,'#pesan');
    assert.equal(f.router.handles('listing.html?id=x'),false);
  }finally{await f.close();}
});
test('legacy aliases bootstrap the single shell with their query and fragment',()=>{
  let destination;
  const location={pathname:'/shop/akun.html',href:'https://example.test/shop/akun.html?q=test#pesan',search:'?q=test',hash:'#pesan',replace:value=>destination=value};
  const window={};vm.runInNewContext(source,{window,location,URL,document:{documentElement:{hasAttribute:()=>false,dataset:{}}}});
  const url=new URL(destination);assert.equal(url.pathname,'/shop/index.html');assert.equal(url.searchParams.get('screen'),'akun');
  assert.equal(url.searchParams.get('q'),'test');assert.equal(url.hash,'#pesan');assert.equal(window.BukatokoRedirecting,true);
});
test('a paused background animation cannot block route completion',async()=>{
  const f=await fixture({motion:true});try{
    await Promise.race([f.router.navigate('cari.html'),new Promise((_,reject)=>setTimeout(()=>reject(Error('navigation stuck')),1500))]);
    assert.equal(f.document.body.dataset.page,'cari');
    assert.equal(f.document.querySelector('#main').inert,false);
  }finally{await f.close();}
});
