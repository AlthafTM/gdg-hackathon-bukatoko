const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

async function fixture(){
  const {Window}=await import('happy-dom');
  const window=new Window({url:'https://example.test/cari.html'});
  const html=fs.readFileSync(path.resolve(__dirname,'../app/cari.html'),'utf8');
  window.document.body.innerHTML=html.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];
  const requests=[];
  window.BukatokoPreview={request:async(route,options)=>{
    requests.push({route,options});
    if(route==='/api/wanted')return {items:[{id:'w1',title:'Cari kamera bekas',category:'elektronik',city:'Bandung',
      owner:{name:'seller'},created_at:'2026-11-08',price_min:100000,price_max:500000,note:'Untuk kuliah',likes:2,comments:3,replies:4}]};
    if(route==='/api/likes')return {liked:true,likes:3};
    return {items:[]};
  }};
  const source=fs.readFileSync(path.resolve(__dirname,'../app/assets/app.js'),'utf8').replace(
    /if \(document.readyState === "loading"\) document.addEventListener\("DOMContentLoaded", boot\);\s*else boot\(\);/,
    'window.wantedTest={initCari,S};');
  vm.runInNewContext(source,{window,document:window.document,location:window.location,history:window.history,
    localStorage:window.localStorage,sessionStorage:window.sessionStorage,URLSearchParams,URL,
    setTimeout,clearTimeout,console});
  window.wantedTest.S.me={name:'tester'};
  window.wantedTest.initCari();
  async function until(check){for(let i=0;i<100&&!check();i++)await new Promise(r=>setTimeout(r,5));assert.ok(check());}
  await until(()=>window.document.querySelector('.wanted-social'));
  return {window,requests,until,close:async()=>{await window.happyDOM.abort();window.close();}};
}
test('wanted social icons stay in the footer while expanded panels sit outside it',async()=>{
  const f=await fixture();try{
    const social=f.window.document.querySelector('.wanted-social');
    const buttons=social.querySelectorAll('button');
    assert.equal(buttons.length,3);
    assert.deepEqual([...buttons].map(b=>b.querySelector('.sr-only').textContent.trim()),['Suka','Komentar','Tanggapan']);
    assert.deepEqual([...buttons].map(b=>b.querySelector('.reaction-count').textContent),['2','3','4']);
    assert.ok([...buttons].every(b=>b.querySelector('svg')));
    buttons[1].click();
    await f.until(()=>f.window.document.querySelector('.comment-box'));
    assert.equal(buttons[1].getAttribute('aria-expanded'),'true');
    assert.equal(social.querySelector('.comment-slot'),null);
    assert.equal(f.window.document.querySelector('.comment-slot').hidden,false);
    buttons[2].click();
    await f.until(()=>f.window.document.querySelector('.wanted-replies').textContent.includes('Belum ada'));
    assert.equal(buttons[2].getAttribute('aria-expanded'),'true');
  }finally{await f.close();}
});
test('liking a request retains its icon, updates its count and uses the existing API payload',async()=>{
  const f=await fixture();try{
    const like=f.window.document.querySelector('.wanted-social button');like.click();
    await f.until(()=>like.getAttribute('aria-pressed')==='true');
    assert.ok(like.querySelector('svg'));
    assert.equal(like.querySelector('.reaction-count').textContent,'3');
    const write=f.requests.find(r=>r.route==='/api/likes');
    assert.equal(write.options.method,'POST');
    assert.equal(write.options.body.target_type,'wanted');assert.equal(write.options.body.target_id,'w1');
  }finally{await f.close();}
});
