const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('card saves use the existing saved endpoint and publish confirmed state',async()=>{
  const f=await fixture();try{
    const changes=[];
    f.window.document.addEventListener('bukatoko:saved',event=>changes.push(event.detail.saved));
    assert.equal(await f.window.wantedTest.toggleCardSaved({id:'l1'},false),true);
    assert.equal(await f.window.wantedTest.toggleCardSaved({id:'l1'},true),false);
    const calls=f.requests.filter(r=>r.route==='/api/saved/l1');
    assert.deepEqual(calls.map(r=>r.options.method),['POST','DELETE']);
    assert.deepEqual(changes,[true,false]);
  }finally{await f.close();}
});

test('opening comments retains the total and posting increments it only after API success',async()=>{
  const f=await fixture();try{
    const social=f.window.document.querySelector('.wanted-social');
    const button=social.querySelector('button[aria-expanded]');
    button.click();await f.until(()=>f.window.document.querySelector('.comment-form input'));
    assert.equal(button.querySelector('.reaction-count').textContent,'3');
    f.window.document.querySelector('.comment-form input').value='Barang masih dicari?';
    f.window.document.querySelector('.comment-form button').click();
    await f.until(()=>button.querySelector('.reaction-count').textContent==='4');
    const call=f.requests.find(r=>r.route==='/api/comments' && r.options?.method==='POST');
    assert.equal(call.options.body.target_type,'wanted');
    assert.equal(call.options.body.target_id,'w1');
    assert.equal(call.options.body.body,'Barang masih dicari?');
  }finally{await f.close();}
});

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
    if(route==='/api/saved/l1')return {saved:options.method==='POST'};
    return {items:[]};
  }};
  const source=fs.readFileSync(path.resolve(__dirname,'../app/assets/app.js'),'utf8').replace(
    /if \(document.readyState === "loading"\) document.addEventListener\("DOMContentLoaded", boot\);\s*else boot\(\);/,
    'window.wantedTest={initCari,S,toggleCardSaved};');
  vm.runInNewContext(source,{window,document:window.document,location:window.location,history:window.history,
    localStorage:window.localStorage,sessionStorage:window.sessionStorage,URLSearchParams,URL,
    setTimeout,clearTimeout,console,CustomEvent:window.CustomEvent});
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
    assert.deepEqual([...buttons].map(b=>b.querySelector('.sr-only').textContent.trim()),['Suka','Komentar','Lihat tanggapan']);
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
