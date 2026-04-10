/**
 * Round a NGN amount to 2 decimal places before wallet / ledger writes or derived math.
 * Does not fix Float storage in the DB — it limits drift from IEEE-754 arithmetic at boundaries.
 */
export function roundNgn(n: number): number {
  return Math.round(n * 100) / 100;
}
