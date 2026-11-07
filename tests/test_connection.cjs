const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function fixture(apiOrigin) {
  const requests=[];
  const window=apiOrigin ? {BukatokoConfig:{apiOrigin}} : {};
  const context={window,URL,URLSearchParams,localStorage:{getItem:()=>null},sessionStorage:{getItem:()=>null},
    document:{readyState:'loading',addEventListener:()=>{}},
    fetch:async (url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({user:null})};}};
  const source=fs.readFileSync(path.resolve(__dirname,'../app/assets/app.js'),'utf8').replace(
    'if (document.readyState === "loading")',
    'window.connectionTest={api,backendURL}; if (document.readyState === "loading")');
  vm.runInNewContext(source,context);
  return {api:window.connectionTest,requests};
}
test('local API keeps same-origin credentials and relative paths',async()=>{
  const {api,requests}=fixture();await api.api('/api/me');
  assert.equal(requests[0].url,'/api/me');assert.equal(requests[0].options.credentials,'same-origin');
});
test('connected API includes cookies and JSON writes go to the configured server',async()=>{
  const {api,requests}=fixture('https://backend.example');
  await api.api('/api/login',{method:'POST',body:{email:'dummy',password:'dummy'}});
  assert.equal(requests[0].url,'https://backend.example/api/login');
  assert.equal(requests[0].options.credentials,'include');
  assert.equal(requests[0].options.headers['Content-Type'],'application/json');
});
test('uploads use the backend origin while local and blob assets remain unchanged',()=>{
  const {api}=fixture('https://backend.example');
  assert.equal(api.backendURL('/uploads/a.jpg'),'https://backend.example/uploads/a.jpg');
  for(const value of ['assets/logo.svg','blob:dummy','https://other.example/a.jpg',undefined])
    assert.equal(api.backendURL(value),value);
});
test('connected export loads configuration instead of the read-only adapter',()=>{
  const root=path.resolve(__dirname,'../_site-live');
  const script=fs.readFileSync(path.join(root,'assets/runtime-config.js'),'utf8');
  const context={window:{}};vm.runInNewContext(script,context);
  assert.equal(context.window.BukatokoConfig.apiOrigin,'https://8123-agq3khlycogygkr5hikwu5oeiq.instabox.tech');
  for(const name of fs.readdirSync(root).filter(v=>v.endsWith('.html'))){
    const html=fs.readFileSync(path.join(root,name),'utf8');
    assert.ok(html.indexOf('assets/runtime-config.js')<html.indexOf('assets/app.js'));
    assert.doesNotMatch(html,/<script src="assets\/preview\.js/);
    assert.match(html,/Buka aplikasi langsung/);
  }
});
