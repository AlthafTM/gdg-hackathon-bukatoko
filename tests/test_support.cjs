const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('bug reports stay local until an explicit GitHub link is opened, and edits invalidate the preview',async()=>{
  const {Window}=await import('happy-dom');
  const window=new Window({url:'https://example.test/bantuan.html'});
  try {
    window.document.body.innerHTML=fs.readFileSync(path.resolve(__dirname,'../app/bantuan.html'),'utf8').match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];
    let requests=0;
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../app/assets/support.js'),'utf8'),{
      document:window.document,URL,Blob,setTimeout,fetch:()=>{requests++;throw Error('Unexpected network request');}
    });
    const document=window.document, form=document.querySelector('#bug-form');
    const values={'bug-title':'Filter <script>alert(1)</script>','bug-page':'Jelajah','bug-steps':'Pilih harga','bug-expected':'Hasil berubah','bug-actual':'Hasil tetap'};
    for(const [id,value] of Object.entries(values))document.getElementById(id).value=value;
    form.dispatchEvent(new window.Event('submit',{cancelable:true}));
    const link=document.querySelector('#bug-github'), result=document.querySelector('#bug-result');
    assert.equal(requests,0);
    assert.equal(result.hidden,false);
    assert.equal(document.querySelector('#bug-preview script'),null);
    const url=new URL(link.href);
    assert.equal(url.origin,'https://github.com');
    assert.equal(url.pathname,'/AlthafTM/gdg-hackathon-bukatoko/issues/new');
    assert.equal(url.searchParams.get('title'),'[Bug] '+values['bug-title']);
    assert.match(url.searchParams.get('body'),/Pilih harga/);
    assert.doesNotMatch(url.searchParams.get('body'),/cookie|userAgent|example\.test/);
    document.querySelector('#bug-actual').value='Baru';
    form.dispatchEvent(new window.Event('input',{bubbles:true}));
    assert.equal(result.hidden,true);
    assert.equal(link.hasAttribute('href'),false);
  } finally {await window.happyDOM.abort();window.close();}
});
