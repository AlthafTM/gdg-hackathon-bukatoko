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
  const root={dataset:{},classList:{add:v=>rootClasses.add(v),remove:v=>rootClasses.delete(v)},animate:(frames,settings)=>{
    animations.push({frames,settings});return {finished:Promise.resolve()};}};
  const document={documentElement:root,body:{nodeType:1,matches:()=>false,querySelectorAll:()=>[element]}};
  if(!options.fallback)document.startViewTransition=update=>{update();return {ready:Promise.resolve(),finished:Promise.resolve()};};
  class IO {constructor(callback){onIntersection=callback;} observe(v){observed.push(v);}unobserve(){}}
  const context={window:{matchMedia:()=>reduced,innerWidth:1200,innerHeight:800,IntersectionObserver:IO,setTimeout:fn=>timers.push(fn)},
    document,IntersectionObserver:IO,MutationObserver:class {observe(){}}};
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../app/assets/motion.js'),'utf8'),context);
  return {api:context.window.BukatokoMotion,classes,animations,timers,rootClasses,observed,element,
    button:{getBoundingClientRect:()=>({left:100,top:40,width:40,height:40})},
    intersection:entry=>onIntersection([Object.assign({target:element},entry)])};
}
test('theme reveal starts at the button and reaches the farthest viewport corner',async()=>{
  const f=fixture();let updates=0;
  await f.api.theme(f.button,()=>updates++);
  assert.equal(updates,1);assert.equal(f.animations.length,1);
  assert.equal(f.animations[0].frames.clipPath[0],'circle(0px at 120px 60px)');
  assert.equal(f.animations[0].settings.pseudoElement,'::view-transition-new(root)');
  assert.equal(f.animations[0].settings.duration,900);
  assert.equal(f.animations[0].settings.delay,120);
  const radius=Number(f.animations[0].frames.clipPath[1].match(/circle\(([\d.]+)/)[1]);
  assert.ok(radius>=Math.hypot(1080,740));
});
test('reduced motion updates the theme immediately without animated snapshots',async()=>{
  const f=fixture({reduced:true});let updates=0;await f.api.theme(f.button,()=>updates++);
  assert.equal(updates,1);assert.equal(f.animations.length,0);f.api.init();assert.equal(f.observed.length,0);
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
