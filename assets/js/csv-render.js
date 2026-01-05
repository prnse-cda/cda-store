/**
 * ============================================
 * CDA - CSV Content Renderer
 * ============================================
 * Dynamically loads and renders website content from Google Sheets CSV
 * 
 * Sections managed:
 * - HERO: Banner section with heading, images, CTA
 * - COLLECTIONS: Product collection cards with filters
 * - PRODUCTS: Product grid with lazy loading
 * - INSTA: Instagram feed section
 * - FOOTER: Footer links and information
 * 
 * Google Sheets Structure:
 * - Master CSV contains sheet mappings (s_id, s_gid, w_area)
 * - Each section has its own sheet (tab) with specific GID
 * - Published as CSV using File > Share > Publish to web
 * - URLs are dynamically constructed from master CSV
 */

(function(){
  // ============================================
  // Use configuration from config.js
  var MASTER_CSV_URL = window.MASTER_CSV_URL;
  var BRAND_NAME = window.BRAND_NAME;

  var CFG = {};
  var PUB_BASE = null; // Published base URL from master CSV
  var SHEET_ID = null; // Sheet ID from master CSV
  var isConfigLoaded = false;
  var configCallbacks = []; // Queue callbacks waiting for config
  var loadingStates = {
    master: false,
    hero: false,
    collections: false,
    insta: false,
    footer: false
  };
  var hasShownError = false;

  /**
   * Show error message to user
   */
  function showError(message) {
    if (hasShownError) return;
    hasShownError = true;
    
    var errorDiv = document.createElement('div');
    errorDiv.className = 'csv-load-error';
    errorDiv.innerHTML = '<div class="csv-error-content">' +
      '<ion-icon name="alert-circle-outline"></ion-icon>' +
      '<h3>Unable to Load Content</h3>' +
      '<p>' + message + '</p>' +
      '<button onclick="location.reload()" class="btn-retry">Retry</button>' +
      '</div>';
    document.body.appendChild(errorDiv);
    
    // Hide preloader if error occurs
    hidePreloader();
  }

  /**
   * Check if all critical sections are loaded
   */
  function checkAllLoaded() {
    var allLoaded = loadingStates.master && 
                    loadingStates.hero && 
                    loadingStates.collections && 
                    loadingStates.footer;
    
    if (allLoaded) {
      hidePreloader();
    }
  }

  /**
   * Hide preloader with fade out effect
   */
  function hidePreloader() {
    var preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('hidden');
      setTimeout(function() {
        preloader.style.display = 'none';
      }, 500);
    }
  }

  /**
   * Load and parse master CSV to get sheet configurations
   * Populates CFG object with dynamic URLs
   */
  function loadMasterConfig(callback) {
    if (isConfigLoaded) {
      callback();
      return;
    }
    
    // Queue callback if config is loading
    if (configCallbacks.length > 0) {
      configCallbacks.push(callback);
      return;
    }
    
    configCallbacks.push(callback);
    
    if (typeof Papa === 'undefined') {
      console.error('PapaParse library missing - required for CSV parsing');
      showError('Required library failed to load. Please check your internet connection and try again.');
      executeConfigCallbacks();
      return;
    }
    
    Papa.parse(MASTER_CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(res) {
        var rows = res.data || [];
        
        if (rows.length === 0) {
          console.error('Master CSV is empty');
          showError('Configuration data is missing. Please contact support.');
          executeConfigCallbacks();
          return;
        }
        
        // Build dynamic configuration from master CSV
        rows.forEach(function(row) {
          var sId = (row.s_id || '').trim();
          var sGid = (row.s_gid || '').trim();
          var wArea = (row.w_area || '').trim().toLowerCase();
          
          if (sId && sGid && wArea) {
            // Construct published CSV URL
            var url = 'https://docs.google.com/spreadsheets/d/e/' + sId + '/pub?gid=' + sGid + '&single=true&output=csv';
            CFG[wArea] = url;
            
            // Set base URL for constructing other URLs (use first s_id)
            if (!PUB_BASE) {
              PUB_BASE = 'https://docs.google.com/spreadsheets/d/e/' + sId + '/pub?single=true&output=csv&gid=';
              SHEET_ID = sId;
            }
          }
        });
        
        // Expose for backwards compatibility
        window.CDA_CSV_CONFIG = CFG;
        window.CDA_PUB_BASE = PUB_BASE;
        window.CDA_SHEET_ID = SHEET_ID;
        
        loadingStates.master = true;
        isConfigLoaded = true;
        executeConfigCallbacks();
        checkAllLoaded();
      },
      error: function(err) {
        console.error('Failed to load master CSV configuration:', err);
        showError('Unable to connect to data source. Please check your internet connection and try again.');
        executeConfigCallbacks();
      }
    });
  }
  
  /**
   * Execute all queued callbacks waiting for config
   */
  function executeConfigCallbacks() {
    isConfigLoaded = true;
    configCallbacks.forEach(function(cb) { cb(); });
    configCallbacks = [];
  }

  /**
   * Convert various URL formats to published CSV URL
   * Supports: Full URLs, edit URLs with GID, or just GID number
   * @param {string} urlOrGid - URL or GID to convert
   * @returns {string} Published CSV URL
   */
  function toPublishedCsv(urlOrGid){
    if (!urlOrGid) return null;
    var s = String(urlOrGid).trim();
    
    // Already a published CSV URL
    if (/output=csv/i.test(s) && /\/pub\?/.test(s)) return s;
    
    // Full edit URL with /d/<id>/edit?gid=123
    var m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    var gidM = s.match(/[?&]gid=(\d+)/);
    if (m && gidM) {
      return "https://docs.google.com/spreadsheets/d/" + m[1] + "/pub?gid=" + gidM[1] + "&single=true&output=csv";
    }
    
    // Just GID number - use published base or fallback to sheet ID
    if (/^\d+$/.test(s)) {
      if (PUB_BASE) return PUB_BASE + s;
      if (SHEET_ID) return "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/pub?gid=" + s + "&single=true&output=csv";
    }
    
    return s; // Return as-is if no pattern matches
  }

  /**
   * Load CSV Data using PapaParse Library
   * @param {string} url - CSV URL to fetch
   * @param {function} cb - Callback function with parsed data array
   */
  function loadCsv(url, cb){
    if (!url) return cb([]);
    if (typeof Papa === 'undefined') { 
      console.error('PapaParse library missing - required for CSV parsing'); 
      cb([]); 
      return; 
    }
    Papa.parse(toPublishedCsv(url), { 
      download: true, 
      header: true, 
      skipEmptyLines: true, 
      complete: function(res){ cb(res.data || []); }, 
      error: function(err){ 
        console.error('CSV load error:', err);
        cb([]); 
      } 
    });
  }

  /**
   * NOTE: Drive utility functions (extractDriveId, driveThumb, tokenToImgs)
   * are now loaded from utils.js and available globally
   */
  var extractDriveId = window.extractDriveId || window.CDA.extractDriveId;
  var driveThumb = window.driveThumb || window.CDA.driveThumb;
  var tokenToImgs = window.tokenToImgs || window.CDA.tokenToImgs;

  // HERO
  function renderHero(){
    var el = document.getElementById('hero-section');
    if (!el || !CFG.hero) {
      loadingStates.hero = true;
      checkAllLoaded();
      return;
    }
    loadCsv(CFG.hero, function(rows){
      if (!rows.length) {
        console.warn('Hero section data is empty');
        loadingStates.hero = true;
        checkAllLoaded();
        return;
      }
      var r = rows[0];
      
      // Update navbar brand text with configured brand name
      var navBrand = document.querySelector('.navbar-brand-text');
      if (navBrand) navBrand.textContent = BRAND_NAME;
      
      // Update page title
      var pageTitle = document.querySelector('title');
      if (pageTitle && pageTitle.textContent.includes('•')) {
        var parts = pageTitle.textContent.split('•');
        pageTitle.textContent = parts[0].trim() + ' • ' + BRAND_NAME;
      } else if (pageTitle) {
        pageTitle.textContent = BRAND_NAME;
      }
      
      // Parse hero images (can be multiple, comma-separated)
      var imgTok = r.hero_image || r.image || r.image_id || '';
      var heroImages = tokenToImgs(imgTok);
      
      // Create carousel if multiple images, otherwise single image
      if (heroImages.length > 1) {
        createHeroCarousel(el, heroImages);
      } else if (heroImages.length === 1) {
        el.style.backgroundImage = 'url("' + heroImages[0] + '")';
      }
      
      // Hide text elements (user will add text to hero images)
      var tEl = document.getElementById('hero-title'); 
      if (tEl) tEl.style.display = 'none';
      var sEl = document.getElementById('hero-text'); 
      if (sEl) sEl.style.display = 'none';
      
      // Keep Shop Now button with scroll functionality
      var cta = document.getElementById('hero-cta');
      if (cta) {
        cta.addEventListener('click', function(){
          document.getElementById('product-section')?.scrollIntoView({behavior:'smooth'});
        });
      }
      
      loadingStates.hero = true;
      checkAllLoaded();
    });
  }

  // Create hero carousel for multiple images
  function createHeroCarousel(container, images) {
    // Remove existing background
    container.style.backgroundImage = '';
    
    // Create carousel container if not exists
    var carouselId = 'hero-carousel';
    var carousel = document.getElementById(carouselId);
    if (!carousel) {
      carousel = document.createElement('div');
      carousel.id = carouselId;
      carousel.className = 'hero-carousel';
      container.insertBefore(carousel, container.firstChild);
    }
    
    // Clear existing slides
    carousel.innerHTML = '';
    
    // Create slides
    images.forEach(function(img, idx) {
      var slide = document.createElement('div');
      slide.className = 'hero-slide' + (idx === 0 ? ' active' : '');
      slide.style.backgroundImage = 'url("' + img + '")';
      carousel.appendChild(slide);
    });
    
    // Create navigation dots
    var dotsContainer = document.createElement('div');
    dotsContainer.className = 'hero-dots';
    images.forEach(function(img, idx) {
      var dot = document.createElement('button');
      dot.className = 'hero-dot' + (idx === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Go to slide ' + (idx + 1));
      dot.addEventListener('click', function() {
        goToSlide(idx);
      });
      dotsContainer.appendChild(dot);
    });
    carousel.appendChild(dotsContainer);
    
    // Auto-rotate slides
    var currentSlide = 0;
    var autoRotate = setInterval(function() {
      currentSlide = (currentSlide + 1) % images.length;
      goToSlide(currentSlide);
    }, 5000); // Change every 5 seconds
    
    function goToSlide(index) {
      currentSlide = index;
      var slides = carousel.querySelectorAll('.hero-slide');
      var dots = carousel.querySelectorAll('.hero-dot');
      
      slides.forEach(function(slide, idx) {
        if (idx === index) {
          slide.classList.add('active');
        } else {
          slide.classList.remove('active');
        }
      });
      
      dots.forEach(function(dot, idx) {
        if (idx === index) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }
    
    // Pause on hover
    carousel.addEventListener('mouseenter', function() {
      clearInterval(autoRotate);
    });
    
    carousel.addEventListener('mouseleave', function() {
      autoRotate = setInterval(function() {
        currentSlide = (currentSlide + 1) % images.length;
        goToSlide(currentSlide);
      }, 5000);
    });
  }

  // COLLECTIONS + FILTERS + PRODUCTS (lazy)
  var collections = [];
  var collectionGroups = {}; // title (collection_name) -> array of collection rows
  var productCache = {}; // product_name -> array of products
  var groupCache = {}; // group title -> merged array of products

  function renderCollections(){
    var list = document.getElementById('collection-list');
    var filters = document.getElementById('filter-list');
    var plist = document.getElementById('product-list');
    var menu = document.getElementById('shop-submenu');
    
    // Always populate shop menu if it exists (for navbar on all pages including policy pages)
    if (!CFG.collections) {
      loadingStates.collections = true;
      checkAllLoaded();
      return;
    }
    
    loadCsv(CFG.collections, function(rows){
      if (!rows.length) {
        console.warn('Collections data is empty');
        loadingStates.collections = true;
        checkAllLoaded();
        return;
      }
      
      collections = rows.map(function(r){
        return {
          // Filter/display label for pills
          name: (r.product_name_list || r.product_name || r.product || r.name || r.collection || r.collection_name || '').toString().trim(),
          // Card title overlay text (prefer collection_name)
          title: (r.collection_name || r.collection || r.name || r.product_name_list || r.product_name || '').toString().trim(),
          priority: Number(r.collection_priority || r.priority || r.Priority || 0) || 0,
          image: (r.image || r.image_id || r.collection_image || ''),
          csv_gid: (r.csv_gid || r.gid || '').toString().trim(),
          csv_url: (r.csv_url || '').toString().trim()
        };
      }).filter(function(c){ return !!c.name; });
      collections.sort(function(a,b){ return (a.priority||0) - (b.priority||0); });

      // Build groups by collection_name/title
      collectionGroups = {};
      collections.forEach(function(c){
        var key = c.title || c.name;
        if (!key) return;
        if (!collectionGroups[key]) collectionGroups[key] = [];
        collectionGroups[key].push(c);
      });

      // Render Shop submenu from groups (works on all pages)
      renderShopMenu();
      
      // Skip the rest if we're not on a page with product display elements
      if (!list || !filters || !plist) return;

      // Cards - render only one card per unique collection_name
      list.innerHTML = '';
      var renderedCollections = {};
      collections.forEach(function(c){
        var collectionKey = c.title || c.name;
        // Skip if we already rendered this collection
        if (renderedCollections[collectionKey]) return;
        renderedCollections[collectionKey] = true;
        
        var bg = (function(){ var id = extractDriveId(c.image); return id ? driveThumb(id, 1000) : (c.image || ''); })();
        var li = document.createElement('li');
        li.innerHTML = '<div class="collection-card" style="background-image:url(\''+ (bg || './assets/images/collection-1.jpg') +'\')">\
          <h3 class="h4 card-title">'+ (c.title || c.name) +'</h3>\
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

      // Auto-select All after initial render for a better first view (still lazy-loads per collection)
      setTimeout(function(){ try { selectFilter('All'); } catch(_){} }, 0);
      
      loadingStates.collections = true;
      checkAllLoaded();
    });
  }

  // Build SHOP dropdown menu from collection groups
  function renderShopMenu(){
    var menu = document.getElementById('shop-submenu');
    if (!menu) return;
    menu.innerHTML = '';
    
    // Detect if we're on a policy page (in policies/ subfolder)
    var isPolicyPage = window.location.pathname.includes('/policies/');
    var baseUrl = isPolicyPage ? '../index.html' : '';
    
    var makeItem = function(label, onClick){
      var li = document.createElement('li');
      li.className = 'dropdown-item';
      var a = document.createElement('a');
      a.textContent = label;
      
      if (isPolicyPage) {
        // On policy pages, navigate to main page with hash
        if (label === 'All') {
          a.href = baseUrl + '#filter=All';
        } else {
          a.href = baseUrl + '#collection=' + encodeURIComponent(label);
        }
      } else {
        // On main page, use hash navigation and scroll
        a.href = '#';
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
      }
      
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
    
    // Show loading skeletons while fetching
    if (window.showLoadingSkeletons) {
      window.showLoadingSkeletons();
    }
    
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
      var id = (r.id || r.ID || r.Id || String(idx+1)).toString().trim();
      var hasReview = (r.review || '').toString().toLowerCase();
      hasReview = hasReview === 'true' || hasReview === '1' || hasReview === 'yes';
      return {
        id: id,
        name: (r.name || r.Name || r.product_name || r.product || collectionName || '').toString().trim(),
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
        fabric_product_id: (r.fabric_product_id || r.fabricProductId || r['fabric product id'] || '').toString().trim(),
        review: hasReview,
        rating: hasReview ? parseFloat(r.rating || 0) : 0,
        review_text: hasReview ? (r.review_text || '').toString().trim() : '',
        customer_name: hasReview ? (r.customer_name || '').toString().trim() : '',
        review_date: hasReview ? (r.date || '').toString().trim() : ''
      };
    });
  }

  function rupee(n){
    var v = Number(String(n).replace(/[^0-9.-]+/g,'')) || 0; return '₹' + v.toFixed(2);
  }

  /**
   * Render products to the grid
   * @param {Array} list - Array of product objects
   * @param {Object} options - Rendering options
   * @param {number} options.limit - Maximum number of products to show (optional)
   * @param {Array} options.previewList - Specific products to show in preview (optional)
   * @param {boolean} options.showViewAll - Show "View All" button when limited (optional)
   */
  function renderProducts(list, options){
    options = options || {};
    var root = document.getElementById('product-list');
    if (!root) return;
    root.innerHTML = '';
    
    var displayList = list;
    var isLimited = false;
    
    // Use preview list if provided (one per category), otherwise apply limit
    if (options.previewList && options.previewList.length > 0) {
      displayList = options.previewList;
      isLimited = displayList.length < list.length;
    } else if (options.limit && list.length > options.limit) {
      displayList = list.slice(0, options.limit);
      isLimited = true;
    }
    
    displayList.forEach(function(p){
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
      // Star rating display if review is TRUE
      var ratingHtml = '';
      if (p.review && p.rating > 0) {
        var stars = '';
        var rating = p.rating;
        for (var i = 1; i <= 5; i++) {
          if (i <= Math.floor(rating)) {
            stars += '<ion-icon name="star"></ion-icon>';
          } else if (i - 0.5 <= rating) {
            stars += '<ion-icon name="star-half"></ion-icon>';
          } else {
            stars += '<ion-icon name="star-outline"></ion-icon>';
          }
        }
        ratingHtml = '<div class="product-rating">' + stars + ' <span>' + rating.toFixed(1) + '</span></div>';
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
          '+ ratingHtml +'\
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
    
    // Add "View All Products" button if limited and option is set
    if (isLimited && options.showViewAll) {
      var li = document.createElement('li');
      li.className = 'product-item view-all-item';
      li.innerHTML = '\
      <div class="view-all-card">\
        <div class="view-all-content">\
          <ion-icon name="apps-outline"></ion-icon>\
          <h3>View All Products</h3>\
          <p>See all ' + list.length + ' products</p>\
          <button class="btn btn-primary view-all-btn">View All</button>\
        </div>\
      </div>';
      
      var btn = li.querySelector('.view-all-btn');
      btn.addEventListener('click', function(){
        renderProducts(list); // Show all products without limit
      });
      root.appendChild(li);
    }
  }

  function selectFilter(label){
    var filters = document.getElementById('filter-list');
    var plist = document.getElementById('product-list');
    if (!filters || !plist) return;
    // Active state
    filters.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.toggle('active', b.textContent === label); });
    // Load
    if (label === 'All') {
      // fetch all (lazy) then merge - show one item per category initially
      var pending = collections.slice();
      var merged = [];
      var left = pending.length; if (!left) { renderProducts([]); return; }
      pending.forEach(function(c){
        var cacheKey = c.name + '_' + (c.csv_gid || c.csv_url || '');
        if (productCache[cacheKey]) { 
          merged = merged.concat(productCache[cacheKey]); 
          if(--left===0) {
            // Show one product per unique category/collection
            var seenCategories = {};
            var representative = [];
            merged.forEach(function(p){
              if (!seenCategories[p.category]) {
                seenCategories[p.category] = true;
                representative.push(p);
              }
            });
            renderProducts(merged, {limit: representative.length, previewList: representative, showViewAll: true});
          }
          return; 
        }
        loadCsv(collectionCsvUrl(c), function(rows){ 
          var list = parseProducts(rows, c.name); 
          productCache[cacheKey] = list; 
          merged = merged.concat(list); 
          if(--left===0) {
            // Show one product per unique category/collection
            var seenCategories = {};
            var representative = [];
            merged.forEach(function(p){
              if (!seenCategories[p.category]) {
                seenCategories[p.category] = true;
                representative.push(p);
              }
            });
            renderProducts(merged, {limit: representative.length, previewList: representative, showViewAll: true});
          }
        });
      });
    } else {
      // Find all collections with matching product_name - show all products (no limit)
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
        // Basic URL validation
        if (link !== '#' && !link.match(/^https?:\/\//)) {
          link = '#';
        }
        
        var li = document.createElement('li'); 
        li.className = 'insta-post-item';
        
        // Get background image from image_id column
        var imgs = tokenToImgs(r.image_id || r.image || '');
        var bgSrc = imgs[0] || './assets/images/insta-1.jpg';
        
        var linkEl = document.createElement('a');
        linkEl.href = link;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener';
        linkEl.className = 'insta-card-link';
        
        var bgDiv = document.createElement('div');
        bgDiv.className = 'insta-bg';
        bgDiv.style.backgroundImage = 'url(' + bgSrc + ')';
        linkEl.appendChild(bgDiv);
        
        var overlay = document.createElement('div');
        overlay.className = 'insta-overlay';
        overlay.innerHTML = '<ion-icon name="logo-instagram"></ion-icon><span>View this post on Instagram</span>';
        linkEl.appendChild(overlay);
        
        li.appendChild(linkEl);
        list.appendChild(li);
      });
    });
  }

  // FOOTER
  function renderFooter(){
    if (!CFG.footer) {
      loadingStates.footer = true;
      checkAllLoaded();
      return;
    }
    loadCsv(CFG.footer, function(rows){
      if (!rows.length) {
        console.warn('Footer data is empty');
        loadingStates.footer = true;
        checkAllLoaded();
        return;
      }
      var r = rows[0];
      
      // Set global brand name and WhatsApp from CSV (CSV can override config.js values)
      if (r.brand_name && r.brand_name.toString().trim()) {
        window.BRAND_NAME = r.brand_name.toString().trim();
      }
      
      // Update all brand name elements on page
      var navBrand = document.querySelector('.navbar-brand-text');
      if (navBrand) navBrand.textContent = window.BRAND_NAME;
      
      var pageTitle = document.querySelector('title');
      if (pageTitle) {
        pageTitle.textContent = window.BRAND_NAME + ' - Online Shopping';
      }
      
      var footerBrands = document.querySelectorAll('.footer-brand-name');
      footerBrands.forEach(function(el) {
        el.textContent = window.BRAND_NAME + '™';
      });
      
      if (r.whatsapp) {
        var waDigits = r.whatsapp.toString().replace(/[^0-9]/g, '');
        if (waDigits) window.WHATSAPP_NUMBER = waDigits;
      }
      
      // Update floating WhatsApp button with number from CSV
      var floatingWhatsApp = document.querySelector('.floating-whatsapp');
      if (floatingWhatsApp && window.WHATSAPP_NUMBER) {
        var waText = encodeURIComponent("Hello, " + window.BRAND_NAME);
        floatingWhatsApp.href = 'https://wa.me/' + window.WHATSAPP_NUMBER + '?text=' + waText;
      }
      
      // Socials (instagram, facebook, whatsapp from CSV)
      var social = document.getElementById('footer-social-list');
      if (social) {
        var waNumRaw = (r.whatsapp || '').toString();
        var waDigits = waNumRaw.replace(/[^0-9]/g, '');
        var waText = encodeURIComponent("Hello, " + BRAND_NAME);
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
      var addr = document.querySelector('#footer-address .footer-link-text');
      if (addr) addr.textContent = (r.address || '').toString();
      var phoneA = document.getElementById('footer-phone');
      if (phoneA) {
        var waNum = (r.whatsapp || '').toString();
        var waDigits = waNum.replace(/[^0-9]/g, '');
        var waText2 = encodeURIComponent("Hello, " + BRAND_NAME);
        phoneA.href = waDigits ? ('https://wa.me/' + waDigits + '?text=' + waText2) : '#';
        phoneA.target = '_blank';
        phoneA.rel = 'noopener';
        var s = phoneA.querySelector('.footer-link-text'); if (s) s.textContent = waNum;
      }
      var mailA = document.getElementById('footer-email');
      if (mailA) { var em = (r.email || '').toString(); mailA.href = em ? ('mailto:'+em) : '#'; var s2 = mailA.querySelector('.footer-link-text'); if (s2) s2.textContent = em; }
      
      // Policy pages contact (reuse same data)
      var policyEmail = document.getElementById('policy-email');
      if (policyEmail) { var em = (r.email || '').toString(); if (em) policyEmail.textContent = em; }
      var policyWhatsapp = document.getElementById('policy-whatsapp');
      if (policyWhatsapp) { var wa = (r.whatsapp || '').toString(); if (wa) policyWhatsapp.textContent = wa; }
      
      loadingStates.footer = true;
      checkAllLoaded();
    });
  }

  // Init - Load master config first, then render all sections
  document.addEventListener('DOMContentLoaded', function(){
    // Always set navbar brand name (on all pages)
    var navBrand = document.querySelector('.navbar-brand-text');
    if (navBrand) navBrand.textContent = BRAND_NAME;
    
    loadMasterConfig(function() {
      renderHero();
      renderCollections();
      renderInsta();
      renderFooter();
    });
  });
})();
