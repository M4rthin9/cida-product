# แคตตาล็อกผลิตภัณฑ์ราชทัณฑ์ — Catalog & Price Tag Generator

Static website (Vanilla HTML/CSS/JS) ที่แสดงแคตตาล็อกผลิตภัณฑ์จาก Excel ได้แก่
**ทัณฑสถานบำบัดพิเศษกลาง**, **ทัณฑสถานหญิงกลาง** และ **เรือนจำพิเศษธนบุรี** พร้อมเครื่องมือพิมพ์ป้ายราคาขนาด
**5.5 × 9 ซม.** (Barcode EAN-13) เหมาะกับโฮสติ้งแบบ Static เช่น Cloudflare Pages / GitHub Pages

## โครงสร้างโฟลเดอร์

```
Catalog/
├── extract.js                  # สคริปต์แปลง Excel -> public/data/products.json (Local)
├── server.js                   # เซิร์ฟเวอร์สำหรับทดสอบบนเครื่อง (npm start)
├── package.json                # dependencies (xlsx/SheetJS) — ใช้เฉพาะตอนสกัดข้อมูล
├── package-lock.json
├── README.md
│
├── public/                     # ← โฟลเดอร์สำหรับ Deploy เท่านั้น (Static Site)
│   ├── index.html              # หน้าแคตตาล็อก (ค้นหา + กรองตามแหล่งที่มา)
│   ├── print.html              # หน้าพิมพ์ป้ายราคา 5.5 x 9 ซม.
│   ├── .nojekyll               # ป้องกัน GitHub Pages ตีความผิด
│   ├── data/
│   │   └── products.json       # ข้อมูลสินค้าที่แปลงจาก Excel (generate โดย extract.js)
│   ├── images/                 # รูปสินค้า — ตั้งชื่อตามรหัส EAN-13
│   │   ├── 8850001000019.jpg   # (ตัวอย่าง) วางรูปจริงไว้ที่นี่
│   │   ├── 8850001000019.svg   # ภาพสำรองอัตโนมัติ (generate โดย extract.js)
│   │   ├── logo-TBS.png        # โลโก้แต่ละแหล่งที่มา (ใส่เอง; ถ้ายังไม่มีจะใช้ .svg สำรอง)
│   │   ├── logo-TBS.svg        # โลโก้สำรองอัตโนมัติ (generate โดย extract.js, ไม่เขียนทับของเดิม)
│   │   └── ... <all products>
│   ├── css/
│   │   ├── app.css             # สไตล์หน้าแคตตาล็อก
│   │   └── print.css           # สไตล์ป้าย + @media print
│   └── js/
│       ├── app.js              # ตรรกะหน้าแคตตาล็อก + รายละเอียดสินค้า
│       └── print.js            # สร้างป้ายด้วย JsBarcode + qrcode.js
│
├── ผลิตภัณธ์ ทัณฑสถานบำบัดพิเศษกลาง.xlsx
├── ผลิตภัณฑ์ ทัณฑสถานหญิงกลาง.xlsx
└── ผลิตภัณฑ์ เรือนจำพิเศษธนบุรี.xlsx
```

## ขั้นตอน: สกัดข้อมูล Excel -> JSON

ต้องมี Node.js (≥ 18)

```powershell
npm install        # ติดตั้ง xlsx / SheetJS
node extract.js    # สร้าง public/data/products.json + ภาพ placeholder ใน public/images/
```

สคริปต์ทำสิ่งต่อไปนี้:

- อ่านทั้งสามไฟล์ `.xlsx` (เลือกชีตแรกของแต่ละไฟล์; ไฟล์ธนบุรีเริ่มข้อมูลแถวที่ 2)
- แปลงเลขไทย (๐-๙) เป็นเลขเลขอารบิก และล้างช่องว่าง/ข้อมูลว่าง
- mapping ฟิลด์มาตรฐาน: `id, company, companyShort, companyCode, logo, logoFallback, name, description, price, priceShip, width/length/height, dimension, weight, stock, note, units, barcode, image, imageFallback`
- `company` ได้จากชื่อไฟล์ต้นทาง ("ทัณฑสถานบำบัดพิเศษกลาง", "ทัณฑสถานหญิงกลาง" หรือ "เรือนจำพิเศษธนบุรี")
- สร้าง **EAN-13** ชุดใหม่ตามกำหนด: `885 (ไทย) + รหัสสถานที่ 4 หลัก + ลำดับ 5 หลัก + check digit`
  เช่น `885 0001 00001 9`
- สินค้าซ้ำกันในไฟล์หญิงกลาง (หลายหน่วย/ป้าย) **ถูกรวมเป็นรายการเดียว** โดยเก็บจำนวนใน `units`
- สร้างภาพ placeholder (SVG) ให้ทุกสินค้าที่ไม่มีรูปจริง

## การจัดรูปภาพ

วางรูปจริงใน `public/images/` โดยตั้งชื่อไฟล์ให้ตรงกับรหัส EAN-13 ใน `products.json`:

