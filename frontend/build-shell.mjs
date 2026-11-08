import {readFile,writeFile} from 'node:fs/promises';
const app=new URL('../app/',import.meta.url);
let home=await readFile(new URL('index.html',app),'utf8');
home=home.replace(/<!-- app-shell:start -->[\s\S]*?<!-- app-shell:end -->\s*/,'');
const blocks=[];
for(const [route,file] of [['home','index'],['jelajah','jelajah'],['cari','cari'],['jual','jual'],['akun','akun']]){
  const source=route==='home'?home:await readFile(new URL(file+'.html',app),'utf8');
  const main=source.match(/<main id="main">([\s\S]*?)<\/main>/);
  if(!main)throw Error('Missing main: '+file);
  blocks.push(`<template data-screen="${route}">${main[1]}</template>`);
  if(route==='home'||route==='jelajah'){
    const search=source.match(/(<div class="searchbar[^"]*">[\s\S]*?<\/form>\s*<\/div>\s*<\/div>)/);
    if(!search)throw Error('Missing search: '+file);
    blocks.push(`<template data-search="${route}">${search[1]}</template>`);
  }
}
home=home.replace('</body>','<!-- app-shell:start -->\n'+blocks.join('\n')+'\n<!-- app-shell:end -->\n</body>');
await writeFile(new URL('index.html',app),home,'utf8');
