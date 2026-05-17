/**
 * True when upstream likely rejected the model / plan (vs. transient, bad key, or validation noise).
 * Undgå at behandle alle 422 som plan-fejl — mange 422 er fx ugyldige felter.
 */
export function isElevenLabsModelOrPlanError(status: number, body: string): boolean {
  const s = body.toLowerCase();

  if (status === 402) return true;

  const subscriptionish =
    s.includes('quota') ||
    s.includes('subscription') ||
    s.includes('upgrade') ||
    s.includes('billing') ||
    (s.includes('plan') && (s.includes('tier') || s.includes('upgrade') || s.includes('required')));

  const modelish =
    (s.includes('model') &&
      (s.includes('invalid') ||
        s.includes('unsupported') ||
        s.includes('not found') ||
        s.includes('not allowed') ||
        s.includes('not available') ||
        s.includes('does not exist'))) ||
    s.includes('does not support') ||
    (s.includes('eleven_v3') &&
      (s.includes('not') || s.includes('unsupported') || s.includes('unavailable')));

  if (subscriptionish) return true;
  if (modelish) return true;
  if (status === 403 && (subscriptionish || modelish)) return true;
  if (status === 404 && modelish) return true;
  if (status === 422 && (subscriptionish || modelish)) return true;

  return false;
}
