const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../app/assets/location.js'),'utf8');
function fixture({denied=false,unsupported=false}={}) {
  let click,requested=0,submitted=0;
  const button={addEventListener:(_,fn)=>click=fn,disabled:false};
  const status={textContent:''};
  const select={id:'f-lok',value:'',dispatchEvent:()=>{}};
  const context={window:{isSecureContext:true},navigator:{geolocation:unsupported?null:{
    getCurrentPosition:(success,error)=>{requested++;if(denied)error({code:1});else success({coords:{latitude:-6.92,longitude:107.61}});}
  }},Event:class{},document:{querySelector:selector=>({'#nearby-button':button,'#nearby-status':status,'#f-lok':select,'#filter-form':{requestSubmit:()=>submitted++}}[selector]||null)}};
  vm.runInNewContext(source,context);context.window.BukatokoLocation.init();
  return {api:context.window.BukatokoLocation,click:()=>click(),status,select,button,requested:()=>requested,submitted:()=>submitted};
}
test('location is requested only after a click and applies the supported city',()=>{
  const f=fixture();assert.equal(f.requested(),0);f.click();
  assert.equal(f.requested(),1);assert.equal(f.select.value,'Bandung');assert.equal(f.submitted(),1);assert.equal(f.button.disabled,false);
});
test('denied or unsupported geolocation keeps manual city selection available',()=>{
  for(const options of [{denied:true},{unsupported:true}]){
    const f=fixture(options);f.select.value='Surabaya';f.click();
    assert.equal(f.select.value,'Surabaya');assert.equal(f.submitted(),0);assert.equal(f.button.disabled,false);assert.match(f.status.textContent,/Pilih kota/);
  }
});
test('city approximation rejects invalid coordinates and locations outside coverage',()=>{
  const {api}=fixture();assert.equal(api.nearest(51.5,-.12),null);
  assert.equal(api.nearest(NaN,107),null);assert.equal(api.nearest(91,107),null);
  assert.equal(api.nearest(-7.96,112.63).city,'Malang');
});
