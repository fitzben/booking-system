import type { RoomPricingTier } from './db';

/**
 * Calculate booking price using tiered pricing + overtime.
 *
 * Logic:
 *   1. Find the highest tier where tier.hours <= durationHours
 *   2. price = tier.price + (durationHours - tier.hours) * overtimeRate
 *   3. If no tier fits (duration < minimum tier), charge purely at overtimeRate
 *
 * @param tiers        Pricing tiers for the room (any order).
 * @param overtimeRate Hourly rate for hours beyond the matched tier (Rp/hour).
 * @param durationMinutes Total booking duration in minutes.
 */
export function calculatePrice(
  tiers: Pick<RoomPricingTier, 'hours' | 'price'>[],
  overtimeRate: number,
  durationMinutes: number,
): number {
  const durationHours = durationMinutes / 60;

  // Sort descending so the first match is the highest applicable tier
  const sorted = [...tiers].sort((a, b) => b.hours - a.hours);
  const matched = sorted.find((t) => t.hours <= durationHours);

  if (!matched) {
    // Duration shorter than any tier — charge pure overtime
    return durationHours * overtimeRate;
  }

  const overtimeHours = durationHours - matched.hours;
  return matched.price + overtimeHours * overtimeRate;
}
