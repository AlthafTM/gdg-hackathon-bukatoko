const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.env.BUKATOKO_PAGES_DIR || path.resolve(__dirname, '../_site');
const data = JSON.parse(fs.readFileSync(path.join(root, 'assets/preview-data.json')));
let fetches = [];
const context = {URL, window: {}, document: {currentScript: {src: 'https://example.test/gdg-hackathon-bukatoko/assets/preview.js'}},
  fetch: async url => {fetches.push(String(url)); return {ok: true, json: async () => data};}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/preview.js'), 'utf8'), context);
const preview = context.window.BukatokoPreview;

test('export contains only frontend and public fixtures', () => {
  assert.equal(data.listings.length, 14);
  assert.equal(data.wanted.length, 5);
  assert.doesNotMatch(JSON.stringify(data), /example\.com|pass_hash|demo1234/);
  assert.ok(fs.statSync(path.join(root, 'assets/fonts/nunito/Nunito.ttf')).size > 1000);
  assert.match(fs.readFileSync(path.join(root, 'assets/fonts/nunito/OFL.txt'), 'utf8'), /SIL OPEN FONT LICENSE/);
  assert.deepEqual(fs.readdirSync(root).sort(), ['.nojekyll', '404.html', 'akun.html', 'assets', 'cari.html', 'index.html', 'jelajah.html', 'jual.html', 'listing.html', 'profil.html'].sort());
  for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(html, /Pratinjau GitHub Pages|class="strip"|class="foot-note"/);
    assert.doesNotMatch(html, /<script src="assets\/runtime-config\.js/);
    assert.match(html, /src="assets\/logo.svg"/);
    assert.match(html, /<title>BukaToko - Jual apapun disini\.<\/title>/);
    assert.match(html, /assets\/favicon\.svg\?v=2/);
    assert.ok(fs.existsSync(path.join(root, 'assets/logo.svg')));
    assert.match(html, /assets\/react-ui\.css/);
    assert.match(fs.readFileSync(path.join(root,'assets/THIRD-PARTY-NOTICES.txt'),'utf8'), /MIT/);
    for (const module of ['preview.js','locale.js','motion.js','react-ui.js']) {
      assert.ok(html.indexOf('assets/'+module) >= 0);
      assert.ok(html.indexOf('assets/'+module) < html.indexOf('assets/app.js'));
      assert.ok(fs.existsSync(path.join(root,'assets',module)));
    }
  }
});

test('Pages publishes the self-contained preview rather than the cross-origin build', () => {
  const workflow=fs.readFileSync(path.resolve(__dirname,'../.github/workflows/pages.yml'),'utf8');
  assert.match(workflow,/path: _site\s*\n/);
  assert.doesNotMatch(workflow,/path: _site-live/);
  assert.match(workflow,/build_pages\.py --app-url https:\/\/8123-agq3khlycogygkr5hikwu5oeiq\.instabox\.tech/);
});
test('export includes the credited reference photos without missing or altered assets', () => {
  const stock=path.join(root,'assets/stock');
  const manifest=JSON.parse(fs.readFileSync(path.join(stock,'photos.json'),'utf8'));
  assert.equal(manifest.license_url,'https://www.pexels.com/license/');
  assert.equal(manifest.photos.length,data.listings.length);
  for(const item of data.listings){
    const photo=manifest.photos.find(p=>p.listing===item.id);
    assert.ok(photo); assert.match(photo.file,/^pexels-\d+\.jpg$/);
    const bytes=fs.readFileSync(path.join(stock,photo.file));
    assert.equal(bytes.length,photo.bytes);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),photo.sha256);
  }
});

test('search, filters, pagination and sort use the sample snapshot', async () => {
  const page = await preview.request('/api/listings?kat=elektronik&city=Bandung&min=5000000&max=6000000');
  assert.equal(page.total, 1);
  assert.equal(page.items[0].id, 'l1001');
  const search = await preview.request('/api/listings?q=vans');
  assert.equal(search.items[0].id, 'l1002');
  const prices = await preview.request('/api/listings?sort=murah&limit=2&offset=1');
  assert.equal(prices.items.length, 2);
  assert.equal(prices.has_more, true);
  assert.ok(prices.items[0].price <= prices.items[1].price);
  assert.equal((await preview.request('/api/listings?status=sold')).total, 0);
});
test('details, profiles, wanted, guest state and subpath links work', async () => {
  assert.equal((await preview.request('/api/listings/l1001')).is_owner, false);
  assert.equal((await preview.request('/api/users/rangga.putra')).listings.length, 2);
  assert.equal((await preview.request('/api/wanted')).total, 5);
  assert.equal((await preview.request('/api/me')).user, null);
  assert.equal(preview.listingUrl('l1001'), 'https://example.test/gdg-hackathon-bukatoko/listing.html?id=l1001');
  assert.deepEqual(fetches, ['https://example.test/gdg-hackathon-bukatoko/assets/preview-data.json']);
});
test('writes, private endpoints and missing resources are rejected without network writes', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    await assert.rejects(preview.request('/api/listings', {method}), err => err.status === 403);
  }
  await assert.rejects(preview.request('/api/inbox'), err => err.status === 401);
  await assert.rejects(preview.request('/api/listings/missing'), err => err.status === 404);
  await assert.rejects(preview.request('/api/users/missing'), err => err.status === 404);
  assert.equal(fetches.length, 1);
});

test('new public feature reads remain usable in the sample preview',async()=>{
  const selected=await preview.request('/api/listings?ids=l1001,l1002&status=all');
  assert.equal(selected.total,2);
  assert.equal((await preview.request('/api/listings?has_photo=1')).total,0);
  assert.ok((await preview.request('/api/suggest?q=kamera')).items.some(title=>/kamera/i.test(title)));
  assert.equal((await preview.request('/api/comments?target_type=listing&target_id=l1001')).items.length,0);
  assert.equal((await preview.request('/api/wanted/w1/replies')).total,0);
  assert.equal(fetches.length,1);
});
