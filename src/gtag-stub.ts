// Defensive stub: ensure window.gtag is callable in case any code runs
// before the head script has executed. The real gtag function is defined
// by the inline script in headTags (see docusaurus.config.ts).
if (typeof window !== 'undefined' && typeof (window as any).gtag !== 'function') {
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = function gtag() {
    (window as any).dataLayer.push(arguments);
  };
}

const TRACKING_ID = 'G-T20LHNBRK6';

function getVariant(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(/(?:^|; )__bffless_variant=([^;]*)/);
    if (match) return decodeURIComponent(match[1]);
    return new URLSearchParams(window.location.search).get('version');
  } catch {
    return null;
  }
}

// Called by Docusaurus on every client-side route change (and once on the
// initial load with previousLocation === null). The initial page_view is
// already fired by the inline head script, so we only fire page_view here
// for actual SPA navigations.
export function onRouteDidUpdate({
  location,
  previousLocation,
}: {
  location: Location;
  previousLocation: Location | null;
}) {
  // Analytics is gated to the canonical public hostnames by the head script in
  // docusaurus.config.ts. On preview deploys and localhost gtag() exists but
  // GA was never loaded, so bail out instead of queueing into dataLayer.
  if (typeof window !== 'undefined' && !(window as any).__ANALYTICS_ENABLED) {
    return;
  }

  if (typeof window === 'undefined' || typeof (window as any).gtag !== 'function') {
    return;
  }

  // Re-read the variant on every route change in case the cookie was set
  // or changed after the initial head script ran (e.g., the visitor used
  // ?version= to switch variants after landing).
  const variant = getVariant();
  if (variant) {
    (window as any).gtag('set', 'user_properties', { variant });
  }

  // Skip the initial load — its page_view was already fired by the head
  // script's gtag('config', ...) call.
  if (previousLocation && location.pathname !== previousLocation.pathname) {
    (window as any).gtag('event', 'page_view', {
      page_path: location.pathname + location.search + location.hash,
      page_title: document.title,
      send_to: TRACKING_ID,
    });
  }
}
