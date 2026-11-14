// Garment size order for display (unknown labels sort last, alphabetically).
const ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL"];
const rank = (s) => { const i = ORDER.indexOf(String(s).toUpperCase()); return i < 0 ? ORDER.length : i; };
export const sizeCompare = (a, b) => rank(a) - rank(b) || String(a).localeCompare(String(b));
export const sortSizes = (list) => [...list].sort(sizeCompare);
