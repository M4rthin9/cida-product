const fs = require('fs');
const path = require('path');
const { FACILITIES, makePlaceholderSvg, logoPaths } = require('./extract');

const OUT_JSON = path.join(__dirname, 'public', 'data', 'products.json');
const IMAGES = path.join(__dirname, 'public', 'images');

const code = 'TNB';
const conf = FACILITIES['เรือนจำพิเศษธนบุรี'];

const items = [
  { barcode: '2000000000138', name: 'งานบุดุนกินรี', price: 250000 },
  { barcode: '2000000000084', name: 'พระพุทธรูป', price: 5900 },
  { barcode: '2000000000091', name: 'ภาพจิตรกรรมไทย', price: 3500 },
  { barcode: '2000000000107', name: 'ภาพจิตรกรรมไทย', price: 6000 },
  { barcode: '2000000000114', name: 'ภาพสีน้ำมัน', price: 3000 },
  { barcode: '2000000000121', name: 'ราชรถขนาดเล็ก', price: 4200 }
];

const data = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
const have = new Set(data.products.map(p => p.barcode));
const existingIds = data.products.filter(p => p.companyCode === code)
  .map(p => parseInt(p.id.split('-')[1], 10)).filter(n => Number.isFinite(n));
let next = Math.max(0, ...existingIds) + 1;

const added = [];
for (const item of items) {
  if (have.has(item.barcode)) { console.log(`skip (exists): ${item.barcode} ${item.name}`); continue; }
  const p = {
    id: `${code}-${String(next).padStart(2, '0')}`,
    company: 'เรือนจำพิเศษธนบุรี',
    companyShort: conf.short,
    companyCode: code,
    ...logoPaths(code),
    name: item.name,
    description: null,
    price: item.price,
    width: null,
    length: null,
    height: null,
    dimension: null,
    weight: null,
    stock: null,
    note: null,
    units: 1,
    barcode: item.barcode,
    image: `images/${item.barcode}.jpg`,
    imageFallback: `images/${item.barcode}.svg`
  };
  fs.writeFileSync(path.join(IMAGES, `${item.barcode}.svg`), makePlaceholderSvg(p), 'utf8');
  data.products.push(p);
  added.push(p);
  next += 1;
}

if (added.length) {
  data.meta.count = data.products.length;
  data.meta.generatedAt = new Date().toISOString();
  fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2), 'utf8');
}

console.log(`Added ${added.length} product(s) for ${conf.short} (${code}). Total: ${data.products.length}`);
for (const p of added) console.log(`  + ${p.id}  ${p.barcode}  ${p.name}  (${p.price})`);