// Display-only formatting: IDs, URLs, storage and numeric values never pass here.
let numerals = 'eastern';
export const numeralPreference = () => numerals;
export function setNumerals(value) { numerals = value === 'western' ? 'western' : 'eastern'; }
export function digits(value) {
  const western = String(value).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  return numerals === 'western' ? western : western.replace(/\d/g, digit => '٠١٢٣٤٥٦٧٨٩'[digit]);
}
export function number(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(numerals === 'western' ? 'en' : 'ar', {
    numberingSystem: numerals === 'western' ? 'latn' : 'arab', maximumFractionDigits,
  }).format(value);
}
export const speedLabel = value => `${number(value, 2)}×`;
