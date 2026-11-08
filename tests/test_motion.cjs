const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function fixture(options={}) {
  const classes=new Set(),animations=[],timers=[],observed=[];
  let onIntersection;
  const reduced={matches:!!options.reduced,addEventListener:()=>{}};
  const element={nodeType:1,isConnected:true,classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)},
    getBoundingClientRect:()=>({top:900,bottom:1200}),matches:()=>true,querySelectorAll:()=>[]};
  const rootClasses=new Set();
  const properties=new Map();
  const root={dataset:{},style:{setProperty:(k,v)=>properties.set(k,v),removeProperty:k=>properties.delete(k)},classList:{add:v=>rootClasses.add(v),remove:v=>rootClasses.delete(v)},animate:(frames,settings)=>{
    animations.push({frames,settings});return {finished:Promise.resolve()};}};
  const document={documentElement:root,body:{nodeType:1,matches:()=>false,querySelectorAll:()=>[element]}};
  let initialState,finish;
  const completion=options.pending?new Promise(resolve=>finish=resolve):Promise.resolve();
  if(!options.fallback)document.startViewTransition=update=>{
    if(options.throw)throw Error('transition unavailable');
    initialState=new Map(properties);update();return {ready:Promise.resolve(),finished:completion};
  };
  class IO {constructor(callback){onIntersection=callback;} observe(v){observed.push(v);}unobserve(){}}
  const context={window:{matchMedia:()=>reduced,getComputedStyle:()=>({backgroundColor:'rgb(23, 25, 31)'}),innerWidth:1200,innerHeight:800,IntersectionObserver:IO,setTimeout:fn=>timers.push(fn)},
    document,IntersectionObserver:IO,MutationObserver:class {observe(){}}};
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../app/assets/motion.js'),'utf8'),context);
  return {api:context.window.BukatokoMotion,classes,animations,timers,rootClasses,observed,element,properties,initialState:()=>initialState,finish:()=>finish(),root,
    button:{getBoundingClientRect:()=>({left:100,top:40,width:40,height:40})},
    intersection:entry=>onIntersection([Object.assign({target:element},entry)])};
}
test('theme reveal starts at the button and reaches the farthest viewport corner',async()=>{
  const f=fixture();let updates=0;
  await f.api.theme(f.button,()=>updates++);
  assert.equal(updates,1);assert.equal(f.animations.length,0);
  assert.equal(f.initialState().get('--theme-x'),'120px');
  assert.equal(f.initialState().get('--theme-y'),'60px');
  assert.equal(f.initialState().get('--theme-backdrop'),'rgb(23, 25, 31)');
  assert.equal(f.properties.size,0);
  const css=fs.readFileSync(path.resolve(__dirname,'../app/assets/styles.css'),'utf8');
  assert.match(css,/html\[data-transition="theme"\]::view-transition-new\(root\) \{ animation: theme-circle 900ms 120ms var\(--ease\) both;/);
  assert.match(css,/::view-transition-old\(root\) \{ animation: none; opacity: 1;/);
  assert.match(css,/::view-transition-group\(\*\) \{ animation: none;/);
  const radius=parseFloat(f.initialState().get('--theme-radius'));
  assert.ok(radius>=Math.hypot(1080,740));
});
test('reduced motion updates the theme immediately without animated snapshots',async()=>{
  const f=fixture({reduced:true});let updates=0;await f.api.theme(f.button,()=>updates++);
  assert.equal(updates,1);assert.equal(f.animations.length,0);f.api.init();assert.equal(f.observed.length,0);
});
test('repeated clicks during a reveal do not reverse the pending theme',async()=>{
  const f=fixture({pending:true});let updates=0;
  const pending=f.api.theme(f.button,()=>updates++);
  await f.api.theme(f.button,()=>updates++);
  assert.equal(f.root.dataset.transition,'theme');
  assert.equal(f.properties.get('--theme-backdrop'),'rgb(23, 25, 31)');
  assert.equal(updates,1);assert.equal(f.animations.length,0);
  f.finish();await pending;
  assert.equal(f.properties.size,0);assert.equal(f.root.dataset.transition,undefined);
});
test('snapshot setup failure commits once and cleans the transition state',async()=>{
  const f=fixture({throw:true});let updates=0;
  await f.api.theme(f.button,()=>updates++);
  assert.equal(updates,1);assert.equal(f.properties.size,0);assert.equal(f.root.dataset.transition,undefined);
});
test('unsupported view transitions fall back to a temporary color fade',async()=>{
  const f=fixture({fallback:true});let updates=0;await f.api.theme(f.button,()=>updates++);
  assert.equal(updates,1);assert.ok(f.rootClasses.has('theme-fade'));
  f.timers[0]();assert.equal(f.rootClasses.has('theme-fade'),false);
});
test('scroll reveal resets after leaving the viewport and repeats on re-entry',()=>{
  const f=fixture();f.api.init();assert.equal(f.observed.length,1);
  assert.ok(f.classes.has('reveal-item'));assert.equal(f.classes.has('is-visible'),false);
  f.intersection({isIntersecting:true,boundingClientRect:{top:500,bottom:800}});assert.ok(f.classes.has('is-visible'));
  f.intersection({isIntersecting:false,boundingClientRect:{top:-200,bottom:-10}});assert.equal(f.classes.has('is-visible'),false);
  f.intersection({isIntersecting:true,boundingClientRect:{top:0,bottom:300}});assert.ok(f.classes.has('is-visible'));
});
