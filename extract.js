const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const IMAGES = path.join(PUBLIC, 'images');
const OUT_JSON = path.join(PUBLIC, 'data', 'products.json');

const FACILITIES = {
  'ทัณฑสถานบำบัดพิเศษกลาง': { code: 'TBS', short: 'บำบัดพิเศษกลาง', color: '#166349', barcodeFacility: '0001' },
  'ทัณฑสถานหญิงกลาง':       { code: 'THK', short: 'หญิงกลาง',       color: '#8a3a5c', barcodeFacility: '0002' },
  'เรือนจำพิเศษธนบุรี':      { code: 'TNB', short: 'ธนบุรี',          color: '#2b5aa6', barcodeFacility: '0003' },
  'ทัณฑสถานหญิงชลบุรี':     { code: 'CBK', short: 'หญิงชลบุรี',      color: '#6b5b95', barcodeFacility: '0004' },
  'เรือนจำกลางนครปฐม':      { code: 'NPT', short: 'นครปฐม',         color: '#8c5e3c', barcodeFacility: '0005' }
};

const THAI_DIGITS = { '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4', '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9' };

function toArabic(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  s = s.replace(/[๐-๙]/g, c => THAI_DIGITS[c]);
  return s;
}

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function toNumber(value) {
  const s = clean(value);
  if (s === '' || s === '-') return null;
  const n = parseFloat(toArabic(s).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function dimensionString(p) {
  const arr = [p.width, p.length, p.height].filter(v => v !== null && v !== undefined);
  return arr.length ? arr.join(' × ') + ' ซม.' : null;
}

// Parse loose size strings like "45 x 65 ซม." or "28 x 17 x 26.5 ซม."
function parseSizeString(value) {
  const raw = clean(toArabic(value));
  const nums = raw.replace(/ซม\.?/g, '').split(/x|X|×/)
    .map(s => parseFloat(s.replace(/,/g, ''))).filter(Number.isFinite);
  return {
    width: nums[0] ?? null,
    length: nums[1] ?? null,
    height: nums[2] ?? null,
    dimension: raw || null
  };
}

function logoPaths(code) {
  return { logo: `images/logo-${code}.png`, logoFallback: `images/logo-${code}.svg` };
}

function ean13CheckDigit(base12) {
  const d = String(base12).split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += i % 2 === 0 ? d[i] : d[i] * 3;
  return (10 - (sum % 10)) % 10;
}

function makeBarcode(facilityCode, seq) {
  const base = '885' + facilityCode + String(seq).padStart(5, '0');
  return base + ean13CheckDigit(base);
}

function xmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapText(s, n) {
  const out = [];
  let rest = s;
  while (rest.length > 0) {
    out.push(rest.slice(0, n));
    rest = rest.slice(n);
    if (out.length >= 4) break;
  }
  return out;
}

function makePlaceholderSvg(product) {
  const nameLines = wrapText(product.name, 14);
  const nameText = nameLines.map((line, i) =>
    `<text x="300" y="${470 + i * 36}" text-anchor="middle" font-size="25" font-weight="bold" fill="#5b5346" font-family="Tahoma, 'Sukhumvit Set', sans-serif">${xmlEscape(line)}</text>`
  ).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="#f4f2ec"/>
  <rect x="22" y="22" width="556" height="556" fill="none" stroke="#ddd6c8" stroke-width="3" stroke-dasharray="10 10"/>
  <text x="300" y="120" text-anchor="middle" font-size="26" fill="#a99f8d" font-family="Tahoma, sans-serif">ผลิตภัณฑ์ราชทัณฑ์</text>
  <g stroke="#b8ad9c" stroke-width="7" fill="none" stroke-linejoin="round" transform="translate(300 290) rotate(0)">
    <polygon points="-85,-60 0,-110 85,-60 85,40 0,90 -85,40" stroke-linejoin="round"/>
    <path d="M-85,-60 L-85,40 M0,-110 L0,90 M85,-60 L85,40"/>
    <polygon points="-85,-60 0,-10 85,-60" stroke-linejoin="round"/>
  </g>
  ${nameText}
  <text x="300" y="552" text-anchor="middle" font-size="20" fill="#9a917f" font-family="Tahoma, sans-serif">${xmlEscape(product.company)}</text>
  <text x="300" y="585" text-anchor="middle" font-size="14" fill="#c3bbaa" font-family="monospace">${product.id}  ·  รหัส ${product.barcode}</text>
</svg>
`;
}

function makeLogoSvg(conf, facilityName) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <rect width="240" height="240" rx="52" fill="${conf.color}"/>
  <circle cx="120" cy="120" r="96" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="5"/>
  <text x="120" y="138" text-anchor="middle" font-size="46" font-weight="bold" fill="#ffffff" font-family="Tahoma, 'Sukhumvit Set', sans-serif">${xmlEscape(conf.short)}</text>
  <title>${xmlEscape(facilityName)}</title>
</svg>
`;
}

function loadRows(file) {
  const wb = XLSX.readFile(file, { cellDates: true });
  const sheetName = wb.SheetNames[0];
  return XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
}

// ---------------------------------------------------------------------------
// File 1: ทัณฑสถานบำบัดพิเศษกลาง
// cols: ที่, เรือนจำ, สินค้า, รายละเอียด, กว้าง, ยาว, สูง, น้ำหนัก, สต๊อก,
//        ราคาขาย, ราคารวมส่ง, จำนวนสินค้าที่มี, จำนวนเงิน, รูปภาพ
// ---------------------------------------------------------------------------
function extractRehab() {
  const fixture = 'ทัณฑสถานบำบัดพิเศษกลาง';
  const conf = FACILITIES[fixture];
  const rows = loadRows(path.join(ROOT, 'ผลิตภัณธ์ ทัณฑสถานบำบัดพิเศษกลาง.xlsx'));
  const products = [];
  let seq = 0;

  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const name = clean(r[2]);
    if (!name) continue;

    seq += 1;
    const id = `${conf.code}-${String(seq).padStart(2, '0')}`;
    const width = toNumber(r[4]);
    const length = toNumber(r[5]);
    const height = toNumber(r[6]);
    const weight = clean(toArabic(r[7])).replace(/^-$/, '') || null;
    const stock = toNumber(r[8]);
    const price = toNumber(r[9]);
    const priceShip = toNumber(r[10]);
    const barcode = makeBarcode(conf.barcodeFacility, seq);

    products.push({
      id,
      company: fixture,
      companyShort: conf.short,
      companyCode: conf.code,
      ...logoPaths(conf.code),
      name,
      description: clean(r[3]) || null,
      price,
      priceShip,
      width,
      length,
      height,
      dimension: dimensionString({ width, length, height }),
      weight,
      stock,
      note: null,
      units: 1,
      barcode,
      image: `images/${barcode}.jpg`,
      imageFallback: `images/${barcode}.svg`
    });
  }
  return products;
}

// ---------------------------------------------------------------------------
// File 2: ทัณฑสถานหญิงกลาง
// cols: ที่, รายการ, รูปภาพ, ราคา, ราคา x2, กว้าง, ยาว, สูง, หมายเหตุ
// Duplicate rows (same product) are grouped into one SKU with a units count.
// ---------------------------------------------------------------------------
function extractWomen() {
  const fixture = 'ทัณฑสถานหญิงกลาง';
  const conf = FACILITIES[fixture];
  const rows = loadRows(path.join(ROOT, 'ผลิตภัณฑ์ ทัณฑสถานหญิงกลาง.xlsx'));
  const groups = new Map();
  let seq = 0;

  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const name = clean(r[1]);
    if (!name) continue;

    const price = toNumber(r[3]);
    const priceDouble = toNumber(r[4]);
    const note = clean(r[8]) || null;
    const width = toNumber(r[5]);
    const length = toNumber(r[6]);
    const height = toNumber(r[7]);

    const key = `${name}|${price}|${note}|${width}|${length}|${height}`;
    if (!groups.has(key)) {
      seq += 1;
      groups.set(key, {
        seq,
        id: `${conf.code}-${String(seq).padStart(2, '0')}`,
        name, price, priceDouble, note, width, length, height, units: 0
      });
    }
    groups.get(key).units += 1;
  }

  return [...groups.values()].map(p => {
    const barcode = makeBarcode(conf.barcodeFacility, p.seq);
    return {
      id: p.id,
      company: fixture,
      companyShort: conf.short,
      companyCode: conf.code,
      ...logoPaths(conf.code),
      name: p.name,
      description: null,
      price: p.price,
      priceDouble: p.priceDouble,
      width: p.width,
      length: p.length,
      height: p.height,
      dimension: dimensionString(p),
      weight: null,
      stock: null,
      note: p.note,
      units: p.units,
      barcode,
      image: `images/${barcode}.jpg`,
      imageFallback: `images/${barcode}.svg`
    };
  });
}

