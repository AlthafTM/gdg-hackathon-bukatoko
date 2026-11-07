const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../_site');
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
  assert.ok(fs.statSync(path.join(root, 'assets/fonts/Exo2.ttf')).size > 1000);
  assert.match(fs.readFileSync(path.join(root, 'assets/fonts/OFL.txt'), 'utf8'), /SIL OPEN FONT LICENSE/);
  assert.deepEqual(fs.readdirSync(root).sort(), ['.nojekyll', '404.html', 'akun.html', 'assets', 'cari.html', 'index.html', 'jelajah.html', 'jual.html', 'listing.html', 'moderasi.html', 'profil.html'].sort());
  for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html') && f !== '404.html')) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /Pratinjau GitHub Pages/);
    assert.match(html, /src="assets\/logo.svg"/);
    assert.ok(fs.existsSync(path.join(root, 'assets/logo.svg')));
    assert.ok(html.indexOf('assets/preview.js') < html.indexOf('assets/app.js'));
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
