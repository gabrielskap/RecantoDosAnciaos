// ============================================================================
// Rastreamento de conversão — GA4, Meta Pixel e Google Ads.
//
// Os IDs vêm do .env (expostos via define em vite.config.ts):
//   VITE_GA4_ID                 — ex. "G-XXXXXXX"
//   VITE_META_PIXEL_ID          — ex. "123456789012345"
//   VITE_GADS_ID                — ex. "AW-XXXXXXXXX"
//   VITE_GADS_CONVERSION_LABEL  — ex. "abcdEFGhijk" (rótulo da conversão de compra)
//
// TUDO é no-op quando os IDs não estão configurados — seguro em dev/hml.
// Sem esses IDs, o plano de mídia da Hammer (medir CAC por canal) não funciona.
// ============================================================================

const GA4_ID = process.env.VITE_GA4_ID || '';
const META_PIXEL_ID = process.env.VITE_META_PIXEL_ID || '';
const GADS_ID = process.env.VITE_GADS_ID || '';
const GADS_CONVERSION_LABEL = process.env.VITE_GADS_CONVERSION_LABEL || '';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    fbq?: (...args: any[]) => void;
    _fbq?: unknown;
  }
}

let initialized = false;

/** Injeta as tags do Google (GA4/Ads) e do Meta Pixel. Idempotente e no-op sem IDs. */
export function initAnalytics(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // ── Google gtag.js (GA4 + Google Ads compartilham o mesmo script) ──
  const googleId = GA4_ID || GADS_ID;
  if (googleId) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${googleId}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag('js', new Date());
    if (GA4_ID) window.gtag('config', GA4_ID);
    if (GADS_ID) window.gtag('config', GADS_ID);
  }

  // ── Meta Pixel ──
  if (META_PIXEL_ID && !window.fbq) {
    const fbq: any = function (...args: any[]) {
      fbq.callMethod ? fbq.callMethod.apply(fbq, args) : fbq.queue.push(args);
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    window._fbq = window._fbq || fbq;
    const t = document.createElement('script');
    t.async = true;
    t.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(t);
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
}

function ga(event: string, params?: Record<string, unknown>): void {
  window.gtag?.('event', event, params || {});
}
function meta(event: string, params?: Record<string, unknown>): void {
  window.fbq?.('track', event, params || {});
}

// ─── Eventos de conversão nos pontos-chave do funil ─────────────────────────

/** Clique em "Assinar"/"Quero Assinar"/CTA de plano → início de checkout. */
export function trackBeginCheckout(planoId?: string, periodo?: string): void {
  ga('begin_checkout', { plano: planoId, periodo });
  meta('InitiateCheckout', { content_name: planoId });
}

/** Assinatura concluída na tela de sucesso do checkout. */
export function trackPurchase(planoId?: string, valor?: number): void {
  ga('purchase', { plano: planoId, value: valor, currency: 'BRL' });
  meta('Subscribe', { value: valor, currency: 'BRL', content_name: planoId });
  if (GADS_ID && GADS_CONVERSION_LABEL) {
    ga('conversion', {
      send_to: `${GADS_ID}/${GADS_CONVERSION_LABEL}`,
      value: valor,
      currency: 'BRL',
    });
  }
}

/** Lead do funil consultivo/demo (ex.: barra de demo, "Falar com vendas"). */
export function trackLead(source: string): void {
  ga('generate_lead', { source });
  meta('Lead', { content_name: source });
}
