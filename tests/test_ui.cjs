const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(savedTheme) {
  class Element {
    constructor(tag) { this.tag = tag; this.attrs = {}; this.children = []; this.events = {}; this.className = ''; this.classList = {add: name => {this.className += ' ' + name;}}; }
    setAttribute(k,v) { this.attrs[k] = v; }
    getAttribute(k) { return this.attrs[k] || null; }
    removeAttribute(k) { delete this.attrs[k]; }
    appendChild(child) { this.children.push(child); return child; }
    addEventListener(name, cb) { this.events[name] = cb; }
  }
  const html = new Element('html'), button = new Element('button');
  const storage = new Map(savedTheme ? [['bukatoko:theme',savedTheme]] : []);
  const context = {window: {}, URLSearchParams, localStorage: {getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v)},
    sessionStorage: {getItem: () => ''}, document: {readyState: 'loading', documentElement: html,
      addEventListener: () => {}, querySelector: s => s === '#theme-toggle' ? button : null,
      createElement: tag => new Element(tag), createElementNS: (_,tag) => new Element(tag),
      createTextNode: text => ({textContent: text})}};
  const source = fs.readFileSync(path.resolve(__dirname,'../app/assets/app.js'),'utf8');
  const instrumented = source.replace('if (document.readyState === "loading")',
    'window.testUI = {card: card, initTheme: initTheme, categoryHref: categoryHref}; if (document.readyState === "loading")');
  vm.runInNewContext(instrumented, context);
  return {api: context.window.testUI, html, button, storage};
}
test('new visitors start in light theme and explicit dark preference remains usable', () => {
  const first = fixture(); first.api.initTheme();
  assert.equal(first.html.attrs['data-theme'], 'light');
  first.button.events.click();
  assert.equal(first.html.attrs['data-theme'], 'dark');
  assert.equal(first.storage.get('bukatoko:theme'), 'dark');
  first.button.events.click();
  assert.equal(first.html.attrs['data-theme'], 'light');
  const returning = fixture('dark'); returning.api.initTheme();
  assert.equal(returning.html.attrs['data-theme'], 'dark');
});
test('cards expose 4:3 media, working detail links, price, condition, city and seller', () => {
  const {api} = fixture();
  const item = {id:'test-1',title:'Kamera bekas',price:900000,condition:'Bekas, mulus',city:'Bandung',
    owner:{name:'penjual'},created_at:'2026-11-07T00:00:00Z',photo_urls:['/uploads/sample.jpg'],status:'active'};
  const card = api.card(item), link = card.children[0], image = link.children[0], body = card.children[1];
  assert.equal(link.attrs.href,'listing.html?id=test-1');
  assert.equal(image.attrs.width,'640'); assert.equal(image.attrs.height,'480');
  assert.equal(image.attrs.src,'/uploads/sample.jpg');
  assert.equal(body.children[1].attrs.href,link.attrs.href);
  assert.equal(body.children[2].textContent,item.condition);
  assert.equal(body.children[3].children[1].textContent,item.city);
  assert.match(body.children[4].children[0].textContent,/penjual/);
});
test('sample cards stay labeled and sold items retain their state', () => {
  const {api} = fixture();
  const card = api.card({id:'sold',title:'Buku',price:20000,condition:'Bekas',city:'Bogor',created_at:'2026-11-07',status:'sold'});
  assert.match(card.className,/is-sold/);
  const image = card.children[0].children[0];
  assert.match(image.attrs.alt,/Foto contoh/);
  const svg = decodeURIComponent(image.attrs.src.split(',').slice(1).join(','));
  assert.match(svg,/height="640"/);
  assert.match(svg,/foto contoh/);
});
test('built-in illustrations match item context without replacing real photos', () => {
  const {api} = fixture();
  function illustration(title) {
    const card = api.card({id:'demo',title,category:'elektronik',price:10000,condition:'Bekas',city:'Bandung',created_at:'2026-11-07',status:'active'});
    return decodeURIComponent(card.children[0].children[0].attrs.src);
  }
  const camera=illustration('Kamera Fujifilm'),phone=illustration('iPhone 12'),book=illustration('Set buku sastra');
  assert.notEqual(camera,phone);assert.notEqual(phone,book);
  assert.match(camera,/r="18"/);assert.match(phone,/height="87"/);assert.match(book,/M64 28/);
});
test('seed listings use credited stock photos while uploads take precedence', () => {
  const {api}=fixture();
  const item={id:'l1001',title:'Kamera',price:10000,condition:'Bekas',city:'Bandung',created_at:'2026-11-07',status:'active'};
  const stock=api.card(item).children[0];
  assert.equal(stock.children[0].attrs.src,'assets/stock/pexels-20377495.jpg');
  assert.match(stock.children[0].attrs.alt,/Foto referensi/);
  assert.equal(stock.children[1].textContent,'Foto referensi');
  const uploaded=api.card({...item,photo_urls:['/uploads/own.jpg']}).children[0];
  assert.equal(uploaded.children[0].attrs.src,'/uploads/own.jpg');
  assert.equal(uploaded.children.length,1);
});

test('quick categories preserve search filters and reset pagination', () => {
  const {api}=fixture();
  const href=api.categoryHref('buku','?q=arsitektur&lok=Bandung&min=50000&offset=24');
  const result=new URL(href,'https://example.test/');
  assert.equal(result.searchParams.get('kat'),'buku');
  assert.equal(result.searchParams.get('q'),'arsitektur');
  assert.equal(result.searchParams.get('lok'),'Bandung');
  assert.equal(result.searchParams.get('min'),'50000');
  assert.equal(result.searchParams.has('offset'),false);
  assert.equal(new URL(api.categoryHref('','?kat=buku&q=novel'),'https://example.test/').searchParams.has('kat'),false);
});
