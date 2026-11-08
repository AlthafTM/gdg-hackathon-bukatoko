const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
async function fixture(page){
  const {Window}=await import('happy-dom');
  const window=new Window({url:'https://example.test/'+page+'.html'});
  const html=fs.readFileSync(path.resolve(__dirname,'../app',page+'.html'),'utf8');
  window.document.body.innerHTML=html.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];
  window.document.body.dataset.page=page==='index'?'home':page;
  const source=fs.readFileSync(path.resolve(__dirname,'../app/assets/app.js'),'utf8').replace(
    /if \(document.readyState === "loading"\) document.addEventListener\("DOMContentLoaded", boot\);\s*else boot\(\);/,
    'window.shellTest={initShell};');
  vm.runInNewContext(source,{window,document:window.document,location:window.location,URL,URLSearchParams,
    localStorage:window.localStorage,sessionStorage:window.sessionStorage});
  return {window,init:()=>window.shellTest.initShell(),close:async()=>{await window.happyDOM.abort();window.close();}};
}
test('task screens remove previously inserted search/category bars and do not recreate them',async()=>{
  for(const page of ['cari','jual','akun']){
    const f=await fixture(page);try{
      for(const name of ['searchbar','quick-category-bar']){const node=f.window.document.createElement('div');node.className=name;f.window.document.body.appendChild(node);}
      f.init();assert.equal(f.window.document.querySelectorAll('.searchbar,.quick-category-bar').length,0);
      assert.ok(f.window.document.querySelector('.nav a[href="index.html"]'));
    }finally{await f.close();}
  }
});
test('home and browse keep catalog search and quick categories',async()=>{
  for(const page of ['index','jelajah']){
    const f=await fixture(page);try{
      f.init();assert.equal(f.window.document.querySelectorAll('.searchbar').length,1);
      assert.equal(f.window.document.querySelectorAll('.quick-categories a').length,9);
    }finally{await f.close();}
  }
});
