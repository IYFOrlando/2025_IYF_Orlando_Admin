export const toCents = (v: string | number) => {
    if (typeof v === 'number') return Math.round(v * 100);
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    return Math.round(n * 100);
  };
  
  export const fromCents = (c: number) => (c || 0) / 100;
  
  export const fmtUSD = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(fromCents(cents));
  