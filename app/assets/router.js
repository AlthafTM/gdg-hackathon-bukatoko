(function () {
  "use strict";
  var files = {"index.html":"home", "jelajah.html":"jelajah", "cari.html":"cari", "jual.html":"jual", "akun.html":"akun"};
  var aliases = {home:"index.html", jelajah:"jelajah.html", cari:"cari.html", jual:"jual.html", akun:"akun.html"};
  var shell = document.documentElement.hasAttribute("data-app-shell");
  var file = location.pathname.split("/").pop() || "index.html";
  if (!shell && Object.prototype.hasOwnProperty.call(files,file)) {
    document.documentElement.dataset.routing = 'true';
    var entry = new URL("index.html", location.href);
    entry.search = location.search; entry.searchParams.set("screen", files[file]); entry.hash = location.hash;
    window.BukatokoRedirecting = true; location.replace(entry.href); return;
  }
  if (!shell) return;
  document.documentElement.dataset.routing = 'true';
  var hooks, busy = false, queued, currentURL, baseline = "";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  function route(url) {
    if (url.origin !== location.origin || url.pathname.slice(0,url.pathname.lastIndexOf('/')+1) !== location.pathname.slice(0,location.pathname.lastIndexOf('/')+1)) return null;
    var name=url.pathname.split('/').pop() || "index.html";
    return Object.prototype.hasOwnProperty.call(files,name) ? files[name] : null;
  }
  function formState() {
    var form = document.querySelector("#jual-form,#wanted-form");
    return form ? JSON.stringify(Array.from(form.querySelectorAll("input,select,textarea")).map(function (e) {
      return [e.id,e.value,e.checked,Array.from(e.files || []).map(function (f) {return [f.name,f.size];})];
    }).concat(Array.from(form.querySelectorAll(".photo-grid img")).map(function(e){return e.src;}))) : "";
  }
  function indicator() {
    var nav = document.querySelector('.nav'), active = nav && nav.querySelector('[aria-current="page"]');
    if (!active) return;
    var plate = nav.querySelector('.nav-indicator');
    if (!plate) {plate=document.createElement('span');plate.className='nav-indicator';plate.setAttribute('aria-hidden','true');nav.prepend(plate);}
    var n=nav.getBoundingClientRect(),a=active.getBoundingClientRect();
    plate.style.width=a.width+'px';plate.style.height=a.height+'px';plate.style.transform='translate('+(a.left-n.left)+'px,'+(a.top-n.top)+'px)';
    requestAnimationFrame(function(){plate.dataset.ready='true';});
  }
  function paintNav(page) {
    document.querySelectorAll('.nav a').forEach(function(a){
      if (route(new URL(a.href))===page) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
    indicator();
  }
  function mount(page) {
    var source=document.querySelector('template[data-screen="'+page+'"]');
    document.querySelector('#main').replaceChildren(source.content.cloneNode(true));
    document.body.dataset.page=page;
    document.querySelectorAll('.searchbar,.quick-category-bar').forEach(function(e){e.remove();});
    var search=document.querySelector('template[data-search="'+page+'"]');
    if(search)document.querySelector('.hdr').after(search.content.cloneNode(true));
  }
  async function navigate(url, options) {
    options=options || {};
    var target=new URL(url,location.href),page=route(target);
    if(!page)return false;
    if(busy){queued={url:target.href,options:options};return true;}
    if(!options.force && currentURL===target.href)return true;
    if(formState()!==baseline && !window.confirm(window.BukatokoLocale ? window.BukatokoLocale.text('Tinggalkan formulir yang belum disimpan?') : 'Tinggalkan formulir yang belum disimpan?')){
      if(options.pop)history.pushState(null,'',currentURL);return true;
    }
    busy=true;
    var main=document.querySelector('#main'), animation;
    main.inert=true;
    try {
      if(!reduced.matches && main.animate){
        animation=main.animate([{opacity:1},{opacity:0,transform:'translateY(-4px)'}],{duration:100,fill:'forwards'});
        // Background tabs can pause the animation timeline; navigation must still complete.
        await Promise.race([animation.finished.catch(function(){}),new Promise(function(resolve){window.setTimeout(resolve,160);})]);
      }
      hooks.before();
      if(!options.pop && !options.initial)history.pushState(null,'',target.href);
      mount(page);currentURL=target.href;
      if(animation)animation.cancel();
      await hooks.after();paintNav(page);baseline=formState();main.inert=false;
      window.scrollTo({top:0,left:0,behavior:'instant'});
      main.setAttribute('tabindex','-1');main.focus({preventScroll:true});
      if(!reduced.matches && main.animate)main.animate([{opacity:.45,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'});
    } finally {main.inert=false;busy=false;if(queued){var next=queued;queued=null;navigate(next.url,next.options);}}
    return true;
  }
  function prepare() {
    var url=new URL(location.href),page=url.searchParams.get('screen') || route(url) || 'home';
    if(!Object.prototype.hasOwnProperty.call(aliases,page))page='home';
    url.searchParams.delete('screen');url.pathname=url.pathname.slice(0,url.pathname.lastIndexOf('/')+1)+aliases[page];
    history.replaceState(null,'',url.href);mount(page);currentURL=url.href;delete document.documentElement.dataset.routing;
  }
  function start(callbacks) {
    hooks=callbacks;baseline=formState();paintNav(document.body.dataset.page);
    document.addEventListener('click',function(e){
      if(e.defaultPrevented || e.button!==0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)return;
      var a=e.target.closest('a[href]');if(!a || a.target || a.hasAttribute('download'))return;
      var url=new URL(a.href);if(!route(url) || (url.pathname===location.pathname && url.search===location.search && url.hash))return;
      e.preventDefault();navigate(url.href);
    });
    document.addEventListener('submit',function(e){
      var form=e.target;if(!form.matches('.search-form') || e.defaultPrevented)return;
      e.preventDefault();var url=new URL(form.action);new FormData(form).forEach(function(v,k){if(typeof v==='string' && v)url.searchParams.set(k,v);});navigate(url.href);
    });
    window.addEventListener('popstate',function(){navigate(location.href,{pop:true,force:true});});
    window.addEventListener('resize',indicator);
    document.addEventListener('bukatoko:language',function(){requestAnimationFrame(indicator);});
    window.addEventListener('beforeunload',function(e){if(formState()!==baseline){e.preventDefault();e.returnValue='';}});
    if(window.ResizeObserver)new ResizeObserver(indicator).observe(document.querySelector('.nav'));
  }
  window.BukatokoRouter={prepare:prepare,start:start,navigate:navigate,handles:function(url){return !!route(new URL(url,location.href));},refresh:function(){return navigate(location.href,{force:true});},updateURL:function(url){history.replaceState(null,'',url);currentURL=location.href;},checkpoint:function(){baseline=formState();}};
}());
