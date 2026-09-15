(function () {
  'use strict';

  const grid = document.getElementById('grid');
  const emptyBox = document.getElementById('empty');
  const searchInput = document.getElementById('search');
  const companyFilter = document.getElementById('companyFilter');
  const resultCount = document.getElementById('resultCount');
  const modal = document.getElementById('modal');
  const modalEls = {
    id: document.getElementById('modalId'),
    companyShort: document.getElementById('modalCompanyShort'),
    image: document.getElementById('modalImage'),
    name: document.getElementById('modalName'),
    price: document.getElementById('modalPrice'),
    dim: document.getElementById('modalDim'),
    weight: document.getElementById('modalWeight'),
    barcode: document.getElementById('modalBarcode'),
    note: document.getElementById('modalNote'),
    desc: document.getElementById('modalDesc')
  };

  let products = [];
  let filtered = [];
  let model = null;

  const money = (n) => (n == null ? '—' : n.toLocaleString('th-TH') + ' บาท');

  function badgeClass(company) {
    return company.includes('หญิง') ? 'badge women' : 'badge';
  }

  function cardMarkup(p) {
    return `
      <article class="card" data-id="${escapeAttr(p.id)}" tabindex="0" role="button" aria-label="${escapeAttr(p.name)}">
        <div class="card-img">
          <img loading="lazy" src="${escapeAttr(p.image)}" onerror="this.onerror=null;this.src='${escapeAttr(p.imageFallback)}'" alt="${escapeAttr(p.name)}">
        </div>
        <div class="card-body">
          <div class="card-top">
            <h3 class="card-name">${escapeHtml(p.name)}</h3>
            <span class="${badgeClass(p.company)}">${escapeHtml(p.companyShort)}</span>
          </div>
          <div class="card-price">${money(p.price)}</div>
          <div class="card-meta">
            <span class="card-dim">${escapeHtml(p.dimension || '')}</span>
            <span class="card-units">${p.units > 1 ? 'มี ' + p.units + ' ใบ' : ''}</span>
          </div>
        </div>
      </article>`;
  }

  function render() {
    grid.innerHTML = filtered.map(cardMarkup).join('');
    emptyBox.classList.toggle('hidden', filtered.length > 0);
    resultCount.textContent = filtered.length + ' รายการ';
    bindCards();
  }

  function bindCards() {
    grid.querySelectorAll('.card').forEach((card) => {
      const open = () => openModal(card.dataset.id);
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const c = companyFilter.value;
    filtered = products.filter((p) => {
      const matchCompany = c === 'all' || p.company === c;
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));
      return matchCompany && matchSearch;
    });
    render();
  }

  function openModal(id) {
    model = products.find((p) => p.id === id);
    if (!model) return;
    const s = model;
    modalEls.id.textContent = 'รหัสสินค้า ' + s.id;
    modalEls.companyShort.textContent = s.company;
    modalEls.companyShort.className = badgeClass(s.company);
    modalEls.image.src = s.image;
    modalEls.image.onerror = function () { this.onerror = null; this.src = s.imageFallback; };
    modalEls.name.textContent = s.name;
    modalEls.price.textContent = money(s.price);
    modalEls.dim.textContent = s.dimension || '—';
    modalEls.weight.textContent = s.weight || '—';
    modalEls.barcode.textContent = s.barcode + ' (EAN-13)';
    modalEls.note.textContent = s.note || '';
    modalEls.desc.textContent = s.description || '';
    modalEls.note.style.display = s.note ? '' : 'none';
    modalEls.desc.style.display = s.description ? '' : 'none';
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  searchInput.addEventListener('input', applyFilters);
  companyFilter.addEventListener('change', applyFilters);

  fetch('data/products.json')
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then((data) => {
      products = data.products || [];
      const companies = [...new Set(products.map((p) => p.company))];
      companies.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        companyFilter.appendChild(opt);
      });
      applyFilters();

      const wanted = new URLSearchParams(location.search).get('product');
      if (wanted && products.some((p) => p.id === wanted)) {
        setTimeout(() => openModal(wanted), 250);
      }
    })
    .catch((err) => {
      grid.innerHTML = '<div class="empty"><p>โหลดข้อมูลไม่สำเร็จ: ' + escapeHtml(err.message) + '</p>' +
        '<p style="font-size:.8rem;margin-top:.5rem">หากเปิดไฟล์ .html โดยตรงจากเครื่อง (โปรโตคอล file://) กรุณารันเซิร์ฟเวอร์ก่อน:<br><code style="background:#eee;padding:.1rem .4rem;border-radius:6px">npm start</code>&nbsp;&nbsp;แล้วเปิด <code>http://localhost:8080</code></p></div>';
    });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
  function escapeAttr(s) { return escapeHtml(s); }
})();