(function () {
  'use strict';

  const grid = document.getElementById('grid');
  const emptyBox = document.getElementById('empty');
  const searchInput = document.getElementById('search');
  const chipsEl = document.getElementById('companyChips');
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
  let companies = [];
  let companySel = 'all';

  const money = (n) => (n == null ? '—' : n.toLocaleString('th-TH') + ' บาท');

  function badgeClass(p) {
    const code = typeof p === 'string' ? p : p.companyCode;
    if (code === 'THK') return 'badge women';
    if (code === 'TNB') return 'badge thon';
    return 'badge';
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
            <span class="${badgeClass(p)}">${escapeHtml(p.companyShort)}</span>
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
    const c = companySel;
    filtered = products.filter((p) => {
      const matchCompany = c === 'all' || p.company === c;
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));
      return matchCompany && matchSearch;
    });
    render();
  }

  function chipMarkup(c, active) {
    if (c.all) {
      return `<button class="chip${active ? ' active' : ''}" data-company="all" aria-pressed="${active}">ทั้งหมด</button>`;
    }
    return `<button class="chip${active ? ' active' : ''}" data-company="${escapeAttr(c.name)}" aria-pressed="${active}">` +
      `<img src="${escapeAttr(c.logo)}" onerror="this.onerror=null;this.src='${escapeAttr(c.logoFallback)}'" alt="" loading="lazy">` +
      `<span>${escapeHtml(c.name)}</span></button>`;
  }

  function renderChips() {
    chipsEl.innerHTML = [{ all: true }]
      .concat(companies)
      .map((c) => chipMarkup(c, (c.all ? 'all' : c.name) === companySel))
      .join('');
  }

  chipsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    companySel = btn.dataset.company;
    renderChips();
    applyFilters();
  });

  function openModal(id) {
    model = products.find((p) => p.id === id);
    if (!model) return;
    const s = model;
    modalEls.id.textContent = 'รหัสสินค้า ' + s.id;
    modalEls.companyShort.textContent = s.company;
    modalEls.companyShort.className = badgeClass(s);
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

  fetch('data/products.json')
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then((data) => {
      products = data.products || [];
      companies = data.meta && data.meta.companies ? data.meta.companies :
        [...new Map(products.map((p) => [p.company, {
          code: p.companyCode, name: p.company, short: p.companyShort,
          logo: p.logo, logoFallback: p.logoFallback
        }])).values()];
      renderChips();
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