(function () {
  'use strict';

  const tagGrid = document.getElementById('tags');
  const countModeEl = document.getElementById('countMode');
  const tagSearchEl = document.getElementById('tagSearch');
  const tagCountEl = document.getElementById('tagCount');
  const btnPrint = document.getElementById('btnPrint');
  const btnPrint2 = document.getElementById('btnPrint2');

  let products = [];
  let pending = [];

  function money(n) { return n == null ? '—' : n.toLocaleString('th-TH'); }

  function countFor(p, mode) {
    if (mode === 'units') return Math.max(1, p.units || 1);
    if (mode === 'stock') return Math.max(1, p.stock || 1);
    return 1;
  }

  function tagMarkup(p, idx) {
    return `
      <div class="tag" data-id="${p.id}" data-uid="${idx}">
        <div class="tag-company">${esc(p.company)}</div>
        <div class="tag-code">${esc(p.id)}</div>
        <div class="tag-image">
          <img src="${esc(p.image)}" onerror="this.onerror=null;this.src='${esc(p.imageFallback)}'" alt="${esc(p.name)}">
        </div>
        <div class="tag-name">${esc(p.name)}</div>
        <div class="tag-price">${money(p.price)}<small>บาท</small></div>
        <div class="tag-dim">${esc(p.dimension || '')}</div>
        <div class="tag-barcode"><svg></svg></div>
      </div>`;
  }

  function renderTags() {
    const q = tagSearchEl.value.trim().toLowerCase();
    const mode = countModeEl.value;
    const list = products.filter((p) =>
      !q || p.name.toLowerCase().includes(q) || p.company.toLowerCase().includes(q));

    let total = 0;
    const chunks = [];
    for (const p of list) {
      const n = countFor(p, mode);
      total += n;
      for (let i = 0; i < n; i++) chunks.push([p, chunks.length]);
    }
    pending = chunks;
    tagCountEl.textContent = total + ' ป้าย / ' + list.length + ' รายการ';
    tagGrid.innerHTML = chunks.map(([p, i]) => tagMarkup(p, i)).join('');

    for (const [p, i] of pending) {
      const el = tagGrid.querySelector('.tag[data-uid="' + i + '"]');
      if (!el) continue;
      drawBarcode(el.querySelector('.tag-barcode svg'), p.barcode);
    }
  }

  function drawBarcode(svg, code) {
    if (typeof JsBarcode === 'undefined') return;
    try {
      JsBarcode(svg, code, {
        format: 'EAN13',
        lineColor: '#000',
        width: 1.4,
        height: 30,
        displayValue: true,
        margin: 0
      });
    } catch (err) {
      svg.outerHTML = '';
    }
  }

  document.getElementById('countMode').addEventListener('change', renderTags);
  document.getElementById('tagSearch').addEventListener('input', renderTags);

  btnPrint.addEventListener('click', () => window.print());
  btnPrint2.addEventListener('click', () => window.print());

  fetch('data/products.json')
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then((data) => {
      products = data.products || [];
      renderTags();
    })
    .catch((err) => {
      tagGrid.innerHTML = '<div class="tag-placeholder" style="padding:2rem">โหลดข้อมูลไม่สำเร็จ: ' + esc(err.message) +
        '<br><span style="font-size:.75rem">หากเปิดไฟล์โดยตรงจากเครื่อง (file://) กรุณารันเซิร์ฟเวอร์ก่อน: <code>npm start</code> แล้วเปิด http://localhost:8080/print.html</span></div>';
    });

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
})();