(function () {
  'use strict';

  const tagGrid = document.getElementById('tags');
  const productListEl = document.getElementById('productList');
  const countModeEl = document.getElementById('countMode');
  const tagSearchEl = document.getElementById('tagSearch');
  const tagCountEl = document.getElementById('tagCount');
  const btnPrint = document.getElementById('btnPrint');
  const btnPrint2 = document.getElementById('btnPrint2');
  const btnSelAll = document.getElementById('btnSelAll');
  const btnSelNone = document.getElementById('btnSelNone');

  let products = [];
  let pending = [];
  const selected = new Set();
  const qty = new Map();

  function money(n) { return n == null ? '—' : n.toLocaleString('th-TH'); }

  function countFor(p, mode) {
    if (mode === 'units') return Math.max(1, p.units || 1);
    if (mode === 'stock') return Math.max(1, p.stock || 1);
    return 1;
  }

  function rowMarkup(p) {
    return `
      <label class="prow" data-id="${p.id}">
        <input type="checkbox" class="prow-check" ${selected.has(p.id) ? 'checked' : ''}>
        <span class="prow-info">
          <span class="prow-name">${esc(p.name)}</span>
          <span class="prow-meta">${esc(p.id)} · ${esc(p.barcode)} · ${money(p.price)} บาท</span>
        </span>
        <span class="prow-qty">
          จำนวน:
          <input type="number" class="prow-count" min="0" max="999" step="1" value="${qty.get(p.id) || 1}" inputmode="numeric">
        </span>
      </label>`;
  }

  function renderList() {
    const q = tagSearchEl.value.trim().toLowerCase();
    const list = q
      ? products.filter((p) => p.name.toLowerCase().includes(q) || p.company.toLowerCase().includes(q))
      : products;
    productListEl.innerHTML = list.map(rowMarkup).join('');

    productListEl.querySelectorAll('.prow').forEach((row) => {
      const id = row.dataset.id;
      const check = row.querySelector('.prow-check');
      const count = row.querySelector('.prow-count');

      check.addEventListener('change', () => {
        if (check.checked) selected.add(id); else selected.delete(id);
        renderTags();
      });

      count.addEventListener('change', () => {
        const v = Math.max(0, Math.floor(Number(count.value) || 0));
        qty.set(id, v);
        renderTags();
      });
    });
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
    const list = products.filter((p) => selected.has(p.id));
    let total = 0;
    const chunks = [];
    for (const p of list) {
      const n = qty.get(p.id) || 0;
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

  countModeEl.addEventListener('change', () => {
    const mode = countModeEl.value;
    for (const p of products) qty.set(p.id, countFor(p, mode));
    renderList();
    renderTags();
  });

  tagSearchEl.addEventListener('input', renderList);

  btnSelAll.addEventListener('click', () => {
    products.forEach((p) => selected.add(p.id));
    renderList();
    renderTags();
  });

  btnSelNone.addEventListener('click', () => {
    selected.clear();
    renderList();
    renderTags();
  });

  btnPrint.addEventListener('click', () => window.print());
  btnPrint2.addEventListener('click', () => window.print());

  fetch('data/products.json')
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then((data) => {
      products = data.products || [];
      products.forEach((p) => { selected.add(p.id); qty.set(p.id, 1); });
      renderList();
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