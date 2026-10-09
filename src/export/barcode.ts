// The EAN-13 barcode printers want on the back cover, drawn from the book's ISBN.

const LEFT_ODD = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];
const flip = (bits: string) => [...bits].map((bit) => (bit === "1" ? "0" : "1")).join("");
const RIGHT = LEFT_ODD.map(flip);
const LEFT_EVEN = RIGHT.map((bits) => [...bits].reverse().join(""));
/** Which of the left digits use the even set; the first digit is told by the pattern. */
const PARITY = [
  "000000",
  "001011",
  "001101",
  "001110",
  "010011",
  "011001",
  "011100",
  "010101",
  "010110",
  "011010",
];

const checkDigit = (twelve: string) => {
  const sum = [...twelve].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
    0,
  );
  return String((10 - (sum % 10)) % 10);
};

/** The ISBN as thirteen digits, from an ISBN-10 or -13; null when it is not a valid one. */
export function isbn13(isbn: string): string | null {
  const digits = isbn.replace(/[^\dX]/gi, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(digits)) {
    const twelve = `978${digits.slice(0, 9)}`;
    return twelve + checkDigit(twelve);
  }
  if (!/^97[89]\d{10}$/.test(digits)) return null;
  return checkDigit(digits.slice(0, 12)) === digits[12] ? digits : null;
}

/** 95 modules, "1" for a bar: guard, six left digits, centre guard, six right digits, guard. */
export function ean13Modules(code: string): string {
  const digits = [...code].map(Number);
  const parity = PARITY[digits[0] ?? 0] ?? "000000";
  const left = digits
    .slice(1, 7)
    .map((digit, index) => (parity[index] === "1" ? LEFT_EVEN : LEFT_ODD)[digit])
    .join("");
  const right = digits
    .slice(7)
    .map((digit) => RIGHT[digit])
    .join("");
  return `101${left}01010${right}101`;
}

/** The runs of bars, as [first module, width in modules]. */
export function barRuns(modules: string): [number, number][] {
  const runs: [number, number][] = [];
  for (const found of modules.matchAll(/1+/g)) runs.push([found.index, found[0].length]);
  return runs;
}
