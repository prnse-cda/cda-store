// js/store.js
// Main product rendering + cart logic.
// Kept behavior intact; removed prev/next arrow buttons from small in-card carousels
// to avoid tall overlay controls in the product grid.

(() => {
  console.log("store.js loaded (carousel init conflict fix)");

  const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9RM9PuEfM9qPbZXALjzYFdGEoBiltayHlPSQlY9yEurdsRIQK1fgTfE-Wofkd821fdqADQ6O08Z4x/pub?gid=0&single=true&output=csv";

  const PRODUCTS_SECTION = document.getElementById('products') || null;
  let dynamicCatalogRoot = document.getElementById('cd-dynamic-catalog-root');
  if (!dynamicCatalogRoot) {
    dynamicCatalogRoot = document.createElement('div');
    dynamicCatalogRoot.id = 'cd-dynamic-catalog-root';
    if (PRODUCTS_SECTION && PRODUCTS_SECTION.parentNode) PRODUCTS_SECTION.parentNode.insertBefore(dynamicCatalogRoot, PRODUCTS_SECTION.nextSibling);
    else (document.querySelector('main .container') || document.body).appendChild(dynamicCatalogRoot);
  }

  function escapeHtml(s){ if(!s && s !== 0) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
  const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
  function formatPrice(v){ const n = Number(String(v).replace(/[^0-9.-]+/g,'')) || 0; return currency.format(n); }

  // Floating cart + modal
  const cartButton = document.createElement("button");
  cartButton.id = "floatingCartBtn";
  cartButton.innerHTML = `<span aria-hidden="true"><i class="fa fa-shopping-cart"></i></span> <span id="cartCountBadge" class="badge bg-danger ms-2" style="display:none">0</span>`;
  cartButton.style.position = "fixed";
  cartButton.style.right = "20px";
  const computeCartTop = () => (window.innerWidth <= 576 ? '66px' : '20px');
  cartButton.style.top = computeCartTop();
  cartButton.style.zIndex = 1100;
  cartButton.className = "btn btn-primary shadow-lg";
  cartButton.setAttribute('aria-label','Open shopping cart');
  document.body.appendChild(cartButton);
  window.addEventListener('resize', () => {
    cartButton.style.top = computeCartTop();
  });

  const modalHtml = `
  <div class="modal fade" id="cdStoreCartModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Your Cart</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div id="cdCartItems" class="list-group mb-3"></div>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div><strong>Total:</strong></div>
            <div><h5 id="cdCartTotal" class="mb-0">₹0.00</h5></div>
          </div>
          <hr />
          <h6>Shipping & Customer Details</h6>
          <p class="small text-muted mb-0">Please fill in all required fields marked with <strong>*</strong>.</p>
          <p class="small text-muted">BUY will open WhatsApp and pre-fill your order details for you to review and send to us.</p>
          <form id="cdCheckoutForm" class="row g-2">
            <div class="col-md-6">
              <label class="form-label">Full name*</label>
              <input id="cdName" class="form-control" required />
            </div>
            <div class="col-12">
              <label class="form-label">Address*</label>
              <input id="cdAddress" class="form-control" required />
            </div>
            <div class="col-md-6">
              <label class="form-label">City*</label>
              <input id="cdCity" class="form-control" required />
            </div>
            <div class="col-md-6">
              <label class="form-label">Pincode*</label>
              <input id="cdPincode" class="form-control" required />
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button id="cdClearCart" class="btn btn-outline-danger me-auto">Clear Cart</button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Continue Shopping</button>
          <button id="cdCheckoutBtn" type="button" class="btn btn-success"><i class="fa fa-whatsapp ms-2" aria-hidden="true"></i> BUY</button>
        </div>
      </div>
    </div>
  </div>
  `;
  const modalWrapper = document.createElement("div");
  modalWrapper.innerHTML = modalHtml;
  document.body.appendChild(modalWrapper);

  const cdCartItems = document.getElementById("cdCartItems");
  const cdCartTotal = document.getElementById("cdCartTotal");
  const cdClearCart = document.getElementById("cdClearCart");
  const cdCheckoutBtn = document.getElementById("cdCheckoutBtn");
  const cdName = document.getElementById("cdName");
  const cdPhone = document.getElementById("cdPhone");
  const cdAddress = document.getElementById("cdAddress");
  const cdCity = document.getElementById("cdCity");
  const cdPincode = document.getElementById("cdPincode");
  const cartCountBadge = document.getElementById("cartCountBadge");

  let PRODUCTS = {};
  let cart = [];

  // Image helpers
  function looksLikeUrl(s) { return /^https?:\/\//i.test((s||'').trim()); }
  function extractDriveId(token) {
    if (!token) return null;
    const s = String(token).trim();
    if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]{20,})/,
      /[?&]id=([a-zA-Z0-9_-]{20,})/,
      /\/uc\?export=view&id=([a-zA-Z0-9_-]{20,})/,
      /\/open\?id=([a-zA-Z0-9_-]{20,})/,
      /drive\.googleusercontent\.com\/.*?\/([a-zA-Z0-9_-]{20,})/
    ];
    for (const re of patterns) {
      const m = s.match(re);
      if (m && m[1]) return m[1];
    }
    const m = s.match(/([a-zA-Z0-9_-]{20,})/);
    return m ? m[1] : null;
  }
  function driveThumbnailUrl(fileId, size = 1000) { return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`; }

  function tokenToImageSrcs(token) {
    if (!token) return [];
    const parts = String(token).split(',').map(p => p.trim()).filter(Boolean);
    const out = [];
    for (const p of parts) {
      if (looksLikeUrl(p)) {
        if (/drive\.google\.com\/thumbnail\?/i.test(p) || /drive\.googleusercontent\.com/i.test(p) || /googleusercontent/i.test(p)) {
          out.push(p);
          continue;
        }
        const id = extractDriveId(p);
        if (id) { out.push(driveThumbnailUrl(id)); continue; }
        out.push(p);
        continue;
      }
      const id = extractDriveId(p);
      if (id) out.push(driveThumbnailUrl(id));
    }
    return out;
  }

  function safeId(prefix, id) {
    const cleaned = String(id || '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0,64);
    return `${prefix}-${cleaned}-${Math.random().toString(36).slice(2,8)}`;
  }

  function makeCardHTML(p) {
    const imgSrcs = tokenToImageSrcs(p.image_ids || p.image || p.images || '');
    const sizes = (p.sizes || p.size || '').toString().split(',').map(s => s.trim()).filter(Boolean);

    let mediaHtml = '';
    if (!imgSrcs || imgSrcs.length === 0) {
      mediaHtml = `<div class="product-media"><img data-src="assets/images/logo.png" alt="${escapeHtml(p.name)}" loading="lazy" /></div>`;
    } else if (imgSrcs.length === 1) {
      mediaHtml = `<div class="product-media"><img data-src="${escapeHtml(imgSrcs[0])}" alt="${escapeHtml(p.name)}" loading="lazy" /></div>`;
    } else {
      const carouselId = safeId('cdcarousel', p.id || p.name || Math.random());
      // indicators (kept) - will appear as small dots in top-left via CSS
      const indicators = imgSrcs.map((_, i) => `<button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${i}" ${i===0? 'class="active" aria-current="true"':''} aria-label="Slide ${i+1}"></button>`).join('');
      const innerItems = imgSrcs.map((src, i) => `
        <div class="carousel-item ${i===0 ? 'active' : ''}">
          <div class="carousel-slide-inner">
            <img data-src="${escapeHtml(src)}" alt="${escapeHtml(p.name)}" loading="lazy" />
          </div>
        </div>
      `).join('');
      // NOTE: removed prev/next arrow buttons for in-card carousels to avoid tall overlays
      const carouselHtml = `
        <div id="${carouselId}" class="carousel slide card-carousel">
          <div class="carousel-indicators">${indicators}</div>
          <div class="carousel-inner">${innerItems}</div>
        </div>
      `;
      mediaHtml = `<div class="product-media">${carouselHtml}</div>`;
    }

    const sizeSelectHtml = sizes.length
      ? `<select class="form-select form-select-sm card-size" data-id="${escapeHtml(p.id)}">${sizes.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}</select>`
      : `<div class="small text-muted">One size</div>`;

    return `
      <div class="card h-100 penguin-card-border shadow rounded card-product">
        ${mediaHtml}
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="card-title mb-0">${escapeHtml(p.name)}</h5>
            <small class="text-muted">${escapeHtml(p.category || '')}</small>
          </div>
          <p class="card-text text-muted small mb-2">${escapeHtml((p.description || '').slice(0,120))}</p>
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="price price-text-style">${formatPrice(p.price)}</div>
            <div class="text-muted small">${sizes.length ? 'Sizes' : ''}</div>
          </div>

          <div class="mt-auto">
            <div class="mb-2">${sizeSelectHtml}</div>
            <div class="row g-2">
              <div class="col-6"><button class="btn penguin-btn btn-add" data-id="${escapeHtml(p.id)}"><i class="fa fa-shopping-cart"></i> ADD TO CART</button></div>
              <div class="col-6"><button class="btn penguin-btn btn-buy" data-id="${escapeHtml(p.id)}"><i class="fa fa-shopping-cart"></i> BUY NOW</button></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function buildCategoryMapWithMeta(productsMap) {
    const map = {};
    Object.values(productsMap).forEach(p => {
      const raw = (p.category || 'Uncategorized').toString().trim();
      const name = raw || 'Uncategorized';
      if (!map[name]) {
        map[name] = { products: [], category_priority: Number.POSITIVE_INFINITY, category_rank: 0, contains_priority_product: false };
      }
      map[name].products.push(p);

      const catPriRaw = (p.category_priority || p.categoryPriority || p["category priority"] || p["category-priority"] || '').toString().trim();
      const catPriNum = Number(catPriRaw);
      if (!Number.isNaN(catPriNum) && catPriNum !== 0) {
        if (catPriNum < (map[name].category_priority || Number.POSITIVE_INFINITY)) {
          map[name].category_priority = catPriNum;
        }
      }

      const catRankNum = Number(p.category_rank || p.categoryRank || p["category rank"] || p.Category_rank || 0) || 0;
      if (catRankNum > (map[name].category_rank || 0)) map[name].category_rank = catRankNum;

      if (p.priority) map[name].contains_priority_product = true;
    });
    return map;
  }

  function sortProductsWithinCategory(products) {
    products.sort((a,b) => {
      const pa = !!a.priority;
      const pb = !!b.priority;
      if (pa !== pb) return pa ? -1 : 1;
      const ra = Number(a.priority_rank || 0);
      const rb = Number(b.priority_rank || 0);
      if (ra !== rb) return rb - ra;
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  function categoryOrderFromMap(categoryMap) {
    const names = Object.keys(categoryMap);
    const prioritized = names.filter(n => Number.isFinite(categoryMap[n].category_priority));
    prioritized.sort((a,b) => {
      const pa = categoryMap[a].category_priority;
      const pb = categoryMap[b].category_priority;
      if (pa !== pb) return pa - pb;
      const ra = categoryMap[a].category_rank || 0;
      const rb = categoryMap[b].category_rank || 0;
      if (ra !== rb) return rb - ra;
      return a.localeCompare(b);
    });

    const withPriorityProducts = names.filter(n => !prioritized.includes(n) && categoryMap[n].contains_priority_product).sort((a,b) => a.localeCompare(b));
    const rest = names.filter(n => !prioritized.includes(n) && !withPriorityProducts.includes(n)).sort((a,b) => a.localeCompare(b));
    return [...prioritized, ...withPriorityProducts, ...rest];
  }

  function renderCategories(productsMap) {
    dynamicCatalogRoot.innerHTML = '';
    const catMap = buildCategoryMapWithMeta(productsMap);
    const catNames = Object.keys(catMap);
    if (!catNames.length) {
      dynamicCatalogRoot.innerHTML = '<div class="text-muted">No products found.</div>';
      return;
    }

    const ordered = categoryOrderFromMap(catMap);
    ordered.forEach(catName => {
      const section = document.createElement('section');
      section.className = 'category-section container mt-5';
      section.innerHTML = `
        <h2 class="mb-3">${escapeHtml(catName)}</h2>
        <div class="row row-cols-1 row-cols-md-3 g-4" id="cat-${escapeHtml(catName)}"></div>
      `;
      dynamicCatalogRoot.appendChild(section);
      const row = section.querySelector(`#cat-${CSS.escape(catName)}`);

      const prods = (catMap[catName] && catMap[catName].products) || [];
      sortProductsWithinCategory(prods);

      prods.forEach(p => {
        const col = document.createElement('div');
        col.className = 'col';
        col.innerHTML = makeCardHTML(p);
        row.appendChild(col);
      });
    });

    // Initialize carousels (single explicit init per element)
    dynamicCatalogRoot.querySelectorAll('.carousel').forEach(car => {
      try {
        if (bootstrap.Carousel.getInstance(car)) {
          try { bootstrap.Carousel.getInstance(car).dispose(); } catch(e) { /* ignore */ }
        }
        if (bootstrap.Carousel.getOrCreateInstance) {
          bootstrap.Carousel.getOrCreateInstance(car, { interval: 3500, pause: 'hover' });
        } else {
          new bootstrap.Carousel(car, { interval: 3500, pause: 'hover' });
        }
      } catch (e) {
        console.warn('Carousel init failed', e);
      }
    });

    // attach handlers
        // Lazy-load product images with limited concurrency to mitigate Drive 429
        try {
          const imgs = dynamicCatalogRoot.querySelectorAll('.product-media img');
          const queue = [];
          let active = 0;
          const MAX_CONCURRENT = 6;

          function loadNext() {
            if (active >= MAX_CONCURRENT || queue.length === 0) return;
            const img = queue.shift();
            const src = img.getAttribute('data-src');
            if (!src) { loadNext(); return; }
            active++;
            img.src = src;
            img.addEventListener('load', () => { active--; loadNext(); }, { once: true });
            img.addEventListener('error', () => {
              const id = extractDriveId(src);
              if (id) {
                const fallback = `https://drive.google.com/uc?export=view&id=${id}`;
                setTimeout(() => { img.src = fallback; }, 500);
              }
              setTimeout(() => { active--; loadNext(); }, 800);
            }, { once: true });
          }

          const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const img = entry.target;
                io.unobserve(img);
                queue.push(img);
                loadNext();
              }
            });
          }, { rootMargin: '200px 0px', threshold: 0.01 });

          imgs.forEach(img => io.observe(img));
        } catch (e) {
          console.warn('Lazy-load init failed', e);
          dynamicCatalogRoot.querySelectorAll('.product-media img[data-src]').forEach(img => {
            img.src = img.getAttribute('data-src');
          });
        }
    dynamicCatalogRoot.querySelectorAll('.btn-add').forEach(b => b.addEventListener('click', e => {
      const id = e.currentTarget.getAttribute('data-id');
      const card = e.currentTarget.closest('.card');
      const sel = card.querySelector('.card-size');
      const selectedSize = sel ? sel.value : null;
      addToCart(id, selectedSize, false);
    }));
    dynamicCatalogRoot.querySelectorAll('.btn-buy').forEach(b => b.addEventListener('click', e => {
      const id = e.currentTarget.getAttribute('data-id');
      const card = e.currentTarget.closest('.card');
      const sel = card.querySelector('.card-size');
      const selectedSize = sel ? sel.value : null;
      addToCart(id, selectedSize, true);
    }));
  }

  // Cart functions
  function loadCart(){ try{ cart = JSON.parse(localStorage.getItem('cd_store_cart')||'[]') || []; }catch(e){ cart = []; } updateCartUI(); }
  function saveCart(){ localStorage.setItem('cd_store_cart', JSON.stringify(cart)); updateCartUI(); }
  function updateCartUI(){ const qty = cart.reduce((s,i)=>s+i.qty,0); if(cartCountBadge){ cartCountBadge.textContent = qty; cartCountBadge.style.display = qty ? 'inline-block' : 'none'; } renderCartItems(); }

  function renderCartItems(){
    cdCartItems.innerHTML = '';
    if(!cart.length){
      cdCartItems.innerHTML = `<div class="text-center text-muted py-4">Your cart is empty</div>`;
      cdCartTotal.textContent = formatPrice(0);
      return;
    }
    cart.forEach((it, idx) => {
      const prod = PRODUCTS[it.id] || {};
      const sizes = (prod.sizes || prod.size || '').toString().split(',').map(s => s.trim()).filter(Boolean);
      const item = document.createElement('div');
      item.className = 'list-group-item d-flex gap-3 align-items-start';
      item.innerHTML = `
        <img src="${escapeHtml(it.image || 'assets/images/logo.png')}" class="thumb" style="width:72px;height:72px;object-fit:cover;border-radius:.35rem;" alt="${escapeHtml(it.name)}"/>
        <div class="flex-grow-1">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${escapeHtml(it.name)}</h6>
            <small class="text-muted">${formatPrice(it.price)}</small>
          </div>
          <p class="mb-2 small text-muted">${escapeHtml(prod.category || '')}</p>

          <div class="row gx-2 gy-2 align-items-center">
            <div class="col-auto">
              <label class="form-label small mb-1">Size</label>
              ${sizes.length ? `<select data-idx="${idx}" class="form-select form-select-sm cart-size">${sizes.map(s => `<option ${s === it.size ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}</select>` : ''}
            </div>
            <div class="col-auto">
              <label class="form-label small mb-1">Qty</label>
              <input data-idx="${idx}" type="number" min="1" class="form-control form-control-sm qty-input" value="${it.qty}" style="width:80px;" />
            </div>
            <div class="col-auto align-self-end">
              <button data-idx="${idx}" class="btn btn-sm btn-outline-danger remove-item">Remove</button>
            </div>
          </div>
        </div>
      `;
      cdCartItems.appendChild(item);
    });

    cdCartItems.querySelectorAll('.qty-input').forEach(el => el.addEventListener('change', ev => {
      const idx = Number(ev.target.getAttribute('data-idx'));
      let v = parseInt(ev.target.value,10) || 1;
      if(v < 1) v = 1;
      cart[idx].qty = v;
      saveCart();
      renderCartItems();
    }));
    cdCartItems.querySelectorAll('.cart-size').forEach(el => el.addEventListener('change', ev => {
      const idx = Number(ev.target.getAttribute('data-idx'));
      cart[idx].size = ev.target.value;
      saveCart();
      renderCartItems();
    }));
    cdCartItems.querySelectorAll('.remove-item').forEach(btn => btn.addEventListener('click', ev => {
      const idx = Number(btn.getAttribute('data-idx'));
      cart.splice(idx,1);
      saveCart();
      renderCartItems();
    }));

    const total = cart.reduce((s,it) => s + it.price * it.qty, 0);
    cdCartTotal.textContent = formatPrice(total);
    if (cartCountBadge) {
      cartCountBadge.textContent = cart.reduce((s,i) => s + i.qty, 0);
      cartCountBadge.style.display = cart.length ? 'inline-block' : 'none';
    }
  }

  function addToCart(id, size, openModal) {
    const p = PRODUCTS[id];
    if(!p) { console.warn('Product not found:', id); return; }
    const priceNum = Number(String(p.price).replace(/[^0-9.-]+/g,'')) || 0;
    const imgs = tokenToImageSrcs(p.image_ids || p.image || p.images || '');
    const image = imgs.length ? imgs[0] : 'assets/images/logo.png';
    const existing = cart.find(it => it.id === id && (it.size || '') === (size || ''));
    if(existing) existing.qty += 1;
    else cart.push({ id, name: p.name, price: priceNum, qty: 1, size: size || null, image });
    saveCart();
    if(openModal) {
      const modalEl = document.getElementById('cdStoreCartModal');
      if(modalEl) new bootstrap.Modal(modalEl).show();
    }
  }

  function clearCart(){ if(!confirm('Clear your cart?')) return; cart = []; saveCart(); renderCartItems(); }
  function showCartModal(){ const modalEl = document.getElementById('cdStoreCartModal'); if(modalEl) new bootstrap.Modal(modalEl).show(); }

  function checkoutViaWhatsApp() {
    if (!cart.length) {
      alert('Cart is empty');
      return;
    }
    if (!cdName.value.trim() || !cdAddress.value.trim() ||
        !cdCity.value.trim() || !cdPincode.value.trim()) {
      alert('Please fill customer details.');
      return;
    }

    let msg = `New Order - Cathy's Dreamy Attire\n\n`;
    cart.forEach(it => { msg += `${it.id} (${it.size || 'N/A'}) x ${it.qty}\n`; });
    const total = cart.reduce((s, it) => s + it.price * it.qty, 0);
    msg += `\nTotal: ₹${total}\n\n`;
    msg += `Customer:\n${cdName.value.trim()}\n${cdAddress.value.trim()}, ${cdCity.value.trim()} - ${cdPincode.value.trim()}\n`;
    const phone = "917907555924";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    cart = [];
    saveCart();
    renderCartItems();
    const modalEl = document.getElementById('cdStoreCartModal');
    if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
  }

  cartButton.addEventListener('click', showCartModal);
  cdClearCart.addEventListener('click', clearCart);
  cdCheckoutBtn.addEventListener('click', checkoutViaWhatsApp);

  function parseCsv(results) {
    console.log('CSV parsed, rows:', (results.data || []).length);
    const rows = results.data || [];
    PRODUCTS = {};
    rows.forEach((row, idx) => {
      const id = (row.id || row.ID || row.Id || '').toString().trim() || String(idx+1);
      const name = (row.name || row.Name || row.product || '').toString().trim();
      const price = (row.price || row.Price || '0').toString().trim();
      const sizes = (row.sizes || row.size || '').toString().trim();
      const image_ids = (row.image_ids || row.image_id || row.image || row.images || row.ImageIDs || row["image id"] || row["image-id"] || '').toString().trim();
      const category = (row.category || row.Category || '').toString().trim() || 'Uncategorized';
      const description = (row.description || row.desc || '').toString().trim();

      const priorityRaw = (row.priority || row.Priority || row.featured || row.Featured || row.is_priority || row["is priority"] || '').toString().trim().toLowerCase();
      const priority = (priorityRaw === 'true' || priorityRaw === '1' || priorityRaw === 'yes' || priorityRaw === 'y');
      const priorityRankRaw = (row.priority_rank || row.Priority_rank || row.priorityRank || row["priority rank"] || '').toString().trim();
      const priority_rank = Number(priorityRankRaw) || 0;

      const categoryPriorityRaw = (row.category_priority || row.Category_Priority || row["category priority"] || row["category-priority"] || '').toString().trim();
      const category_priority = categoryPriorityRaw === '' ? null : Number(categoryPriorityRaw);
      const categoryRankRaw = (row.category_rank || row.Category_rank || row["category rank"] || '').toString().trim();
      const category_rank = Number(categoryRankRaw) || 0;

      PRODUCTS[id] = {
        id, name, price, sizes,
        image_ids, category, description,
        priority, priority_rank,
        category_priority, category_rank
      };
    });

    renderCategories(PRODUCTS);
    loadCart();
    renderCartItems();
    if (window.cdZoomAttachAll) window.cdZoomAttachAll();
  }

  function fetchCsv() {
    console.log('Fetching CSV from', CSV_URL);
    if (typeof Papa === 'undefined') {
      console.error('PapaParse not found. Ensure papaparse is included in index.html');
      return;
    }
    Papa.parse(CSV_URL, { download: true, header: true, skipEmptyLines: true, complete: parseCsv, error: (err)=>{ console.error('Papa parse error', err); alert('Failed to load products CSV (see console)'); } });
  }

  fetchCsv();

})();