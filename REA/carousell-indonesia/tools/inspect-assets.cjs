const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, "..");
const evidence = path.join(root, "evidence");
const endpoints = [], frameworkMarkers = [], manifest = [];
for (const name of fs.readdirSync(path.join(root, 'web-assets'))) {
  const bytes = fs.readFileSync(path.join(root, 'web-assets', name));
  const text = bytes.toString('utf8');
  manifest.push({file:name,url:'https://mweb-cdn.karousell.com/build/'+name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  for (const m of text.matchAll(/registerEndpoint\(\{method:([^,]+),pathname:(["'])(.*?)\2[^}]*\}/g)) endpoints.push({file:name,offset:m.index,path:m[3],methodExpression:m[1],source:m[0]});
  for (const token of ['react-redux-context','redux-saga','hydrateRoot','19.3.1','__LOADABLE_REQUIRED_CHUNKS__','__SENTRY_RELEASE__','/cf/4.0/search/','/search/3.4/products/following/']) {
    const index=text.indexOf(token);
    if(index>=0)frameworkMarkers.push({file:name,offset:index,token,context:text.slice(Math.max(0,index-100),index+token.length+150)});
  }
}
fs.writeFileSync(path.join(evidence,'asset-manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(evidence,'endpoint-candidates.json'),JSON.stringify(endpoints,null,2));
fs.writeFileSync(path.join(evidence,'framework-markers.json'),JSON.stringify(frameworkMarkers,null,2));
console.log(JSON.stringify({files:manifest.length,bytes:manifest.reduce((n,x)=>n+x.bytes,0),registeredEndpoints:endpoints.length,markers:frameworkMarkers.length}));
console.log(JSON.stringify(endpoints.filter(x=>/search|offer|chat|product|review|user|upload/i.test(x.path)).slice(0,35),null,2));
