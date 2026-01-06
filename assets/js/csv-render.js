(function(){
  // CSV-driven rendering for sections: COLLECTIONS, PRODUCTS, INSTA, FOOTER
  // Configure via window.CDA_CSV_CONFIG and window.CDA_PUB_BASE (from inputs.js)

  var CFG = window.CDA_CSV_CONFIG || {};
  var SHEET_ID = window.CDA_SHEET_ID || null; // optional, used when a row provides only csv_gid
  var PUB_BASE = window.CDA_PUB_BASE || null; // published /d/e/... base ending with &gid=

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
  function loadCsv(url, cb){
    if (!url) return cb([]);
    if (typeof Papa === 'undefined') { console.error('PapaParse missing'); cb([]); return; }
    Papa.parse(toPublishedCsv(url), { download: true, header: true, skipEmptyLines: true, complete: function(res){ cb(res.data || []); }, error: function(){ cb([]); } });
  }

  // Google Drive helpers
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
  function driveThumb(id, size){ size = size || 1000; return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + size; }
  function tokenToImgs(token){
    if (!token) return [];
    return String(token).split(',').map(function(p){ return p.trim(); }).filter(Boolean).map(function(p){
      var id = extractDriveId(p);
      return id ? driveThumb(id) : p;
    });
  }

  // HERO removed

  // COLLECTIONS + FILTERS + PRODUCTS (lazy)
  var collections = [];
  var collectionGroups = {}; // title (collection_name) -> array of collection rows
  var productCache = {}; // product_name -> array of products
  var groupCache = {}; // group title -> merged array of products
  var PREVIEW_RENDERED = false;

  function hideViewAll(){
    var c = document.getElementById('view-all-container');
    if (c) c.remove();
  }

  function showViewAll(){
    var plist = document.getElementById('product-list');
    if (!plist) return;
    hideViewAll();
    var container = document.createElement('div');
    container.id = 'view-all-container';
    container.style.textAlign = 'center';
    container.style.marginTop = '24px';
    var btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.innerHTML = '<span>View All</span> <ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon>';
    btn.addEventListener('click', function(){
      hideViewAll();
      try { selectFilter('All'); } catch(_){}
      document.getElementById('product-section')?.scrollIntoView({behavior:'smooth'});
    });
    container.appendChild(btn);
    var parent = plist.parentElement;
    if (parent) parent.appendChild(container);
  }

  function renderInitialPreview(){
    var plist = document.getElementById('product-list');
    if (!plist) return;
    var titles = Object.keys(collectionGroups);
    if (!titles.length) { renderProducts([]); return; }
    var preview = [];
    var left = titles.length;
    titles.forEach(function(title){
      var group = collectionGroups[title] || [];
      var c = group[0];
      if (!c) { if(--left===0){ renderProducts(preview); showViewAll(); PREVIEW_RENDERED=true; } return; }
      var cacheKey = 'preview_' + (c.csv_gid || c.csv_url || '');
      if (productCache[cacheKey]) {
        if (productCache[cacheKey][0]) preview.push(productCache[cacheKey][0]);
        if(--left===0){ renderProducts(preview); showViewAll(); PREVIEW_RENDERED=true; }
        return;
      }
      loadCsv(collectionCsvUrl(c), function(rows){
        var list = parseProducts(rows, c.title || c.name);
        productCache[cacheKey] = list;
        if (list[0]) preview.push(list[0]);
        if(--left===0){ renderProducts(preview); showViewAll(); PREVIEW_RENDERED=true; }
      });
    });
  }

  function renderCollections(){
    var list = document.getElementById('collection-list');
    var filters = document.getElementById('filter-list');
    var plist = document.getElementById('product-list');
    if (!CFG.collections || !filters || !plist) return;
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

      // Render Shop submenu from groups
      renderShopMenu();

      // Cards - optional; render only if a collections list exists in DOM
      if (list) {
        list.innerHTML = '';
        var renderedCollections = {};
        collections.forEach(function(c){
          var collectionKey = c.title || c.name;
          if (renderedCollections[collectionKey]) return;
          renderedCollections[collectionKey] = true;
          var bg = '';
          var li = document.createElement('li');
          li.innerHTML = '<div class="collection-card" style="background-image:url(\''+ (bg || './assets/images/collection-1.jpg') +'\')">\
            <h3 class="h4 card-title>'+ (c.title || c.name) +'</h3>\
            <a href="#" class="btn btn-secondary"><span>Explore All</span><ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon></a>\
          </div>';
          var a = li.querySelector('a');
          a.addEventListener('click', function(ev){ 
            ev.preventDefault(); 
            var collectionName = c.title || c.name;
            history.pushState(null, '', '#collection=' + encodeURIComponent(collectionName));
            selectGroup(collectionName); 
            document.getElementById('product-section')?.scrollIntoView({behavior:'smooth'}); 
          });
          list.appendChild(li);
        });
      }

      // Filters - deduplicate by product_name
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

      // On first load without a hash, show one product per collection with a View All button
      var h = window.location.hash || '';
      if (/^#(filter|collection|product)=/i.test(h)) {
        // Let navigation handler trigger loads
      } else {
        renderInitialPreview();
      }
    });
  }

  // Build SHOP dropdown menu from collection groups
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
        // Update URL based on filter type
        if (label === 'All') {
          history.pushState(null, '', '#filter=All');
        } else {
          history.pushState(null, '', '#collection=' + encodeURIComponent(label));
        }
        onClick(); 
        document.getElementById('product-section')?.scrollIntoView({behavior:'smooth'}); 
        document.querySelector('[data-navbar]')?.classList.remove('active'); 
        document.querySelector('[data-overlay]')?.classList.remove('active');
        // Close dropdown (desktop and mobile)
        document.querySelector('.navbar-item.has-dropdown')?.classList.remove('active');
      });
      li.appendChild(a);
      menu.appendChild(li);
    };
    makeItem('All', function(){ selectFilter('All'); });
    Object.keys(collectionGroups).forEach(function(title){ makeItem(title, function(){ selectGroup(title); }); });
  }

  function collectionCsvUrl(c){
    if (c.csv_url) return toPublishedCsv(c.csv_url);
    if (c.csv_gid) return toPublishedCsv(c.csv_gid);
    return null;
  }

  // Select a group by collection_name/title and merge all product sheets for that group
  function selectGroup(groupTitle){
    var plist = document.getElementById('product-list');
    if (!plist) return;
    var group = collectionGroups[groupTitle] || [];
    if (!group.length) { renderProducts([]); return; }
    // Serve from cache if available
    if (groupCache[groupTitle]) { renderProducts(groupCache[groupTitle]); return; }
    var merged = [];
    var left = group.length;
    group.forEach(function(c){
      // Use unique cache key combining product_name and csv_gid
      var cacheKey = c.name + '_' + (c.csv_gid || c.csv_url || '');
      if (productCache[cacheKey]) { merged = merged.concat(productCache[cacheKey]); if(--left===0){ groupCache[groupTitle]=merged; renderProducts(merged); } return; }
      plist.innerHTML = '';
      loadCsv(collectionCsvUrl(c), function(rows){
        var list = parseProducts(rows, c.title || c.name);
        productCache[cacheKey] = list;
        merged = merged.concat(list);
        if(--left===0){ groupCache[groupTitle]=merged; renderProducts(merged); }
      });
    });
  }
  // Expose globally for URL navigation
  window.selectGroup = selectGroup;

  function parseProducts(rows, collectionName){
    return rows.map(function(r, idx){
      var id = (r.sku || r.SKU || r.sku_id || r.id || r.ID || r.Id || String(idx+1)).toString().trim();
      return {
        id: id,
        name: collectionName || (r.name || r.Name || r.product || '').toString().trim(),
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
        insta_link: (r.insta_link || r.instaLink || r['insta link'] || r.instagram_link || '').toString().trim()
      };
    });
  }

  function rupee(n){
    var v = Number(String(n).replace(/[^0-9.-]+/g,'')) || 0; return '₹' + v.toFixed(2);
  }

  function renderProducts(list){
    var root = document.getElementById('product-list');
    if (!root) return;
    root.innerHTML = '';
    list.forEach(function(p){
      try { if (window.cdRegisterProduct) window.cdRegisterProduct(p); } catch(_) {}
      var imgs = tokenToImgs(p.images);
      var main = imgs[0] || './assets/images/product-1.jpg';
      var hasOffer = !!(p.offer_price && String(p.offer_price).trim() !== '' && Number(String(p.offer_price).replace(/[^0-9.-]+/g,'')) > 0);
      var priceHtml = hasOffer ? (rupee(p.offer_price) + ' <del>' + rupee(p.price) + '</del>') : rupee(p.price);
      var discHtml = '';
      if (hasOffer) {
        var base = Number(String(p.price).replace(/[^0-9.-]+/g,'')) || 0;
        var off = Number(String(p.offer_price).replace(/[^0-9.-]+/g,'')) || 0;
        if (base > 0 && off > 0 && off < base) {
          var pct = Math.round((1 - (off/base)) * 100);
          discHtml = '<div class="card-badge"> -' + pct + '%</div>';
        }
      }
      // Show card_badge on right top and sale_status below it
      var cardBadgeHtml = '';
      var saleStatusHtml = '';
      if (p.card_badge) {
        cardBadgeHtml = '<div class="card-badge-top">'+ p.card_badge +'</div>';
      }
      if (p.sale_status) {
        saleStatusHtml = '<div class="sale-status-badge">'+ p.sale_status +'</div>';
      }
      var li = document.createElement('li'); li.className = 'product-item';
      li.innerHTML = '\
      <div class="product-card" tabindex="0">\
        <figure class="card-banner">\
          <img src="'+ main +'" width="312" height="350" loading="lazy" alt="'+ (p.name || '') +'" class="image-contain">\
          '+ discHtml +'\
          '+ cardBadgeHtml +'\
          '+ saleStatusHtml +'\
          <button class="quick-view-btn" data-action="quick" aria-label="Quick View">Quick View</button>\
        </figure>\
        <div class="card-content">\
          <h3 class="h3 card-title">'+ (p.name || '') +'</h3>\
          <data class="card-price" value="'+ (hasOffer ? String(p.offer_price) : String(p.price)) +'">'+ priceHtml +'</data>\
        </div>\
      </div>';
      // Attach quick view action
      var btnQuick = li.querySelector('button[data-action="quick"]');
      if (btnQuick) btnQuick.addEventListener('click', function(){
        if (window.openProductDetail) window.openProductDetail(p.id);
      });
      root.appendChild(li);
    });
  }

  function selectFilter(label){
    hideViewAll();
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
      var left = pending.length; if (!left) { renderProducts([]); return; }
      pending.forEach(function(c){
        var cacheKey = c.name + '_' + (c.csv_gid || c.csv_url || '');
        if (productCache[cacheKey]) { merged = merged.concat(productCache[cacheKey]); if(--left===0) renderProducts(merged); return; }
        loadCsv(collectionCsvUrl(c), function(rows){ var list = parseProducts(rows, c.name); productCache[cacheKey] = list; merged = merged.concat(list); if(--left===0) renderProducts(merged); });
      });
    } else {
      // Find all collections with matching product_name
      var matchingCollections = collections.filter(function(x){ return x.name === label; });
      if (!matchingCollections.length) { renderProducts([]); return; }
      
      // Merge products from all matching collections
      var merged = [];
      var left = matchingCollections.length;
      matchingCollections.forEach(function(c){
        var cacheKey = c.name + '_' + (c.csv_gid || c.csv_url || '');
        if (productCache[cacheKey]) { 
          merged = merged.concat(productCache[cacheKey]); 
          if(--left===0) renderProducts(merged); 
          return; 
        }
        plist.innerHTML = '';
        loadCsv(collectionCsvUrl(c), function(rows){ 
          var list = parseProducts(rows, c.name); 
          productCache[cacheKey] = list; 
          merged = merged.concat(list); 
          if(--left===0) renderProducts(merged); 
        });
      });
    }
  }
  // Expose globally for URL navigation
  window.selectFilter = selectFilter;

  // INSTA
  function renderInsta(){
    var list = document.getElementById('insta-list');
    if (!list || !CFG.insta) return;
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
    });
  }

  // FOOTER
  function renderFooter(){
    if (!CFG.footer) return;
    loadCsv(CFG.footer, function(rows){
      if (!rows.length) return;
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
        // Mobile navbar socials
        var mSocial = document.getElementById('mobile-socials');
        if (mSocial) {
          mSocial.innerHTML = '';
          socialLinks.forEach(function(item){
            if (!item.href) return;
            var a = document.createElement('a');
            a.href = item.href; a.target = '_blank'; a.rel = 'noopener'; a.className = 'social-link';
            a.innerHTML = '<ion-icon name="'+ item.icon +'"></ion-icon>';
            a.addEventListener('click', function(){
              document.querySelector('[data-navbar]')?.classList.remove('active');
              document.querySelector('[data-overlay]')?.classList.remove('active');
            });
            mSocial.appendChild(a);
          });
        }
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
    });
  }

  // Init
  document.addEventListener('DOMContentLoaded', function(){
    renderCollections();
    renderInsta();
    renderFooter();
  });
})();
