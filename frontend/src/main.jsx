import React, { memo, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { Icon, paths } from './icons.jsx';

const roots = new WeakMap();
const currency = new Intl.NumberFormat('id-ID');
function subscribe(listener) {
  document.addEventListener('bukatoko:language', listener);
  return () => document.removeEventListener('bukatoko:language', listener);
}
function currentLanguage() { return window.BukatokoLocale?.getLanguage() || document.documentElement.lang || 'id'; }
function useText() {
  const language = useSyncExternalStore(subscribe, currentLanguage, () => 'id');
  return value => window.BukatokoLocale?.text(value, language) || value;
}

const ProductCard = memo(function ProductCard({ item, helpers }) {
  const text = useText();
  const real = item.photo_urls?.[0];
  const reference = !real && helpers.referencePhoto(item.id);
  const href = `listing.html?id=${encodeURIComponent(item.id)}`;
  const source = helpers.backendURL(real) || helpers.photo(item.id, `${item.title} ${item.category}`);
  return <article className={`card product-card ${item.status === 'sold' ? 'is-sold' : ''}`}>
    <a className="card-link" href={href} aria-label={text(`Lihat ${item.title}`)}>
      <div className="card-image-link">
        <img className="card-media" src={source} alt={text(`${real ? 'Foto barang: ' : reference ? 'Foto referensi: ' : 'Foto contoh untuk '}${item.title}`)}
          width="640" height="480" loading="lazy" decoding="async" />
        {reference && <span className="photo-reference">{text('Foto referensi')}</span>}
      </div>
      <div className="tw:flex tw:flex-1 tw:flex-col tw:gap-2 tw:p-3 tw:md:p-4 tw:xl:p-5">
        <div className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-2">
          <span className="product-price">Rp {currency.format(Number(item.price || 0))}</span>
          {item.old_price ? <s className="tw:text-xs tw:text-[var(--muted)]">Rp {currency.format(Number(item.old_price))}</s> : null}
        </div>
        <span className="product-title tw:line-clamp-2 tw:min-h-[2.75em] tw:text-[0.9375rem] tw:leading-snug tw:font-extrabold tw:no-underline tw:md:text-base">{item.title}</span>
        <span className="tw:text-xs tw:leading-relaxed tw:text-[var(--muted)] tw:md:text-sm">{text(item.condition)}</span>
        <span className="tw:flex tw:items-center tw:gap-1.5 tw:text-xs tw:text-[var(--muted)] tw:md:text-sm">
          <Icon name="location" className="tw:size-4 tw:shrink-0" />{item.city}
        </span>
        <div className="tw:mt-auto tw:flex tw:flex-wrap tw:gap-x-2 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">
          <span>{item.owner?.name || ''}</span><span>{text(helpers.timeAgo(item.created_at))}</span>
        </div>
        <div className="card-engagement">
          <span className="engagement-stat"><Icon name="heart" /><span className="sr-only">{text('Suka')} </span>{item.likes || 0}</span>
          <span className="engagement-stat"><Icon name="comment" /><span className="sr-only">{text('Komentar')} </span>{item.comments || 0}</span>
        </div>
      </div>
      {item.status === 'sold' && <span className="sold-flag">{text('terjual')}</span>}
    </a>
  </article>;
});

function Catalog({ items, helpers }) {
  return items.map(item => <ProductCard key={item.id} item={item} helpers={helpers} />);
}

function renderCards(target, items, helpers, append = false) {
  let state = roots.get(target);
  if (state && state.host.parentNode !== target) {
    state.root.unmount();
    roots.delete(target);
    state = null;
  }
  if (!state) {
    const host = document.createElement('div');
    host.className = 'react-catalog';
    host.setAttribute('data-react-owned', '');
    target.replaceChildren(host);
    state = { host, root: createRoot(host), items: [], helpers };
    roots.set(target, state);
  }
  state.items = append ? [...state.items, ...items] : items;
  state.root.render(<Catalog items={state.items} helpers={state.helpers} />);
}

function clearCards(target) {
  const state = roots.get(target);
  if (state) { state.root.unmount(); roots.delete(target); }
}

window.BukatokoReact = { renderCards, clearCards, iconMarkup: name => paths[name] || paths.explore };
