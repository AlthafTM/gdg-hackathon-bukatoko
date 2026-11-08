const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function fixture() {
  const label = {tagName:'LABEL',closest:()=>null};
  const protectedLabel = {tagName:'SPAN',closest:()=>({})};
  const attrs = {placeholder:'misal: kamera, sepatu, kulkas'};
  const input = {value:'camera 42',closest:()=>null,hasAttribute:key=>key in attrs,getAttribute:key=>attrs[key],setAttribute:(key,value)=>{attrs[key]=value;}};
  const optionAttrs = {};
  const option = {tagName:'OPTION',closest:()=>null,hasAttribute:key=>key in optionAttrs,setAttribute:(key,value)=>{optionAttrs[key]=value;}};
  const nodes = [
    {nodeValue:'Kata kunci',parentElement:label},
    {nodeValue:'Belum ada barang yang disimpan.',parentElement:label},
    {nodeValue:'Buku',parentElement:protectedLabel},
    {nodeValue:'Mulus',parentElement:option}
  ];
  const document = {body:{},documentElement:{},addEventListener:()=>{},
    createTreeWalker:()=>{let i=0;return {nextNode:()=>nodes[i++]||null};},querySelectorAll:()=>[input]};
  const context={window:{},localStorage:{getItem:()=> 'id'},document,NodeFilter:{SHOW_TEXT:4}};
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../app/assets/locale.js'),'utf8'),context);
  return {locale:context.window.BukatokoLocale,nodes,input,attrs,optionAttrs,document};
}
test('language switches restore Indonesian, preserve user content, form values and option values',()=>{
  const f=fixture();f.locale.setLanguage('en');
  assert.equal(f.nodes[0].nodeValue,'Keywords');
  assert.equal(f.nodes[1].nodeValue,'No saved items yet.');
  assert.equal(f.nodes[2].nodeValue,'Buku');
  assert.equal(f.attrs.placeholder,'e.g. camera, shoes, fridge');
  assert.equal(f.input.value,'camera 42');
  assert.equal(f.optionAttrs.value,'Mulus');
  f.locale.setLanguage('id');
  assert.equal(f.nodes[0].nodeValue,'Kata kunci');
  assert.equal(f.nodes[1].nodeValue,'Belum ada barang yang disimpan.');
  assert.equal(f.attrs.placeholder,'misal: kamera, sepatu, kulkas');
  assert.equal(f.nodes[3].nodeValue,'Mulus');
});
test('dynamic statuses, authentication errors and result counts translate',()=>{
  const f=fixture();
  assert.equal(f.locale.text('14 barang di Bandung','en'),'14 items in Bandung');
  assert.equal(f.locale.text('Email atau kata sandi salah.','en'),'Incorrect email or password.');
  assert.equal(f.locale.text('2 hari lalu','en'),'2 days ago');
  assert.equal(f.locale.text('Pratinjau memuat 14 barang contoh dan 5 permintaan contoh.','en'),'Preview: 14 sample items and 5 sample requests.');
  f.locale.setLanguage('en');
  f.nodes[1].nodeValue='Permintaan terpasang.';
  f.locale.setLanguage('en');assert.equal(f.nodes[1].nodeValue,'Request posted.');
  f.locale.setLanguage('id');assert.equal(f.nodes[1].nodeValue,'Permintaan terpasang.');
});
test('static UI copy including moderation and missing-page screens has an English translation',()=>{
  const f=fixture();
  const allow=new Set(['Fashion','Bandung','Bekasi','Denpasar','Jakarta Barat','Jakarta Pusat','Jakarta Selatan','Malang','Semarang','Sleman','Surabaya','Tangerang','Yogyakarta','BukaToko','Bukatoko','EN','min','Status']);
  const decode=s=>s.replace(/&amp;/g,'&').replace(/&larr;/g,'←').replace(/&#(?:x([\da-f]+)|(\d+));/gi,(_,h,d)=>String.fromCodePoint(parseInt(h||d,h?16:10)));
  const missing=[];
  for(const filename of fs.readdirSync(path.resolve(__dirname,'../app')).filter(name=>name.endsWith('.html'))) {
    const html=fs.readFileSync(path.resolve(__dirname,'../app',filename),'utf8')
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
    const values=[...html.matchAll(/>([^<>]+)</g)].map(m=>m[1]);
    for(const match of html.matchAll(/(?:placeholder|aria-label|alt)="([^"]+)"/g)) values.push(match[1]);
    for(const raw of values) {
      const value=decode(raw.trim());
      if(!value || !/[A-Za-z]/.test(value) || allow.has(value) || value.startsWith('Rp '))continue;
      if(f.locale.text(value,'en')===value)missing.push(filename+': '+value);
    }
  }
  assert.deepEqual(missing,[]);
});
test('every constant backend error has an English translation',()=>{
  const {locale}=fixture();
  const server=fs.readFileSync(path.resolve(__dirname,'../app/server.py'),'utf8');
  const errors=[...server.matchAll(/"error": "([^"]+)"/g)].map(match=>match[1]);
  assert.ok(errors.length>40);
  assert.deepEqual(errors.filter(message=>locale.text(message,'en')===message),[]);
});
