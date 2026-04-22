/**
 * Haptic feedback patterns for different interactions.
 * Uses the Vibration API with fallback to no-op on unsupported devices.
 */

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator

/** Light tap — button press, toggle */
export function hapticTap() {
  if (canVibrate) navigator.vibrate(10)
}

/** Medium tap — selection confirmed */
export function hapticSelect() {
  if (canVibrate) navigator.vibrate(20)
}

/** Success pattern — winner reveal */
export function hapticSuccess() {
  if (canVibrate) navigator.vibrate([30, 50, 30, 50, 60])
}

/** Error pattern — invalid action */
export function hapticError() {
  if (canVibrate) navigator.vibrate([50, 30, 50])
}

/** Warning pattern — elimination, danger */
export function hapticWarning() {
  if (canVibrate) navigator.vibrate([40, 20, 40])
}

/** Countdown tick — each number */
export function hapticTick() {
  if (canVibrate) navigator.vibrate(15)
}

/** Heavy impact — sortear button, explosion */
export function hapticImpact() {
  if (canVibrate) navigator.vibrate(50)
}

/** Ramp up — building tension during spin */
export function hapticRamp(intensity: number) {
  if (canVibrate) {
    const duration = Math.round(5 + intensity * 20)
    navigator.vibrate(duration)
  }
}

/** Long press feedback — hold to spin */
export function hapticLongPress() {
  if (canVibrate) navigator.vibrate([10, 30, 10, 30, 10])
}
