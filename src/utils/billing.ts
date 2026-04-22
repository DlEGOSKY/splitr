import { unlockSkin, getUnlockedSkins, getSkinById } from './skins'

// ══════════════════════════════════════════════════════════
// PRODUCT IDS — must match Play Console exactly
// ══════════════════════════════════════════════════════════

export const PRODUCTS: Record<string, string> = {
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
  pro_bundle:       'com.diegosky.splitr.pro_bundle',
}

export const PRICES = {
  skin:   0.99,
  bundle: 4.99,
}

// ══════════════════════════════════════════════════════════
// TWA DETECTION
// ══════════════════════════════════════════════════════════

export function isTWA(): boolean {
  return 'getDigitalGoodsService' in window
}

// ══════════════════════════════════════════════════════════
// DIGITAL GOODS SERVICE (Play Billing)
// ══════════════════════════════════════════════════════════

async function getPlayBillingService(): Promise<unknown | null> {
  if (!isTWA()) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (window as any).getDigitalGoodsService('https://play.google.com/billing')
  } catch {
    return null
  }
}

// ══════════════════════════════════════════════════════════
// PURCHASE
// ══════════════════════════════════════════════════════════

export async function purchase(skinId: string): Promise<{ success: boolean; error?: string }> {
  const productId = PRODUCTS[skinId]
  if (!productId) return { success: false, error: 'Producto no encontrado' }

  // Route 1: Google Play Billing (TWA / Play Store)
  const service = await getPlayBillingService() as Record<string, unknown> | null
  if (service && typeof service.getDetails === 'function') {
    try {
      const details = await (service.getDetails as (ids: string[]) => Promise<Array<{ title: string; price: { currency: string; value: string } }>>)([productId])
      if (!details || details.length === 0) {
        return { success: false, error: 'Producto no disponible en tu región' }
      }

      const paymentRequest = new PaymentRequest(
        [{ supportedMethods: 'https://play.google.com/billing', data: { sku: productId } }],
        { total: { label: details[0].title, amount: { currency: details[0].price.currency, value: details[0].price.value } } }
      )

      const response = await paymentRequest.show()
      await response.complete('success')

      unlockSkin(skinId)
      return { success: true }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, error: 'Cancelado' }
      }
      return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
    }
  }

  // Route 2: Demo mode (browser without TWA)
  const skin = getSkinById(skinId)
  console.log(`[Billing Demo] Purchase: ${skinId} → ${productId}`)
  unlockSkin(skinId)
  return { success: true, error: skin ? undefined : 'Skin no encontrada (demo)' }
}

// ══════════════════════════════════════════════════════════
// RESTORE PURCHASES
// ══════════════════════════════════════════════════════════

export async function restorePurchases(): Promise<string[]> {
  // Route 1: Play Store
  const service = await getPlayBillingService() as Record<string, unknown> | null
  if (service && typeof service.listPurchases === 'function') {
    try {
      const purchases = await (service.listPurchases as () => Promise<Array<{ itemId: string }>>)()
      const reverseMap = Object.fromEntries(
        Object.entries(PRODUCTS).map(([skinId, pid]) => [pid, skinId])
      )

      const unlocked: string[] = []
      for (const p of purchases) {
        const skinId = reverseMap[p.itemId]
        if (skinId) {
          unlockSkin(skinId)
          unlocked.push(skinId)
        }
      }
      return unlocked
    } catch {
      return []
    }
  }

  // Route 2: Local storage
  const skins = getUnlockedSkins()
  return Object.keys(skins).filter(k => skins[k])
}

// ══════════════════════════════════════════════════════════
// CONVENIENCE
// ══════════════════════════════════════════════════════════

export function isPremium(): boolean {
  return Object.keys(getUnlockedSkins()).length > 0
}
