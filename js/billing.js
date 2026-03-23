/* ============================================================
   BILLING.JS — Sistema de pagos para Splitr
   Soporta: Google Play Billing (via Digital Goods API / Bubblewrap)
   Fallback: Web Payments API para browser
   ============================================================ */

// Product IDs — deben coincidir EXACTAMENTE con los de Play Console
export const PRODUCTS = {
  // Pack individual por modo ($0.99 c/u)
  normal_missile:   'com.diegosky.splitr.skin.normal_missile',
  normal_sniper:    'com.diegosky.splitr.skin.normal_sniper',
  elim_chairs:      'com.diegosky.splitr.skin.elim_chairs',
  elim_slots:       'com.diegosky.splitr.skin.elim_slots',
  team_magnet:      'com.diegosky.splitr.skin.team_magnet',
  team_cards:       'com.diegosky.splitr.skin.team_cards',
  order_race:       'com.diegosky.splitr.skin.order_race',
  order_wheel:      'com.diegosky.splitr.skin.order_wheel',
  duel_western:     'com.diegosky.splitr.skin.duel_western',
  duel_boxing:      'com.diegosky.splitr.skin.duel_boxing',
  revenge_target:   'com.diegosky.splitr.skin.revenge_target',
  revenge_storm:    'com.diegosky.splitr.skin.revenge_storm',
  // Bundle completo ($4.99)
  pro_bundle:       'com.diegosky.splitr.pro_bundle',
};

// Precios de referencia (los reales los devuelve Play Console)
export const PRICES = {
  skin:   0.99,
  bundle: 4.99,
};

/**
 * Detecta si estamos dentro de una TWA (Trusted Web Activity / Play Store)
 * La Digital Goods API solo está disponible en TWA
 */
export function isTWA() {
  return 'getDigitalGoodsService' in window;
}

/**
 * Obtiene el servicio de pagos de Google Play
 * Solo funciona cuando la app corre como TWA
 */
async function getPlayBillingService() {
  if (!isTWA()) return null;
  try {
    return await window.getDigitalGoodsService('https://play.google.com/billing');
  } catch { return null; }
}

/**
 * Compra una skin individual o el bundle Pro
 * @param {string} skinId — ID interno ('normal_missile', 'pro_bundle', etc.)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function purchase(skinId) {
  const productId = PRODUCTS[skinId];
  if (!productId) return { success: false, error: 'Producto no encontrado' };

  // ── RUTA 1: Google Play Billing (TWA / Play Store) ──
  const service = await getPlayBillingService();
  if (service) {
    try {
      // Obtener detalles del producto
      const details = await service.getDetails([productId]);
      if (!details || details.length === 0) {
        return { success: false, error: 'Producto no disponible en tu región' };
      }

      // Lanzar flujo de pago de Play Store
      const paymentRequest = new PaymentRequest(
        [{ supportedMethods: 'https://play.google.com/billing', data: { sku: productId } }],
        { total: { label: details[0].title, amount: details[0].price } }
      );

      const response = await paymentRequest.show();

      // Verificar con Play Console (en producción: hacer esto en tu backend)
      await response.complete('success');
      return { success: true };

    } catch (err) {
      if (err.name === 'AbortError') return { success: false, error: 'Cancelado' };
      return { success: false, error: err.message };
    }
  }

  // ── RUTA 2: Modo demo (browser sin TWA) ──
  // En producción reemplazar con Stripe u otro método web
  return new Promise(resolve => {
    // Simular el flujo — en producción esto abre Stripe Checkout
    console.log(`[Billing Demo] Purchase: ${skinId} → ${productId}`);
    resolve({ success: true, demo: true });
  });
}

/**
 * Restaura compras previas (importante para usuarios que reinstalan)
 * @returns {Promise<string[]>} — lista de skinIds desbloqueados
 */
export async function restorePurchases() {
  const service = await getPlayBillingService();
  if (!service) return [];

  try {
    const purchases = await service.listPurchases();
    const unlocked = [];

    // Mapear productIds de Play a skinIds internos
    const reverseMap = Object.fromEntries(
      Object.entries(PRODUCTS).map(([skinId, productId]) => [productId, skinId])
    );

    for (const purchase of purchases) {
      const skinId = reverseMap[purchase.itemId];
      if (skinId) unlocked.push(skinId);
    }

    return unlocked;
  } catch { return []; }
}
