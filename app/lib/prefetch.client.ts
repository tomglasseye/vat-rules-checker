// Loads a page's data as soon as someone shows they're about to open it (the pointer rests on a
// link, a finger touches it, or the mouse button goes down) and hands that response to React
// Router when the click arrives, so the page can appear straight away.
//
// React Router's own <Link prefetch> leaves the response in the browser's HTTP cache, but these
// responses are marked no-cache, so the browser fetches them again on click and the prefetch is
// wasted. Keeping them here instead also works in Safari, which has no link prefetching.
//
// Anything other than a GET (saving a check, publishing rules, a VIES lookup…) throws away
// everything prefetched, so a page never opens with data from before a change.

const MAX_AGE = 10_000; // a prefetched page older than this is fetched again on click
const HOVER_DELAY = 80; // ms the pointer has to rest on a link
const MAX_IN_FLIGHT = 2; // so sweeping the pointer down a long table doesn't fire dozens of requests

type Entry = { at: number; res: Promise<Response> };
const cache = new Map<string, Entry>();
let inFlight = 0;
let mutating = 0;
let realFetch: typeof fetch;
let started = false;

type ManifestRoute = { module: string; imports?: string[] };
const manifest = () => (window as unknown as { __reactRouterManifest?: { routes: Record<string, ManifestRoute> } }).__reactRouterManifest;

/** The URL React Router fetches a page's data from (see singleFetchUrl in react-router) */
function dataUrl(href: string): string | null {
  const url = new URL(href, window.location.origin);
  if (url.origin !== window.location.origin) return null;
  if (/^\/(api|login|logout)(\/|$)/.test(url.pathname)) return null;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  url.hash = "";
  url.pathname = url.pathname.endsWith("/") ? `${url.pathname}_.data` : `${url.pathname}.data`;
  return url.href;
}

/** Forgets prefetched pages (all of them, or just the stale ones) and lets go of their connections */
function forget(all: boolean) {
  for (const [url, entry] of cache) {
    if (!all && Date.now() - entry.at < MAX_AGE) continue;
    cache.delete(url);
    entry.res.then((r) => r.body?.cancel()).catch(() => {});
  }
}

function take(href: string): Promise<Response> | null {
  const hit = cache.get(href);
  if (!hit) return null;
  cache.delete(href); // a response can only be read once
  return Date.now() - hit.at < MAX_AGE ? hit.res : null;
}

export function prefetch(href: string) {
  preloadRouteModules();
  forget(false);
  const url = dataUrl(href);
  if (!url || mutating || inFlight >= MAX_IN_FLIGHT) return;
  const existing = cache.get(url);
  if (existing && Date.now() - existing.at < MAX_AGE) return;
  inFlight++;
  const res = realFetch(url, { credentials: "same-origin" });
  res.catch(() => {}).finally(() => inFlight--);
  cache.set(url, { at: Date.now(), res });
}

/** Downloads the JavaScript for every page React Router knows about, once, so the first visit to a page doesn't wait for it */
const preloaded = new Set<string>();
function preloadRouteModules() {
  const m = manifest();
  if (!m) return;
  for (const route of Object.values(m.routes)) {
    for (const href of [route.module, ...(route.imports ?? [])]) {
      if (preloaded.has(href)) continue;
      preloaded.add(href);
      const link = document.createElement("link");
      link.rel = "modulepreload";
      link.href = href;
      document.head.appendChild(link);
    }
  }
}

/** Waits for the prefetched response, unless React Router gives up on the navigation first */
function withAbort(res: Promise<Response>, signal: AbortSignal | null | undefined): Promise<Response> {
  if (!signal) return res;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    res.then(resolve, reject);
  });
}

function patchFetch() {
  realFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      forget(true);
      mutating++;
      const res = realFetch(input, init);
      // Drop anything prefetched while the change was being saved, too
      res.catch(() => {}).finally(() => {
        mutating--;
        forget(true);
      });
      return res;
    }
    if (!(input instanceof Request)) {
      const href = new URL(String(input), window.location.origin).href;
      const hit = take(href);
      if (hit) {
        // Fall back to a normal request if the prefetch failed
        const retry = () => realFetch(input, init);
        return withAbort(hit.then((r) => (r.status >= 500 ? retry() : r), retry), init?.signal);
      }
    }
    return realFetch(input, init);
  };
}

function linkFrom(target: EventTarget | null): HTMLAnchorElement | null {
  const a = target instanceof Element ? target.closest("a[href]") : null;
  if (!(a instanceof HTMLAnchorElement)) return null;
  if (a.target && a.target !== "_self") return null;
  if (a.hasAttribute("download") || a.dataset.noPrefetch !== undefined) return null;
  return a;
}

export function startPrefetching() {
  if (typeof window === "undefined" || started) return;
  started = true;
  patchFetch();

  let timer: ReturnType<typeof setTimeout> | undefined;
  let hovered: HTMLAnchorElement | null = null;
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const a = linkFrom(e.target);
    if (a === hovered) return;
    clearTimeout(timer);
    hovered = a;
    if (a) timer = setTimeout(() => prefetch(a.href), HOVER_DELAY);
  });
  document.addEventListener("pointerout", (e) => {
    if (hovered && !hovered.contains(e.relatedTarget as Node | null)) {
      clearTimeout(timer);
      hovered = null;
    }
  });
  // Touch, mouse-down and keyboard focus are strong signals: start straight away
  const now = (e: Event) => {
    clearTimeout(timer); // the click is on its way; a late hover prefetch would only repeat it
    const a = linkFrom(e.target);
    if (a) prefetch(a.href);
  };
  document.addEventListener("touchstart", now, { passive: true });
  document.addEventListener("mousedown", now);
  document.addEventListener("focusin", now);
}