// ---------------------------------------------------------------------------
// File 3: เรือนจำพิเศษธนบุรี
// cols: ลำดับ, รายการ, ขนาด, ราคา   (header row 0, data from row 1)
// ---------------------------------------------------------------------------
function extractThonburi() {
  const fixture = 'เรือนจำพิเศษธนบุรี';
  const conf = FACILITIES[fixture];
  const rows = loadRows(path.join(ROOT, 'ผลิตภัณฑ์ เรือนจำพิเศษธนบุรี.xlsx'));
  const products = [];
  let seq = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const name = clean(r[1]);
    if (!name) continue;

    seq += 1;
    const id = `${conf.code}-${String(seq).padStart(2, '0')}`;
    const size = parseSizeString(r[2]);
    const price = toNumber(r[3]);
    const barcode = makeBarcode(conf.barcodeFacility, seq);

    products.push({
      id,
      company: fixture,
      companyShort: conf.short,
      companyCode: conf.code,
      ...logoPaths(conf.code),
      name,
      description: null,
      price,
      width: size.width,
      length: size.length,
      height: size.height,
      dimension: size.dimension,
      weight: null,
      stock: null,
      note: null,
      units: 1,
      barcode,
      image: `images/${barcode}.jpg`,
      imageFallback: `images/${barcode}.svg`
    });
  }
  return products;
}