| ไฟล์ที่ต้องการ                     | ผลลัพธ์                                   |
| --------------------------------- | ---------------------------------------- |
| `public/images/<barcode>.jpg`     | รูปจริง (ต้องเป็น `.jpg` ตัวพิมพ์เล็กเท่านั้น — เซิร์ฟเวอร์ Linux/Cloudflare แยกตัวพิมพ์เล็ก-ใหญ่ ไม่เหมือน Windows) |
| `public/images/<barcode>.svg`     | ภาพสำรองอัตโนมัติจาก extract.js          |

ระบบจะแสดง `.jpg` เมื่อมีไฟล์ ถ้าไม่มีจะแสดง SVG placeholder อัตโนมัติ (ไม่มีรูปจริงก็ใช้งานได้ทันที)

> ตัวอย่าง: สินค้า `TBS-01` มี `barcode = 8850001000019` → วางรูปที่ `public/images/8850001000019.jpg`

## การจัดโลโก้แหล่งที่มา

ปุ่มกรอง "แหล่งที่มา" บนหน้าแคตตาล็อกแสดงโลโก้ของแต่ละที่ วางไฟล์โลโก้จริง (PNG/JPG) ตามรหัส:

| ไฟล์ที่ต้องการ                  | ผลลัพธ์                                      |
| ------------------------------ | ------------------------------------------- |
| `public/images/logo-TBS.png`   | โลโก้ทัณฑสถานบำบัดพิเศษกลาง                 |
| `public/images/logo-THK.png`   | โลโก้ทัณฑสถานหญิงกลาง                       |
| `public/images/logo-TNB.png`   | โลโก้เรือนจำพิเศษธนบุรี                     |
| `public/images/logo-<CODE>.svg`| โลโก้สำรองอัตโนมัติจาก extract.js (ถ้ายังไม่มีไฟล์จริง) |

รัน `node extract.js` หนึ่งครั้งเพื่อสร้าง `.svg` สำรอง — สคริปต์จะไม่เขียนทับไฟล์ที่มีอยู่แล้ว

## ทดสอบบนเครื่อง

ต้องเปิดผ่านเซิร์ฟเวอร์ (ห้ามดับเบิลคลิกไฟล์ `index.html` ตรง ๆ เพราะเบราว์เซอร์บล็อกการโหลด `products.json` ผ่าน `file://`)

```powershell
npm start           # รันเซิร์ฟเวอร์ภายใน -> http://localhost:8080
```

| หน้า          | URL                                  |
| ------------- | ------------------------------------ |
| แคตตาล็อก     | http://localhost:8080/               |
| พิมพ์ป้าย      | http://localhost:8080/print.html     |

## วิธีพิมพ์ป้ายราคา

1. เปิด `print.html` → ตั้งค่าจำนวนป้ายต่อรายการ (1 ใบ / ตามหน่วย / ตามสต๊อก)
2. คลิก **พิมพ์ป้าย** — ตั้งค่าเครื่องพิมพ์:
   - กระดาษ **A4** มุมกว้าง - ระยะขอบ **None/Minimal**
   - **Scale: 100%** และปิด "Header and footers"
3. แต่ละหน้า A4 จะได้ป้าย **3 × 3 = 9 ป้าย** (ป้ายละ 5.5 × 9 ซม.)

Barcode EAN-13 แสดงเลขกำกับใต้บาร์โค้ดทุกป้าย

## การ Deploy กับ Cloudflare Pages

### 1. สร้าง Git repository & Push

```powershell
git init
git add .
git commit -m "Init product catalog"
git branch -M main
git remote add origin https://github.com/<USER>/<REPO>.git
git push -u origin main
```

เพิ่ม `.gitignore` เพื่อไม่ push `node_modules`:

```gitignore
node_modules/
*.xlsx
```

### 2. เชื่อม Cloudflare Pages

1. ลงชื่อเข้าที่ https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages**
2. เลือก **Connect to Git** → เลือก repository ที่สร้าง
3. ตั้งค่าการ Build:
   - **Framework preset:** `None`
   - **Build command:** *(ว่างไว้)*
   - **Build output directory:** `public`
4. คลิก **Save and Deploy**

ทุกครั้งที่ push ไปหน้า `main` ระบบจะ Deploy อัตโนมัติ
(หรือเลือก **Direct Upload** เพื่ออัปโหลดโฟลเดอร์ `public/` ด้วยมือก็ได้)

## เทคนิค / หมายเหตุ

- ใช้ Library ผ่าน CDN: **JsBarcode** (EAN-13) — ไม่มี dependency เพิ่มในโปรเจกต์
- กำหนดขนาดป้ายจริงใน `css/print.css` (`@page { size: A4; margin: 0 }` + ป้าย `5.5cm × 9cm`)
- `price` แสดงหน่วยบาทอัตโนมัติ; `priceShip` = ราคารวมส่ง (ไฟล์บำบัดพิเศษกลาง), `priceDouble` = ราคา x2 (ไฟล์หญิงกลาง)
- ต้องการสินค้าใหม่ → อัปเดตไฟล์ Excel แล้วรัน `node extract.js` อีกครั้งเท่านั้น

## สร้างโดย

- เอกสารต้นทาง: กรมราชทัณฑ์ (รูปแบบข้อมูลสินค้า ส่งกรม)
- สคริปต์สกัดข้อมูล: `extract.js` (Node.js + SheetJS)