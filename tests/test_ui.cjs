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
  const context = {window: {}, localStorage: {getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v)},
    sessionStorage: {getItem: () => ''}, document: {readyState: 'loading', documentElement: html,
      addEventListener: () => {}, querySelector: s => s === '#theme-toggle' ? button : null,
      createElement: tag => new Element(tag), createElementNS: (_,tag) => new Element(tag),
      createTextNode: text => ({textContent: text})}};
  const source = fs.readFileSync(path.resolve(__dirname,'../app/assets/app.js'),'utf8');
  const instrumented = source.replace('if (document.readyState === "loading")',
    'window.testUI = {card: card, initTheme: initTheme}; if (document.readyState === "loading")');
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
test('cards expose square media, working detail links, price, condition, city and seller', () => {
  const {api} = fixture();
  const item = {id:'test-1',title:'Kamera bekas',price:900000,condition:'Bekas, mulus',city:'Bandung',
    owner:{name:'penjual'},created_at:'2026-11-07T00:00:00Z',photo_urls:['/uploads/sample.jpg'],status:'active'};
  const card = api.card(item), link = card.children[0], image = link.children[0], body = card.children[1];
  assert.equal(link.attrs.href,'listing.html?id=test-1');
  assert.equal(image.attrs.width,'640'); assert.equal(image.attrs.height,'640');
  assert.equal(image.attrs.src,'/uploads/sample.jpg');
  assert.equal(body.children[1].attrs.href,link.attrs.href);
  assert.equal(body.children[2].textContent,item.condition);
  assert.equal(body.children[3].children[1].textContent,item.city);
  assert.match(body.children[4].textContent,/penjual/);
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
