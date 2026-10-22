/** CPR-nummer: kun cifre, 10 i alt, og de første seks skal være en mulig dato (ddmmåå). */
export function normalizeCpr(input: string): string {
  return input.replace(/\D/g, '');
}

export function isValidCpr(input: string): boolean {
  const d = normalizeCpr(input);
  if (!/^\d{10}$/.test(d)) return false;
  const day = Number(d.slice(0, 2));
  const month = Number(d.slice(2, 4));
  return day >= 1 && day <= 31 && month >= 1 && month <= 12;
}

/** "0101901234" → "010190-1234" (også mens man skriver). */
export function formatCpr(input: string): string {
  const d = normalizeCpr(input).slice(0, 10);
  return d.length > 6 ? `${d.slice(0, 6)}-${d.slice(6)}` : d;
}
