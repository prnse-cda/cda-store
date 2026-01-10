(function(){
  /**
   * CSV-driven rendering for sections: Collections (filters + products), Instagram, Footer
   * Configuration is provided via window.CDA_CSV_CONFIG and window.CDA_PUB_BASE (set in inputs.js)
   * - Collections sheet: rows with collection_name and comma-separated collection_sheet_gid values
   * - Product sheets: expect `sku` as product ID and standard attributes (price, offer_price, sizes, images...)
   * - Footer sheet: contact details (email, whatsapp, instagram, facebook, pinterest)
   */

  var CFG = window.CDA_CSV_CONFIG || {};
  var SHEET_ID = window.CDA_SHEET_ID || null; // optional, used when a row provides only csv_gid
  var PUB_BASE = window.CDA_PUB_BASE || null; // published /d/e/... base ending with &gid=

  /** Resolve a Google Sheet URL or gid to a published CSV URL */
  function toPublishedCsv(urlOrGid){
    if (!urlOrGid) return null;
    var s = String(urlOrGid).trim();
    if (/output=csv/i.test(s) && /\/pub\?/.test(s)) return s; // already published csv
    // If full edit URL with /d/<id>/edit?gid=123
    var m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    var gidM = s.match(/[?&]gid=(\d+)/);
    if (m && gidM) {
      return "https://docs.google.com/spreadsheets/d/" + m[1] + "/pub?gid=" + gidM[1] + "&single=true&output=csv";
    }
    // If only gid provided, prefer published /d/e base, else fallback to classic sheet id
    if (/^\d+$/.test(s)) {
      if (PUB_BASE) return PUB_BASE + s;
      if (SHEET_ID) return "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/pub?gid=" + s + "&single=true&output=csv";
    }
    return s; // fallback as-is
  }

  // Minimal CSV loader using PapaParse
  /** Load CSV via PapaParse (header=true), callbacks with array of row objects */
  function loadCsv(url, cb){
    if (!url) return cb([]);
    if (typeof Papa === 'undefined') { 
      console.error('PapaParse missing');
      if (window.showAlert) window.showAlert('A required library is missing. Please contact support.', 'error');
      cb([]); 
      return; 
    }
    Papa.parse(toPublishedCsv(url), { 
      download: true, 
      header: true, 
      skipEmptyLines: true, 
      complete: function(res){ cb(res.data || []); }, 
      error: function(err){ 
        console.error('CSV loading error for URL: ' + url, err);
        if (window.showAlert) window.showAlert('Failed to load site data. Please check your connection.', 'error');
        cb([]); 
      } 
    });
  }

  // Google Drive helpers
  /** Extract a Google Drive file id from a token (id or URL) */
  function extractDriveId(token){
    if (!token) return null;
    var s = String(token).trim();
    if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
    var pats = [
      /\/d\/([a-zA-Z0-9_-]{20,})/,
      /[?&]id=([a-zA-Z0-9_-]{20,})/,
      /\/uc\?export=view&id=([a-zA-Z0-9_-]{20,})/
    ];
    for (var i=0;i<pats.length;i++){
      var m = s.match(pats[i]);
      if (m && m[1]) return m[1];
    }
    var m2 = s.match(/([a-zA-Z0-9_-]{20,})/);
    return m2 ? m2[1] : null;
  }
  /** Build Google Drive thumbnail URL for a given id */
  function driveThumb(id, size){ size = size || 1000; return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + size; }
  /** Convert a comma-separated token string into image URLs, resolving Drive IDs */
  function tokenToImgs(token, size){
    if (!token) return [];
    return String(token).split(',').map(function(p){ return p.trim(); }).filter(Boolean).map(function(p){
      var id = extractDriveId(p);
      return id ? driveThumb(id, size) : p;
    });
  }

  // COLLECTIONS + FILTERS + PRODUCTS (lazy)
  var collections = [];
  var collectionGroups = {}; // title (collection_name) -> array of collection rows
  var productCache = {}; // product_name -> array of products
  var groupCache = {}; // group title -> merged array of products

  // --- Start Pagination State ---
  var CDA_PAGINATION_ACTIVE = false;
  var CDA_CURRENT_PRODUCT_LIST = [];
  var CDA_CURRENT_PAGE = 1;
  var CDA_PAGE_SIZE = 8;
  // --- End Pagination State ---

  /** Fetch collections, build filters and shop menu, render optional collection cards */
  function renderCollections(){
    var filters = document.getElementById('filter-list');
    var plist = document.getElementById('product-list');
    if (!CFG.collections) {
      if (window.pageLoader) window.pageLoader.taskDone();
      return;
    }
    loadCsv(CFG.collections, function(rows){
      // New schema: collection_name, collection_sheet_gid (comma-separated gid values)
      collections = rows.map(function(r){
        var name = (r.collection_name || r.collection || r.name || '').toString().trim();
        var gids = (r.collection_sheet_gid || r.csv_gid || r.gid || '').toString().split(',').map(function(s){ return s.trim(); }).filter(Boolean);
        return gids.map(function(g){
          return {
            name: name,
            title: name,
            csv_gid: g,
            csv_url: ''
          };
        });
      }).reduce(function(acc, arr){ return acc.concat(arr); }, []).filter(function(c){ return !!c.name && !!c.csv_gid; });

      // Build groups by collection_name/title
      collectionGroups = {};
      collections.forEach(function(c){
        var key = c.title || c.name;
        if (!key) return;
        if (!collectionGroups[key]) collectionGroups[key] = [];
        collectionGroups[key].push(c);
      });

      // Render Shop submenu from groups (available across pages)
      renderShopMenu();

      // Collections cards removed from site; using filters + products only

      // Filters - deduplicate by product_name (only render when filter-list exists)
      if (filters) {
        filters.innerHTML = '';
        var makeBtn = function(label){
          var li = document.createElement('li');
          var b = document.createElement('button'); b.className = 'filter-btn'; b.textContent = label; li.appendChild(b);
          b.addEventListener('click', function(){ 
            history.pushState(null, '', '#filter=' + encodeURIComponent(label));
            selectFilter(label); 
          });
          filters.appendChild(li);
        };
        makeBtn('All');
        var uniqueProductNames = {};
        collections.forEach(function(c){ 
          if (!uniqueProductNames[c.name]) {
            uniqueProductNames[c.name] = true;
            makeBtn(c.name); 
          }
        });
      }

      // On first load, if no deep-link hash is present, default to showing the 'All' filter.
      if (filters && plist) {
        var h = window.location.hash || '';
        if (!/^#(filter|collection|product)=/i.test(h)) {
          // Default to showing 'All' products, paginated.
          selectFilter('All');
        }
      }
      
      if (window.pageLoader) window.pageLoader.taskDone();
    });
  }

  // Build SHOP dropdown menu from collection groups
  /** Build SHOP dropdown menu from unique collection names */
  function renderShopMenu(){
    var menu = document.getElementById('shop-submenu');
    if (!menu) return;
    menu.innerHTML = '';
    var makeItem = function(label, onClick){
      var li = document.createElement('li');
      li.className = 'dropdown-item';
      var a = document.createElement('a');
      a.href = '#';
      a.textContent = label;
      a.addEventListener('click', function(e){ 
        e.preventDefault();
        var hasProduct = document.getElementById('product-section');
        var inPolicies = window.location.pathname.indexOf('/policies/') !== -1;
        var base = inPolicies ? '../' : './';
        if (!hasProduct) {
          // Navigate to index with hash where products are rendered
          var hash = (label === 'All') ? '#filter=All' : ('#collection=' + encodeURIComponent(label));
          window.location.href = base + hash;
          return;
        }
        // Update URL and render locally
        if (label === 'All') {
          history.pushState(null, '', '#filter=All');
        } else {
          history.pushState(null, '', '#collection=' + encodeURIComponent(label));
        }
        onClick();
        document.getElementById('product-section')?.scrollIntoView({behavior:'smooth'});
        document.querySelector('[data-navbar]')?.classList.remove('active');
        document.querySelector('[data-overlay]')?.classList.remove('active');
        document.querySelector('.navbar-item.has-dropdown')?.classList.remove('active');
      });
      li.appendChild(a);
      menu.appendChild(li);
    };
    makeItem('All', function(){ selectFilter('All'); });
    Object.keys(collectionGroups).forEach(function(title){ makeItem(title, function(){ selectGroup(title); }); });
  }

  /** Get the published CSV URL for a collection entry */
  function collectionCsvUrl(c){
    if (c.csv_url) return toPublishedCsv(c.csv_url);
    if (c.csv_gid) return toPublishedCsv(c.csv_gid);
    return null;
  }

  // Select a group by collection_name/title and merge all product sheets for that group
  /** Select a collection group by name and merge products across its sheets */
  function selectGroup(groupTitle){
    var plist = document.getElementById('product-list');
    if (!plist) return;
    var group = collectionGroups[groupTitle] || [];
    if (!group.length) { startPagination([]); return; }
    // Serve from cache if available
    if (groupCache[groupTitle]) { startPagination(groupCache[groupTitle]); return; }
    var merged = [];
    var left = group.length;
    group.forEach(function(c){
      // Use unique cache key combining product_name and csv_gid
      var cacheKey = c.name + '_' + (c.csv_gid || c.csv_url || '');
      if (productCache[cacheKey]) { merged = merged.concat(productCache[cacheKey]); if(--left===0){ groupCache[groupTitle]=merged; startPagination(merged); } return; }
      plist.innerHTML = '';
      loadCsv(collectionCsvUrl(c), function(rows){
        var list = parseProducts(rows, c.title || c.name);
        productCache[cacheKey] = list;
        merged = merged.concat(list);
        if(--left===0){ groupCache[groupTitle]=merged; startPagination(merged); }
      });
    });
  }
  // Expose globally for URL navigation
  window.selectGroup = selectGroup;

  /** Map CSV rows to product objects; prefer `sku` as id */
  function parseProducts(rows, collectionName){
    return rows.map(function(r, idx){
      var id = (r.sku || r.SKU || r.sku_id || r.id || r.ID || r.Id || String(idx+1)).toString().trim();
      return {
        id: id,
        name: (r.name || r.Name || r.product || collectionName || '').toString().trim(),
        price: (r.price || r.Price || '0').toString().trim(),
        offer_price: (r.offer_price || r.offerPrice || r['offer price'] || '').toString().trim(),
        sizes: (r.sizes || r.size || '').toString().trim(),
        images: (r.image_ids || r.image_id || r.image || r.images || '').toString().trim(),
        category: collectionName || (r.category || '').toString().trim(),
        description: (r.description || r.desc || '').toString().trim(),
        priority: (function(){ var p = (r.priority || r.featured || '').toString().toLowerCase(); return p==='true'||p==='1'||p==='yes'; })(),
        priority_rank: Number(r.priority_rank || 0) || 0,
        card_badge: (r.card_badge || r.cardBadge || r['card badge'] || '').toString().trim(),
        sale_status: (r.sale_status || r.saleStatus || r['sale status'] || '').toString().trim(),
        insta_link: (r.insta_link || r.instaLink || r['insta link'] || r.instagram_link || '').toString().trim(),
        fabric_product_id: (r.fabric_product_id || '').toString().trim(),
        card_button: (r.card_button || '').toString().trim()
      };
    });
  }

  function createLoadMoreButton() {
    var plist = document.getElementById('product-list');
    if (!plist) return;
    var existingBtn = document.getElementById('load-more-container');
    if (existingBtn) existingBtn.remove();
    var container = document.createElement('div');
    container.id = 'load-more-container';
    container.style.textAlign = 'center';
    container.style.marginTop = '24px';
    var btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.innerHTML = '<span>Load More</span> <ion-icon name="reload-outline" aria-hidden="true"></ion-icon>';
    btn.addEventListener('click', renderNextPage);
    container.appendChild(btn);
    var parent = plist.parentElement;
    if (parent) parent.appendChild(container);
    container.style.display = 'none'; // Initially hidden
  }

  function renderNextPage() {
    var btnContainer = document.getElementById('load-more-container');
    if (!btnContainer) return;

    var start = (CDA_CURRENT_PAGE - 1) * CDA_PAGE_SIZE;
    var end = start + CDA_PAGE_SIZE;
    var pageItems = CDA_CURRENT_PRODUCT_LIST.slice(start, end);

    if (pageItems.length) {
      // Set flag to append, then render
      CDA_PAGINATION_ACTIVE = true;
      renderProducts(pageItems);
      CDA_PAGINATION_ACTIVE = false;
      CDA_CURRENT_PAGE++;
    }

    if (end >= CDA_CURRENT_PRODUCT_LIST.length) {
      btnContainer.style.display = 'none';
    } else {
      btnContainer.style.display = 'block';
    }
  }

  function startPagination(productList) {
    var root = document.getElementById('product-list');
    if (!root) return;
    
    // DEV-NOTE: Sorting removed to preserve sheet order.
    // productList.sort(function(a, b) {
    //   if (a.priority && !b.priority) return -1;
    //   if (!a.priority && b.priority) return 1;
    //   if (a.priority_rank !== b.priority_rank) return (b.priority_rank || 0) - (a.priority_rank || 0);
    //   return (a.name || '').localeCompare(b.name || '');
    // });

    CDA_CURRENT_PRODUCT_LIST = productList;
    CDA_CURRENT_PAGE = 1;
    
    root.innerHTML = '';

    createLoadMoreButton();
    renderNextPage();
  }

  function rupee(n){
    var v = Number(String(n).replace(/[^0-9.-]+/g,'')) || 0; return '₹' + v.toFixed(2);
  }

  /** Render a list of product cards into the product grid */
  function renderProducts(list){
    var root = document.getElementById('product-list');
    if (!root) return;
    // On first render of a paginated list, clear the container. Subsequent loads will append.
    if (!CDA_PAGINATION_ACTIVE) {
      root.innerHTML = '';
    }

    list.forEach(function(p){
      try { if (window.cdRegisterProduct) window.cdRegisterProduct(p); } catch(_) {}
      var imgs = tokenToImgs(p.images, 400);
      var main = imgs[0] || './assets/images/product-1.jpg';
      var hasOffer = !!(p.offer_price && String(p.offer_price).trim() !== '' && Number(String(p.offer_price).replace(/[^0-9.-]+/g,'')) > 0);

      // Create elements programmatically to prevent XSS
      var li = document.createElement('li');
      li.className = 'product-item';

      var productCard = document.createElement('div');
      productCard.className = 'product-card';
      productCard.tabIndex = 0;

      var figure = document.createElement('figure');
      figure.className = 'card-banner';

      var img = document.createElement('img');
      img.src = main;
      img.width = 312;
      img.height = 350;
      img.loading = 'lazy';
      img.alt = p.name || ''; // alt is sanitized by property assignment
      img.className = 'image-contain';
      figure.appendChild(img);

      // Discount badge
      if (hasOffer) {
        var base = Number(String(p.price).replace(/[^0-9.-]+/g,'')) || 0;
        var off = Number(String(p.offer_price).replace(/[^0-9.-]+/g,'')) || 0;
        if (base > 0 && off > 0 && off < base) {
          var pct = Math.round((1 - (off/base)) * 100);
          var discBadge = document.createElement('div');
          discBadge.className = 'card-badge';
          discBadge.textContent = '-' + pct + '%';
          figure.appendChild(discBadge);
        }
      }

      // Top badge (e.g., "New Arrival")
      if (p.card_badge) {
        var cardBadge = document.createElement('div');
        cardBadge.className = 'card-badge-top';
        cardBadge.textContent = p.card_badge;
        figure.appendChild(cardBadge);
      }

      // Sale status badge
      if (p.sale_status) {
        var saleStatus = document.createElement('div');
        saleStatus.className = 'sale-status-badge';
        saleStatus.textContent = p.sale_status;
        figure.appendChild(saleStatus);
      }

      var quickViewBtn = document.createElement('button');
      quickViewBtn.className = 'quick-view-btn';
      quickViewBtn.dataset.action = 'quick';
      var btnText = p.card_button || 'Quick View';
      quickViewBtn.setAttribute('aria-label', btnText);
      quickViewBtn.textContent = btnText;
      quickViewBtn.addEventListener('click', function(){
        if (window.openProductDetail) window.openProductDetail(p.id);
      });
      figure.appendChild(quickViewBtn);

      var cardContent = document.createElement('div');
      cardContent.className = 'card-content';

      var title = document.createElement('h3');
      title.className = 'h3 card-title';
      title.textContent = p.name || '';
      cardContent.appendChild(title);

      var priceData = document.createElement('data');
      priceData.className = 'card-price';
      priceData.value = hasOffer ? String(p.offer_price).replace(/[^0-9.-]+/g,'') : String(p.price).replace(/[^0-9.-]+/g,'');

      if (hasOffer) {
        priceData.textContent = rupee(p.offer_price) + ' ';
        var del = document.createElement('del');
        del.textContent = rupee(p.price);
        priceData.appendChild(del);
      } else {
        priceData.textContent = rupee(p.price);
      }
      cardContent.appendChild(priceData);

      // Assemble card
      productCard.appendChild(figure);
      productCard.appendChild(cardContent);
      li.appendChild(productCard);
      root.appendChild(li);
    });
  }

  /** Select filter by collection name or All; lazy-load product sheets and merge */
  function selectFilter(label){
    var filters = document.getElementById('filter-list');
    var plist = document.getElementById('product-list');
    if (!filters || !plist) return;
    // Active state
    filters.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.toggle('active', b.textContent === label); });
    // Load
    if (label === 'All') {
      // fetch all (lazy) then merge
      var pending = collections.slice();
      var merged = [];
      var left = pending.length; if (!left) { startPagination([]); return; }
      pending.forEach(function(c){
        var cacheKey = c.name + '_' + (c.csv_gid || c.csv_url || '');
        if (productCache[cacheKey]) { merged = merged.concat(productCache[cacheKey]); if(--left===0) startPagination(merged); return; }
        loadCsv(collectionCsvUrl(c), function(rows){ var list = parseProducts(rows, c.name); productCache[cacheKey] = list; merged = merged.concat(list); if(--left===0) startPagination(merged); });
      });
    } else {
      // Find all collections with matching product_name
      var matchingCollections = collections.filter(function(x){ return x.name === label; });
      if (!matchingCollections.length) { startPagination([]); return; }
      
      // Merge products from all matching collections
      var merged = [];
      var left = matchingCollections.length;
      matchingCollections.forEach(function(c){
        var cacheKey = c.name + '_' + (c.csv_gid || c.csv_url || '');
        if (productCache[cacheKey]) { 
          merged = merged.concat(productCache[cacheKey]); 
          if(--left===0) startPagination(merged); 
          return; 
        }
        plist.innerHTML = '';
        loadCsv(collectionCsvUrl(c), function(rows){ 
          var list = parseProducts(rows, c.name); 
          productCache[cacheKey] = list; 
          merged = merged.concat(list); 
          if(--left===0) startPagination(merged); 
        });
      });
    }
  }
  // Expose globally for URL navigation
  window.selectFilter = selectFilter;

  // INSTA
  /** Render Instagram cards from the insta sheet */
  function renderInsta(){
    var list = document.getElementById('insta-list');
    if (!list || !CFG.insta) {
      if (window.pageLoader) window.pageLoader.taskDone();
      return;
    }
    loadCsv(CFG.insta, function(rows){
      list.innerHTML = '';
      rows.forEach(function(r){
        var link = (r.link || r.insta_link || '#').toString().trim();
        var li = document.createElement('li'); 
        li.className = 'insta-post-item';
        
        // Get background image from image_id column
        var imgs = tokenToImgs(r.image_id || r.image || '');
        var bgSrc = imgs[0] || './assets/images/insta-1.jpg';
        
        // Create clickable Instagram card with overlay
        li.innerHTML = '<a href="' + link + '" target="_blank" rel="noopener" class="insta-card-link">' +
          '<div class="insta-bg" style="background-image: url(' + bgSrc + ')"></div>' +
          '<div class="insta-overlay">' +
            '<ion-icon name="logo-instagram"></ion-icon>' +
            '<span>View this post on Instagram</span>' +
          '</div>' +
        '</a>';
        
        list.appendChild(li);
      });
      if (window.pageLoader) window.pageLoader.taskDone();
    });
  }

  // FOOTER
  /** Render footer contacts (email, WhatsApp) and social links; expose window.CDA_CONTACTS */
  function renderFooter(){
    if (!CFG.footer) {
      if (window.pageLoader) window.pageLoader.taskDone();
      return;
    }
    loadCsv(CFG.footer, function(rows){
      if (!rows.length) {
        if (window.pageLoader) window.pageLoader.taskDone();
        return;
      }
      var r = rows[0];
      // Socials (instagram, facebook, whatsapp from CSV)
      var social = document.getElementById('footer-social-list');
      if (social) {
        var waNumRaw = (r.whatsapp || '').toString();
        var waDigits = waNumRaw.replace(/[^0-9]/g, '');
        var brand = (window.CDA_INPUTS && window.CDA_INPUTS.brand_name) ? window.CDA_INPUTS.brand_name : '';
        var waText = encodeURIComponent('Hello, ' + brand);
        var socialLinks = [
          { href: (r.instagram || '').toString().trim(), icon: 'logo-instagram' },
          { href: (r.facebook || '').toString().trim(), icon: 'logo-facebook' },
          { href: (r.pinterest || '').toString().trim(), icon: 'logo-pinterest' },
          { href: waDigits ? ('https://wa.me/' + waDigits + '?text=' + waText) : '', icon: 'logo-whatsapp' }
        ];
        social.innerHTML = '';
        socialLinks.forEach(function(item){
          if (!item.href) return;
          var li = document.createElement('li');
          li.innerHTML = '<a href="'+ item.href +'" class="social-link" target="_blank" rel="noopener"><ion-icon name="'+ item.icon +'"></ion-icon></a>';
          social.appendChild(li);
        });
        // Note: Mobile socials block removed; navbar-social-links is used instead
        // Navbar social links (new style with borders)
        var navSocial = document.getElementById('navbar-social-links');
        if (navSocial) {
          navSocial.innerHTML = '';
          socialLinks.forEach(function(item){
            if (!item.href) return;
            var a = document.createElement('a');
            a.href = item.href; a.target = '_blank'; a.rel = 'noopener';
            a.setAttribute('aria-label', item.icon.replace('logo-', ''));
            a.innerHTML = '<ion-icon name="'+ item.icon +'"></ion-icon>';
            a.addEventListener('click', function(){
              document.querySelector('[data-navbar]')?.classList.remove('active');
              document.querySelector('[data-overlay]')?.classList.remove('active');
            });
            navSocial.appendChild(a);
          });
        }
      }
      // Contact (email + whatsapp number)
      var phoneA = document.getElementById('footer-phone');
      if (phoneA) {
        var waNum = (r.whatsapp || '').toString();
        var waDigits = waNum.replace(/[^0-9]/g, '');
        var brand2 = (window.CDA_INPUTS && window.CDA_INPUTS.brand_name) ? window.CDA_INPUTS.brand_name : '';
        var waText2 = encodeURIComponent('Hello, ' + brand2);
        phoneA.href = waDigits ? ('https://wa.me/' + waDigits + '?text=' + waText2) : '#';
        phoneA.target = '_blank';
        phoneA.rel = 'noopener';
        var s = phoneA.querySelector('.footer-link-text'); if (s) s.textContent = waNum;
      }
      var mailA = document.getElementById('footer-email');
      var em = (r.email || '').toString();
      if (mailA) { mailA.href = em ? ('mailto:'+em) : '#'; var s2 = mailA.querySelector('.footer-link-text'); if (s2) s2.textContent = em; }

      // Expose contacts globally for other modules (policy pages, etc.)
      try {
        window.CDA_CONTACTS = {
          email: em,
          whatsapp: (r.whatsapp || '').toString().replace(/[^0-9]/g, ''),
          instagram: (r.instagram || '').toString().trim(),
          facebook: (r.facebook || '').toString().trim(),
          pinterest: (r.pinterest || '').toString().trim()
        };
      } catch(_) {}
      
      if (window.pageLoader) window.pageLoader.taskDone();
    });
  }

  // Init
  document.addEventListener('DOMContentLoaded', function(){
    if (window.pageLoader) window.pageLoader.init(3);
    renderCollections();
    renderInsta();
    renderFooter();
  });
})();