// ---------------------------------------------------------------------------
// File 4 & 5: ทัณฑสถานหญิงชลบุรี / เรือนจำกลางนครปฐม
// cols: ลำดับที่, รายการ, ราคาขาย   (header row 0, data from row 1)
// ---------------------------------------------------------------------------
function extractSimple(file, fixture) {
  const conf = FACILITIES[fixture];
  const rows = loadRows(path.join(ROOT, file));
  const products = [];
  let seq = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const name = clean(r[1]);
    if (!name) continue;

    seq += 1;
    const id = `${conf.code}-${String(seq).padStart(2, '0')}`;
    const price = toNumber(r[2]);
    const barcode = makeBarcode(conf.barcodeFacility, seq);

    products.push({
      id,
      company: fixture,
      companyShort: conf.short,
      companyCode: conf.code,
      ...logoPaths(conf.code),
      name,
      description: null,
      price,
      width: null,
      length: null,
      height: null,
      dimension: null,
      weight: null,
      stock: null,
      note: null,
      units: 1,
      barcode,
      image: `images/${barcode}.jpg`,
      imageFallback: `images/${barcode}.svg`
    });
  }
  return products;
}

function extractChonburi() {
  return extractSimple('ผลิตภัณฑ์ ทัณฑสถานหญิงชลบุรี.xlsx', 'ทัณฑสถานหญิงชลบุรี');
}

function extractNakhonPathom() {
  return extractSimple('ผลิตภัณฑ์ เรือนจำกลางนครปฐม.xlsx', 'เรือนจำกลางนครปฐม');
}

// ---------------------------------------------------------------------------
function main() {
  fs.mkdirSync(path.join(PUBLIC, 'data'), { recursive: true });
  fs.mkdirSync(IMAGES, { recursive: true });

  const products = [...extractRehab(), ...extractWomen(), ...extractThonburi(), ...extractChonburi(), ...extractNakhonPathom()];

  for (const p of products) {
    fs.writeFileSync(path.join(IMAGES, `${p.barcode}.svg`), makePlaceholderSvg(p), 'utf8');
  }

  // Company logo placeholders — written only when missing so real logos are never overwritten.
  for (const [name, conf] of Object.entries(FACILITIES)) {
    const png = path.join(IMAGES, `logo-${conf.code}.png`);
    const svg = path.join(IMAGES, `logo-${conf.code}.svg`);
    if (!fs.existsSync(png) && !fs.existsSync(svg)) {
      fs.writeFileSync(svg, makeLogoSvg(conf, name), 'utf8');
    }
  }

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      facility: Object.values(FACILITIES).map(c => c.code),
      count: products.length,
      companies: Object.entries(FACILITIES).map(([name, c]) => ({
        code: c.code,
        name,
        short: c.short,
        ...logoPaths(c.code)
      }))
    },
    products
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Done. ${products.length} products written to ${OUT_JSON}`);
  console.log(`Placeholder images written to ${IMAGES}`);
  const byCompany = {};
  for (const p of products) byCompany[p.company] = (byCompany[p.company] || 0) + 1;
  console.log(JSON.stringify(byCompany, null, 2));
}

main();