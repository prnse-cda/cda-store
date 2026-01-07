// store.js - Product detail modal and cart management
// Responsibilities:
// - Maintain product registry from CSV rows (via window.cdRegisterProduct)
// - Render and manage a product detail modal with size selection and share
// - Provide a lightweight cart (add/remove/clear, badge, overlay) and WhatsApp checkout
(() => {
  let PRODUCTS = {};
  let cart = [];

  /** Register product objects as they are parsed from CSV */
  window.cdRegisterProduct = function(product) {
    if (product && product.id) {
      PRODUCTS[product.id] = product;
    }
  };

  // Utility to extract Drive IDs and create image URLs
  function extractDriveId(token) {
    if (!token) return null;
    const s = String(token).trim();
    if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]{20,})/,
      /[?&]id=([a-zA-Z0-9_-]{20,})/
    ];
    for (let i = 0; i < patterns.length; i++) {
      const m = s.match(patterns[i]);
      if (m && m[1]) return m[1];
    }
    return null;
  }

  function driveThumb(id, size) {
    return `https://drive.google.com/thumbnail?id=${id}&sz=w${size || 800}`;
  }

  function tokenToImgs(token) {
    if (!token) return [];
    return String(token).split(/[,;]/).map(s => s.trim()).filter(Boolean).map(t => {
      const id = extractDriveId(t);
      return id ? driveThumb(id, 800) : t;
    });
  }

  /** Create the product detail modal structure and styles */
  function createProductModal() {
    const modalHTML = `
      <div id="product-detail-modal" class="product-modal-overlay" style="display:none;">
        <div class="product-modal-container">
          <button class="product-modal-close" aria-label="Close">&times;</button>
          <div class="product-modal-content">
            <div class="product-modal-left">
              <div class="product-image-main">
                <img id="product-main-image" src="" alt="Product Image">
              </div>
              <div class="product-image-thumbs" id="product-thumbs"></div>
            </div>
            <div class="product-modal-right">
              <h1 class="product-modal-title" id="product-modal-title"></h1>
              <div class="product-modal-price" id="product-modal-price"></div>
              <div class="product-modal-description" id="product-modal-description"></div>
              <div class="product-modal-sizes" id="product-modal-sizes">
                <label>Select Size:</label>
                <div class="size-options" id="size-options"></div>
              </div>
              <div class="product-quantity-selector">
                <label>Quantity:</label>
                <div class="quantity-controls">
                  <button class="qty-btn" id="qty-minus">-</button>
                  <input type="text" id="qty-input" value="1" readonly>
                  <button class="qty-btn" id="qty-plus">+</button>
                </div>
              </div>
              <div class="product-modal-actions">
                <button class="btn-add-cart" id="btn-add-cart">
                  <ion-icon name="cart-outline"></ion-icon> Add to Cart
                </button>
                <button class="btn-share" id="btn-share" title="Share this product">
                  <ion-icon name="share-social-outline"></ion-icon> Share
                </button>
              </div>
              <div class="product-helper-links">
                <a href="#" class="helper-link" id="size-chart-link">
                  <i class="fas fa-ruler"></i> Find your size
                </a>
                <a href="#" class="helper-link" id="return-policy-link">
                  Return Policy
                </a>
                <a href="#" class="helper-link" id="ask-question-link">
                  <i class="fas fa-question-circle"></i> Ask a Question
                </a>
                <a href="#" class="helper-link" id="insta-link" style="display:none;" target="_blank" rel="noopener">
                  <i class="fab fa-instagram"></i> View on Instagram
                </a>
                <a href="#" class="helper-link" id="fabric-link" style="display:none;">
                  <i class="fas fa-link"></i> View this Fabric
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="size-chart-overlay" class="size-chart-overlay" style="display:none;">
        <div class="size-chart-container">
          <button class="size-chart-close" aria-label="Close">&times;</button>
          <img src="./assets/images/size-chart.png" alt="Size Chart">
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add styles
    const styles = `
      <style>
        .product-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 10000;
          overflow-y: auto;
          padding: 20px;
        }

        .product-modal-container {
          background: white;
          max-width: 1200px;
          margin: 40px auto;
          border-radius: 8px;
          position: relative;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .product-modal-close {
          position: absolute;
          top: 15px;
          right: 15px;
          background: white;
          border: 1px solid #ddd;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 28px;
          cursor: pointer;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }

        .product-modal-close:hover {
          background: #f5f5f5;
          transform: rotate(90deg);
        }

        .product-modal-content {
          display: flex;
          gap: 40px;
          padding: 60px 40px 40px;
        }

        .product-modal-left {
          flex: 1;
          max-width: 500px;
        }

        .product-image-main {
          width: 100%;
          background: #f8f8f8;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 15px;
        }

        .product-image-main img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: contain;
          min-height: 400px;
        }

        .product-image-thumbs {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 10px 0;
        }

        .product-thumb {
          width: 80px;
          height: 80px;
          border: 2px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          flex-shrink: 0;
          overflow: hidden;
          transition: border-color 0.3s;
        }

        .product-thumb:hover,
        .product-thumb.active {
          border-color: #EC7FA9;
        }

        .product-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-modal-right {
          flex: 1;
        }

        .product-modal-title {
          font-size: 2.4rem;
          font-weight: 600;
          margin-bottom: 15px;
          color: #BE5985;
        }

        .product-modal-price {
          font-size: 2.8rem;
          font-weight: 700;
          color: #BE5985;
          margin-bottom: 20px;
        }

        .product-modal-price del {
          font-size: 2rem;
          color: #FFB8E0;
          margin-left: 15px;
          font-weight: 400;
        }

        .product-modal-price .discount-badge {
          display: inline-block;
          background: #EC7FA9;
          color: white;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 1.4rem;
          margin-left: 10px;
          font-weight: 600;
        }

        .product-modal-description {
          font-size: 1.5rem;
          line-height: 1.6;
          color: #BE5985;
          margin-bottom: 25px;
          padding: 15px;
          background: #FFEDFA;
          border-radius: 6px;
        }

        .product-modal-sizes {
          margin-bottom: 30px;
        }

        .product-modal-sizes label {
          display: block;
          font-size: 1.6rem;
          font-weight: 600;
          margin-bottom: 12px;
          color: #333;
        }

        .size-options {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .size-option {
          align-items: center;
          appearance: none;
          background-color: #fff;
          border-radius: 24px;
          border-style: none;
          box-shadow: rgba(0, 0, 0, .2) 0 3px 5px -1px, rgba(0, 0, 0, .14) 0 6px 10px 0, rgba(0, 0, 0, .12) 0 1px 18px 0;
          box-sizing: border-box;
          color: #3c4043;
          cursor: pointer;
          display: inline-flex;
          fill: currentcolor;
          font-family: 'Funnel Sans', 'Nunito Sans', 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 500;
          height: 48px;
          justify-content: center;
          letter-spacing: .25px;
          line-height: normal;
          overflow: visible;
          padding: 2px 24px;
          text-align: center;
          text-transform: none;
          transition: box-shadow 280ms cubic-bezier(.4, 0, .2, 1), opacity 15ms linear 30ms, transform 270ms cubic-bezier(0, 0, .2, 1) 0ms;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
          width: auto;
          will-change: transform, opacity;
        }

        .size-option:hover {
          background: #FFB8E0;
          color: #BE5985;
          box-shadow: rgba(60, 64, 67, .3) 0 2px 3px 0, rgba(60, 64, 67, .15) 0 6px 10px 4px;
        }

        .size-option:not(:disabled) {
          box-shadow: rgba(60, 64, 67, .3) 0 1px 3px 0, rgba(60, 64, 67, .15) 0 4px 8px 3px;
        }

        .size-option.selected {
          background: #BE5985;
          color: white;
          box-shadow: rgba(23, 78, 166, .3) 0 2px 3px 0, rgba(23, 78, 166, .15) 0 6px 10px 4px;
        }

        .product-quantity-selector {
          margin-bottom: 25px;
        }

        .product-quantity-selector label {
          display: block;
          font-size: 1.6rem;
          font-weight: 600;
          margin-bottom: 12px;
          color: #333;
        }

        .quantity-controls {
          display: inline-flex;
          align-items: center;
          border: 1px solid #ddd;
          border-radius: 6px;
          overflow: hidden;
        }

        .qty-btn {
          width: 40px;
          height: 40px;
          border: none;
          background: #f5f5f5;
          cursor: pointer;
          font-size: 1.8rem;
          font-weight: 600;
          color: #333;
          transition: background 0.2s;
        }

        .qty-btn:hover {
          background: #FFB8E0;
        }

        #qty-input {
          width: 50px;
          height: 40px;
          border: none;
          text-align: center;
          font-size: 1.6rem;
          font-weight: 600;
          background: white;
        }

        .product-modal-actions {
          display: flex;
          gap: 15px;
        }

        .btn-add-cart {
          flex: 1;
          align-items: center;
          appearance: none;
          background-color: #fff;
          border-radius: 24px;
          border-style: none;
          box-shadow: rgba(0, 0, 0, .2) 0 3px 5px -1px, rgba(0, 0, 0, .14) 0 6px 10px 0, rgba(0, 0, 0, .12) 0 1px 18px 0;
          box-sizing: border-box;
          color: #3c4043;
          cursor: pointer;
          display: inline-flex;
          fill: currentcolor;
          font-family: 'Funnel Sans', 'Nunito Sans', 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 500;
          height: 48px;
          justify-content: center;
          letter-spacing: .25px;
          line-height: normal;
          max-width: 100%;
          overflow: visible;
          padding: 2px 24px;
          text-align: center;
          text-transform: none;
          transition: box-shadow 280ms cubic-bezier(.4, 0, .2, 1), opacity 15ms linear 30ms, transform 270ms cubic-bezier(0, 0, .2, 1) 0ms;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
          width: auto;
          will-change: transform, opacity;
          gap: 10px;
        }

        .btn-add-cart:hover {
          background: #FFB8E0;
          color: #BE5985;
          box-shadow: rgba(60, 64, 67, .3) 0 2px 3px 0, rgba(60, 64, 67, .15) 0 6px 10px 4px;
        }

        .btn-add-cart:focus {
          outline: none;
          border: 2px solid #EC7FA9;
          box-shadow: rgba(60, 64, 67, .3) 0 1px 3px 0, rgba(60, 64, 67, .15) 0 4px 8px 3px;
        }

        .btn-add-cart:active {
          box-shadow: 0 4px 4px 0 rgb(60 64 67 / 30%), 0 8px 12px 6px rgb(60 64 67 / 15%);
        }

        .btn-add-cart:not(:disabled) {
          box-shadow: rgba(60, 64, 67, .3) 0 1px 3px 0, rgba(60, 64, 67, .15) 0 4px 8px 3px;
        }

        .btn-add-cart:not(:disabled):hover {
          box-shadow: rgba(60, 64, 67, .3) 0 2px 3px 0, rgba(60, 64, 67, .15) 0 6px 10px 4px;
        }

        .btn-add-cart ion-icon {
          font-size: 2.2rem;
        }

        .btn-share {
          align-items: center;
          appearance: none;
          background-color: #fff;
          border-radius: 24px;
          border-style: none;
          box-shadow: rgba(0, 0, 0, .2) 0 3px 5px -1px, rgba(0, 0, 0, .14) 0 6px 10px 0, rgba(0, 0, 0, .12) 0 1px 18px 0;
          box-sizing: border-box;
          color: #3c4043;
          cursor: pointer;
          display: inline-flex;
          fill: currentcolor;
          font-family: 'Funnel Sans', 'Nunito Sans', 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 500;
          height: 48px;
          justify-content: center;
          letter-spacing: .25px;
          line-height: normal;
          overflow: visible;
          padding: 2px 24px;
          text-align: center;
          text-transform: none;
          transition: box-shadow 280ms cubic-bezier(.4, 0, .2, 1), opacity 15ms linear 30ms, transform 270ms cubic-bezier(0, 0, .2, 1) 0ms;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
          width: auto;
          will-change: transform, opacity;
          gap: 10px;
        }

        .btn-share:hover {
          background: #FFB8E0;
          color: #BE5985;
          box-shadow: rgba(60, 64, 67, .3) 0 2px 3px 0, rgba(60, 64, 67, .15) 0 6px 10px 4px;
        }

        .btn-share:focus {
          outline: none;
          border: 2px solid #EC7FA9;
          box-shadow: rgba(60, 64, 67, .3) 0 1px 3px 0, rgba(60, 64, 67, .15) 0 4px 8px 3px;
        }

        .btn-share:active {
          box-shadow: 0 4px 4px 0 rgb(60 64 67 / 30%), 0 8px 12px 6px rgb(60 64 67 / 15%);
        }

        .btn-share:not(:disabled) {
          box-shadow: rgba(60, 64, 67, .3) 0 1px 3px 0, rgba(60, 64, 67, .15) 0 4px 8px 3px;
        }

        .btn-share:not(:disabled):hover {
          box-shadow: rgba(60, 64, 67, .3) 0 2px 3px 0, rgba(60, 64, 67, .15) 0 6px 10px 4px;
        }

        .btn-share ion-icon {
          font-size: 2.2rem;
        }

        .product-helper-links {
          margin-top: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          padding-top: 15px;
          border-top: 1px solid #e0e0e0;
        }

        .helper-link {
          font-size: 1.4rem;
          color: #BE5985;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: color 0.2s;
        }

        .helper-link:hover {
          color: #EC7FA9;
          text-decoration: underline;
        }

        .helper-link i {
          font-size: 1.6rem;
        }

        .size-chart-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .size-chart-container {
          position: relative;
          max-width: 90%;
          max-height: 90%;
        }

        .size-chart-container img {
          max-width: 100%;
          max-height: 90vh;
          object-fit: contain;
        }

        .size-chart-close {
          position: absolute;
          top: -40px;
          right: 0;
          background: white;
          border: none;
          width: 35px;
          height: 35px;
          border-radius: 50%;
          font-size: 24px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .size-chart-close:hover {
          background: #f5f5f5;
          transform: rotate(90deg);
        }

        @media (max-width: 768px) {
          .product-modal-content {
            flex-direction: column;
            padding: 50px 20px 20px;
          }

          .product-modal-left {
            max-width: 100%;
          }

          .product-modal-title {
            font-size: 2rem;
          }

          .product-modal-price {
            font-size: 2.2rem;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /** Open product detail modal for a given product id; optionally preselect a size */
  window.openProductDetail = function(productId, preselectedSize) {
    const product = PRODUCTS[productId];
    if (!product) return;

    // Create modal if it doesn't exist
    if (!document.getElementById('product-detail-modal')) {
      createProductModal();
    }

    const modal = document.getElementById('product-detail-modal');
    const mainImage = document.getElementById('product-main-image');
    const thumbsContainer = document.getElementById('product-thumbs');
    const title = document.getElementById('product-modal-title');
    const priceEl = document.getElementById('product-modal-price');
    const description = document.getElementById('product-modal-description');
    const sizeOptions = document.getElementById('size-options');

    // Set product data
    title.textContent = product.name || '';
    description.textContent = product.description || 'No description available';

    // Price display
    const hasOffer = product.offer_price && product.offer_price !== '0' && product.offer_price !== '';
    let priceHTML = '';
    if (hasOffer) {
      const base = parseFloat(product.price) || 0;
      const offer = parseFloat(product.offer_price) || 0;
      const discount = base > 0 && offer > 0 ? Math.round((1 - offer/base) * 100) : 0;
      priceHTML = `₹${offer.toFixed(2)} <del>₹${base.toFixed(2)}</del>`;
      if (discount > 0) {
        priceHTML += ` <span class="discount-badge">${discount}% OFF</span>`;
      }
    } else {
      priceHTML = `₹${(parseFloat(product.price) || 0).toFixed(2)}`;
    }
    priceEl.innerHTML = priceHTML;

    // Images
    const images = tokenToImgs(product.images);
    if (images.length > 0) {
      mainImage.src = images[0];
      thumbsContainer.innerHTML = '';
      images.forEach((img, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'product-thumb' + (idx === 0 ? ' active' : '');
        thumb.innerHTML = `<img src="${img}" alt="Product ${idx + 1}">`;
        thumb.addEventListener('click', () => {
          mainImage.src = img;
          document.querySelectorAll('.product-thumb').forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
        });
        thumbsContainer.appendChild(thumb);
      });
    }

    // Sizes
    const sizes = (product.sizes || '').split(',').map(s => s.trim()).filter(Boolean);
    sizeOptions.innerHTML = '';
    let selectedSize = null;

    if (sizes.length > 0) {
      sizes.forEach(size => {
        const btn = document.createElement('button');
        btn.className = 'size-option';
        btn.textContent = size;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.size-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedSize = size;
          // Update URL with selected size
          updateProductURL(product.id, size);
        });
        sizeOptions.appendChild(btn);
      });
      // Auto-select preselected size or first size
      if (preselectedSize && sizes.includes(preselectedSize)) {
        const targetBtn = Array.from(sizeOptions.children).find(btn => btn.textContent === preselectedSize);
        targetBtn?.click();
      } else {
        sizeOptions.firstChild?.click();
      }
    } else {
      document.getElementById('product-modal-sizes').style.display = 'none';
    }

    // Update URL when modal opens
    updateProductURL(product.id, selectedSize);

    // Add to cart button
    const addCartBtn = document.getElementById('btn-add-cart');
    addCartBtn.onclick = () => {
      if (window.cdAddToCart) {
        window.cdAddToCart(product.id, selectedSize || sizes[0] || null, true);
      }
      modal.style.display = 'none';
      // Reset URL to products section
      history.pushState(null, '', '#product-section');
    };

    // Share button
    const shareBtn = document.getElementById('btn-share');
    shareBtn.onclick = () => {
      const shareURL = window.location.origin + window.location.pathname + '#product=' + product.id + (selectedSize ? '&size=' + selectedSize : '');
      
      // Try native Web Share API first
      if (navigator.share) {
        navigator.share({
          title: product.name,
          text: `Check out ${product.name}!`,
          url: shareURL
        }).catch(() => {
          // Fallback to clipboard
          copyToClipboard(shareURL);
        });
      } else {
        // Fallback to clipboard
        copyToClipboard(shareURL);
      }
    };

    // Close button
    const closeBtn = modal.querySelector('.product-modal-close');
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      // Reset URL to products section
      history.pushState(null, '', '#product-section');
    };

    // Close on overlay click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        // Reset URL to products section
        history.pushState(null, '', '#product-section');
      }
    };

    // Quantity controls
    const qtyInput = document.getElementById('qty-input');
    const qtyMinus = document.getElementById('qty-minus');
    const qtyPlus = document.getElementById('qty-plus');
    
    // Reset quantity to 1
    qtyInput.value = '1';
    
    qtyMinus.onclick = () => {
      let qty = parseInt(qtyInput.value) || 1;
      if (qty > 1) {
        qtyInput.value = qty - 1;
      }
    };
    
    qtyPlus.onclick = () => {
      let qty = parseInt(qtyInput.value) || 1;
      qtyInput.value = qty + 1;
    };

    // Helper links
    const sizeChartLink = document.getElementById('size-chart-link');
    const returnPolicyLink = document.getElementById('return-policy-link');
    const askQuestionLink = document.getElementById('ask-question-link');
    const instaLink = document.getElementById('insta-link');
    const sizeChartOverlay = document.getElementById('size-chart-overlay');
    const sizeChartClose = sizeChartOverlay.querySelector('.size-chart-close');

    // Instagram link - show only if product has insta_link
    if (product.insta_link && product.insta_link.trim() !== '') {
      instaLink.href = product.insta_link;
      instaLink.style.display = 'inline-flex';
    } else {
      instaLink.style.display = 'none';
    }

    // Fabric product link
    const fabricLink = document.getElementById('fabric-link');
    if (product.fabric_product_id && product.fabric_product_id.trim() !== '') {
      fabricLink.href = '#product=' + product.fabric_product_id;
      fabricLink.style.display = 'inline-flex';
    } else {
      fabricLink.style.display = 'none';
    }

    // Size chart
    sizeChartLink.onclick = (e) => {
      e.preventDefault();
      sizeChartOverlay.style.display = 'flex';
    };

    sizeChartClose.onclick = () => {
      sizeChartOverlay.style.display = 'none';
    };

    sizeChartOverlay.onclick = (e) => {
      if (e.target === sizeChartOverlay) {
        sizeChartOverlay.style.display = 'none';
      }
    };

    // Return policy: navigate to path page
    if (returnPolicyLink) {
      returnPolicyLink.setAttribute('href', 'policies/refund-policy.html');
      returnPolicyLink.onclick = (e) => {
        e.preventDefault();
        window.location.href = 'policies/refund-policy.html';
      };
    }

    // Ask a question via WhatsApp
    askQuestionLink.onclick = (e) => {
      e.preventDefault();
      const productURL = window.location.origin + window.location.pathname + '#product=' + product.id;
      const message = encodeURIComponent(`Hello, I have a query about ${productURL}`);
      // Get WhatsApp number from footer link
      const footerPhoneLink = document.getElementById('footer-phone');
      if (footerPhoneLink && footerPhoneLink.href.includes('wa.me')) {
        const waUrl = footerPhoneLink.href.replace(/\?text=[^&]*/, `?text=${message}`);
        window.open(waUrl, '_blank', 'noopener');
      } else {
        window.showAlert('WhatsApp contact not available', 'error');
      }
    };

    // Show modal
    modal.style.display = 'block';
  };

  // Helper function to update URL with product ID and size
  function updateProductURL(productId, size) {
    const url = '#product=' + productId + (size ? '&size=' + size : '');
    history.replaceState(null, '', url);
  }

  // Helper function to copy URL to clipboard
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        window.showAlert('Product link copied to clipboard!', 'success');
      }).catch(() => {
        fallbackCopyTextToClipboard(text);
      });
    } else {
      fallbackCopyTextToClipboard(text);
    }
  }

  function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-1000px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      window.showAlert('Product link copied to clipboard!', 'success');
    } catch (err) {
      window.showAlert('Failed to copy link. Please copy manually: ' + text, 'error');
    }
    document.body.removeChild(textArea);
  }

  // Cart Management System with WhatsApp Checkout
  
  // Load cart from localStorage
  function loadCart() {
    try {
      const stored = localStorage.getItem('cd_cart');
      return stored ? JSON.parse(stored) : [];
    } catch(e) {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem('cd_cart', JSON.stringify(cart));
    } catch(e) {
      console.error('Failed to save cart');
    }
  }

  cart = loadCart();
  // Max quantity per item (configurable via inputs.js -> max_qty_per_item)
  var MAX_QTY_PER_ITEM = (window.CDA_INPUTS && Number(window.CDA_INPUTS.max_qty_per_item)) || 5;

  // Create Cart Modal
  function createCartModal() {
    const modalHtml = `
      <div id="cart-modal-overlay" class="cart-modal-overlay" style="display:none;">
        <div class="cart-modal-container">
          <div class="cart-modal-header">
            <h2>Your Cart</h2>
            <button class="cart-modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="cart-modal-body">
            <div id="cart-items-list"></div>
            <div id="cart-total-section" class="cart-total-section">
              <div class="cart-total-row">
                <strong>Total:</strong>
                <h3 id="cart-total-amount">₹0.00</h3>
              </div>
            </div>
            <div id="cart-checkout-section" class="cart-checkout-section">
              <h4>Shipping & Customer Details</h4>
              <p class="cart-note">Please fill in all required fields. BUY will open WhatsApp to complete your order.</p>
              <form id="checkout-form" class="checkout-form">
                <div class="form-group">
                  <label>Full Name*</label>
                  <input type="text" id="customer-name" required />
                </div>
                <div class="form-group">
                  <label>Address*</label>
                  <input type="text" id="customer-address" required />
                </div>
                <div class="form-group">
                  <label>Landmark</label>
                  <input type="text" id="customer-landmark" placeholder="Optional" />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>City*</label>
                    <input type="text" id="customer-city" required />
                  </div>
                  <div class="form-group">
                    <label>Pincode*</label>
                    <input type="text" id="customer-pincode" required pattern="[1-9][0-9]{5}" maxlength="6" placeholder="6-digit PIN" />
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div class="cart-modal-footer">
            <button id="clear-cart-btn" class="btn-clear-cart">Clear Cart</button>
            <button id="continue-shopping-btn" class="btn-continue">Continue Shopping</button>
            <button id="checkout-whatsapp-btn" class="btn-checkout">
              <i class="fab fa-whatsapp"></i> BUY
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add cart modal styles
    const styles = `
      <style>
        .cart-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 10003;
          overflow-y: auto;
          padding: 20px;
        }

        .cart-modal-container {
          background: white;
          max-width: 700px;
          margin: 40px auto;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .cart-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 30px;
          border-bottom: 1px solid #e0e0e0;
        }

        .cart-modal-header h2 {
          margin: 0;
          font-size: 2.4rem;
          color: #333;
        }

        .cart-modal-close {
          background: none;
          border: none;
          font-size: 32px;
          cursor: pointer;
          color: #666;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .cart-modal-close:hover {
          background: #f5f5f5;
          color: #333;
        }

        .cart-modal-body {
          padding: 24px 30px;
          max-height: 60vh;
          overflow-y: auto;
        }

        #cart-items-list {
          margin-bottom: 20px;
        }

        .cart-item {
          display: flex;
          gap: 15px;
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .cart-item-thumb {
          width: 64px;
          height: 64px;
          flex: 0 0 64px;
          border-radius: 8px;
          overflow: hidden;
          background: #f9f9f9;
          border: 1px solid #eee;
        }

        .cart-item-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .cart-item-details {
          flex: 1;
        }

        .cart-item-name {
          font-size: 1.6rem;
          font-weight: 600;
          margin-bottom: 4px;
          color: #333;
        }

        .cart-item-price {
          font-size: 1.4rem;
          color: #666;
          margin-bottom: 8px;
        }

        .cart-item-controls {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .cart-item-controls > div {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cart-item-controls label {
          font-size: 1.3rem;
          color: #666;
          font-weight: 500;
        }

        .cart-item-controls select {
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1.3rem;
        }

        .qty-stepper {
          display: inline-flex;
          align-items: center;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }

        .qty-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: #f5f5f5;
          cursor: pointer;
          font-size: 1.6rem;
          font-weight: 600;
          color: #333;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .qty-btn:hover {
          background: #e0e0e0;
        }

        .qty-display {
          min-width: 40px;
          text-align: center;
          font-size: 1.4rem;
          font-weight: 600;
          padding: 0 8px;
        }

        .cart-item-remove {
          padding: 4px 12px;
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1.2rem;
        }

        .cart-item-remove:hover {
          background: #cc0000;
        }

        .cart-total-section {
          border-top: 2px solid #e0e0e0;
          padding-top: 16px;
          margin-bottom: 20px;
        }

        .cart-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cart-total-row strong {
          font-size: 1.8rem;
        }

        #cart-total-amount {
          font-size: 2.4rem;
          color: #E84B3D;
          margin: 0;
        }

        .cart-checkout-section h4 {
          font-size: 1.8rem;
          margin-bottom: 8px;
        }

        .cart-note {
          font-size: 1.3rem;
          color: #666;
          margin-bottom: 16px;
        }

        .checkout-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-size: 1.4rem;
          margin-bottom: 4px;
          color: #333;
        }

        .form-group input {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1.4rem;
        }

        .form-group input:focus {
          outline: none;
          border-color: #E84B3D;
        }

        .cart-modal-footer {
          display: flex;
          gap: 12px;
          padding: 20px 30px;
          border-top: 1px solid #e0e0e0;
        }

        .btn-clear-cart {
          align-items: center;
          appearance: none;
          background-color: #fff;
          border-radius: 24px;
          border-style: none;
          box-shadow: rgba(0, 0, 0, .2) 0 3px 5px -1px, rgba(0, 0, 0, .14) 0 6px 10px 0, rgba(0, 0, 0, .12) 0 1px 18px 0;
          box-sizing: border-box;
          color: #ff4444;
          cursor: pointer;
          display: inline-flex;
          fill: currentcolor;
          font-family: 'Funnel Sans', 'Nunito Sans', 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 500;
          height: 48px;
          justify-content: center;
          letter-spacing: .25px;
          line-height: normal;
          overflow: visible;
          padding: 2px 24px;
          text-align: center;
          text-transform: none;
          transition: box-shadow 280ms cubic-bezier(.4, 0, .2, 1), opacity 15ms linear 30ms, transform 270ms cubic-bezier(0, 0, .2, 1) 0ms;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
          width: auto;
          will-change: transform, opacity;
        }

        .btn-clear-cart:hover {
          background: #fff5f5;
          color: #ff4444;
          box-shadow: rgba(60, 64, 67, .3) 0 2px 3px 0, rgba(60, 64, 67, .15) 0 6px 10px 4px;
        }

        .btn-clear-cart:focus {
          outline: none;
          border: 2px solid #ff4444;
        }

        .btn-clear-cart:active {
          box-shadow: 0 4px 4px 0 rgb(60 64 67 / 30%), 0 8px 12px 6px rgb(60 64 67 / 15%);
        }

        .btn-clear-cart:not(:disabled) {
          box-shadow: rgba(60, 64, 67, .3) 0 1px 3px 0, rgba(60, 64, 67, .15) 0 4px 8px 3px;
        }

        .btn-continue {
          flex: 1;
          align-items: center;
          appearance: none;
          background-color: #fff;
          border-radius: 24px;
          border-style: none;
          box-shadow: rgba(0, 0, 0, .2) 0 3px 5px -1px, rgba(0, 0, 0, .14) 0 6px 10px 0, rgba(0, 0, 0, .12) 0 1px 18px 0;
          box-sizing: border-box;
          color: #666;
          cursor: pointer;
          display: inline-flex;
          fill: currentcolor;
          font-family: 'Funnel Sans', 'Nunito Sans', 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 500;
          height: 48px;
          justify-content: center;
          letter-spacing: .25px;
          line-height: normal;
          overflow: visible;
          padding: 2px 24px;
          text-align: center;
          text-transform: none;
          transition: box-shadow 280ms cubic-bezier(.4, 0, .2, 1), opacity 15ms linear 30ms, transform 270ms cubic-bezier(0, 0, .2, 1) 0ms;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
          width: auto;
          will-change: transform, opacity;
        }

        .btn-continue:hover {
          background: #F6F9FE;
          color: #174ea6;
          box-shadow: rgba(60, 64, 67, .3) 0 2px 3px 0, rgba(60, 64, 67, .15) 0 6px 10px 4px;
        }

        .btn-continue:focus {
          outline: none;
          border: 2px solid #4285f4;
        }

        .btn-continue:active {
          box-shadow: 0 4px 4px 0 rgb(60 64 67 / 30%), 0 8px 12px 6px rgb(60 64 67 / 15%);
        }

        .btn-continue:not(:disabled) {
          box-shadow: rgba(60, 64, 67, .3) 0 1px 3px 0, rgba(60, 64, 67, .15) 0 4px 8px 3px;
        }

        .btn-checkout {
          align-items: center;
          appearance: none;
          background-color: #25D366;
          border-radius: 24px;
          border-style: none;
          box-shadow: rgba(0, 0, 0, .2) 0 3px 5px -1px, rgba(0, 0, 0, .14) 0 6px 10px 0, rgba(0, 0, 0, .12) 0 1px 18px 0;
          box-sizing: border-box;
          color: #fff;
          cursor: pointer;
          display: inline-flex;
          fill: currentcolor;
          font-family: 'Funnel Sans', 'Nunito Sans', 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 500;
          height: 48px;
          justify-content: center;
          letter-spacing: .25px;
          line-height: normal;
          overflow: visible;
          padding: 2px 24px;
          text-align: center;
          text-transform: none;
          transition: box-shadow 280ms cubic-bezier(.4, 0, .2, 1), opacity 15ms linear 30ms, transform 270ms cubic-bezier(0, 0, .2, 1) 0ms;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
          width: auto;
          will-change: transform, opacity;
          gap: 8px;
        }

        .btn-checkout:hover {
          background: #128C7E;
          box-shadow: rgba(60, 64, 67, .3) 0 2px 3px 0, rgba(60, 64, 67, .15) 0 6px 10px 4px;
        }

        .btn-checkout:focus {
          outline: none;
          border: 2px solid #25D366;
        }

        .btn-checkout:active {
          box-shadow: 0 4px 4px 0 rgb(60 64 67 / 30%), 0 8px 12px 6px rgb(60 64 67 / 15%);
        }

        .btn-checkout:not(:disabled) {
          box-shadow: rgba(60, 64, 67, .3) 0 1px 3px 0, rgba(60, 64, 67, .15) 0 4px 8px 3px;
        }

        .btn-checkout i {
          font-size: 1.8rem;
        }

        .cart-empty-message {
          text-align: center;
          padding: 40px 20px;
          color: #666;
          font-size: 1.6rem;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .cart-modal-container {
            margin: 20px auto;
          }

          .cart-modal-header,
          .cart-modal-body,
          .cart-modal-footer {
            padding: 16px 20px;
          }

          .cart-item {
            gap: 12px;
          }

          .cart-item-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .cart-item-controls > div {
            width: 100%;
          }

          .cart-item-controls label {
            min-width: 50px;
          }

          .cart-item-controls select {
            flex: 1;
          }

          .cart-item-remove {
            width: 100%;
          }

          .cart-modal-footer {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px;
          }

          .btn-clear-cart,
          .btn-continue,
          .btn-checkout {
            padding: 2px 16px;
            font-size: 13px;
            height: 42px;
            flex: 1;
            min-width: 85px;
          }

          .btn-checkout {
            gap: 4px;
          }

          .btn-checkout i {
            font-size: 1.6rem;
          }
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
  }

  // Render cart items
  function renderCart() {
    const itemsList = document.getElementById('cart-items-list');
    const totalSection = document.getElementById('cart-total-section');
    const checkoutSection = document.getElementById('cart-checkout-section');
    const totalAmount = document.getElementById('cart-total-amount');
    const clearBtn = document.getElementById('clear-cart-btn');
    const checkoutBtn = document.getElementById('checkout-whatsapp-btn');
    
    if (!itemsList) return;
    
    itemsList.innerHTML = '';
    
    if (cart.length === 0) {
      itemsList.innerHTML = '<div class="cart-empty-message">Your cart is empty</div>';
      if (totalSection) totalSection.style.display = 'none';
      if (checkoutSection) checkoutSection.style.display = 'none';
      if (clearBtn) clearBtn.style.display = 'none';
      if (checkoutBtn) checkoutBtn.style.display = 'none';
      return;
    }
    
    // Show buttons when cart has items
    if (clearBtn) clearBtn.style.display = 'block';
    if (checkoutBtn) checkoutBtn.style.display = 'flex';
    
    if (totalSection) totalSection.style.display = 'block';
    if (checkoutSection) checkoutSection.style.display = 'block';
    
    cart.forEach((item, idx) => {
      const product = PRODUCTS[item.id];
      // Fallback: if product registry not available (e.g., policy pages), render without sizes
      const sizes = product ? (String(product.sizes || '').split(',').map(s => s.trim()).filter(Boolean)) : [];
      
      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      // Build product link to index page with hash
      const inPolicies = window.location.pathname.indexOf('/policies/') !== -1;
      const base = inPolicies ? '../' : './';
      const sizeParam = item.size ? ('&size=' + encodeURIComponent(item.size)) : '';
      const productLink = base + '#product=' + encodeURIComponent(item.id) + sizeParam;

      itemEl.innerHTML = `
        <div class="cart-item-thumb"><img src="${item.image}" alt="${item.name}" /></div>
        <div class="cart-item-details">
          <div class="cart-item-name"><a class="cart-item-link" href="${productLink}">${item.name}</a></div>
          <div class="cart-item-price">₹${item.price.toFixed(2)}</div>
          <div class="cart-item-controls">
            ${sizes.length ? `
              <div>
                <label>Size:</label>
                <select class="cart-size-select" data-idx="${idx}">
                  ${sizes.map(s => `<option value="${s}" ${s === item.size ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
              </div>
            ` : ''}
            <div>
              <label>Qty:</label>
              <div class="qty-stepper">
                <button class="qty-btn qty-minus" data-idx="${idx}">-</button>
                <span class="qty-display" data-idx="${idx}">${item.qty}</span>
                <button class="qty-btn qty-plus" data-idx="${idx}">+</button>
              </div>
            </div>
            <button class="cart-item-remove" data-idx="${idx}">Remove</button>
          </div>
        </div>
      `;
      itemsList.appendChild(itemEl);
    });
    
    // Event listeners
    itemsList.querySelectorAll('.qty-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        if (cart[idx].qty > 1) {
          cart[idx].qty -= 1;
          saveCart();
          renderCart();
          updateCartBadge();
        }
      });
    });

    itemsList.querySelectorAll('.qty-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        if (cart[idx].qty >= MAX_QTY_PER_ITEM) {
          window.showAlert(`You can add up to ${MAX_QTY_PER_ITEM} per item.`);
          return;
        }
        cart[idx].qty += 1;
        saveCart();
        renderCart();
        updateCartBadge();
      });
    });
    
    itemsList.querySelectorAll('.cart-size-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        cart[idx].size = e.target.value;
        saveCart();
        renderCart();
      });
    });
    
    itemsList.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        cart.splice(idx, 1);
        saveCart();
        renderCart();
        updateCartBadge();
      });
    });

    // Close cart modal when clicking product links
    if (!itemsList.dataset.linkHandler) {
      itemsList.addEventListener('click', (e) => {
        const link = e.target.closest('.cart-item-link');
        if (link) {
          const overlay = document.getElementById('cart-modal-overlay');
          if (overlay) overlay.style.display = 'none';
        }
      });
      itemsList.dataset.linkHandler = '1';
    }
    
    // Calculate total
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    if (totalAmount) totalAmount.textContent = `₹${total.toFixed(2)}`;
  }

  // Update cart badge count
  function updateCartBadge() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    
    // Update header cart badge
    const headerBadge = document.getElementById('headerCartBadge');
    if (headerBadge) {
      headerBadge.textContent = count;
      headerBadge.style.display = count > 0 ? 'block' : 'none';
    }
    
    // Update navbar cart badge (if exists)
    const navBadge = document.getElementById('cartCountBadge');
    if (navBadge) {
      navBadge.textContent = count;
      navBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    // Update mobile bottom nav cart badge
    const mobileBadge = document.getElementById('mobileCartBadge');
    if (mobileBadge) {
      mobileBadge.textContent = count;
      mobileBadge.style.display = count > 0 ? 'block' : 'none';
    }
  }

  // Add to cart function
  window.cdAddToCart = function(productId, size, showFeedback) {
    const product = PRODUCTS[productId];
    if (!product) {
      console.warn('Product not found:', productId);
      return;
    }
    
    // Use offer price if available
    const basePriceNum = parseFloat(product.price) || 0;
    const offerPriceNum = parseFloat(product.offer_price) || 0;
    const effectivePrice = offerPriceNum > 0 ? offerPriceNum : basePriceNum;
    
    // Get product image
    const images = tokenToImgs(product.images);
    const image = images.length ? images[0] : './assets/images/logo.png';
    
    // Check if item already exists in cart
    const existing = cart.find(item => item.id === productId && (item.size || '') === (size || ''));
    if (existing) {
      if (existing.qty >= MAX_QTY_PER_ITEM) {
        window.showAlert(`You can add up to ${MAX_QTY_PER_ITEM} per item.`);
      } else {
        existing.qty += 1;
      }
    } else {
      cart.push({
        id: productId,
        name: product.name,
        price: effectivePrice,
        qty: 1,
        size: size || null,
        image: image
      });
    }
    
    saveCart();
    updateCartBadge();
    
    if (showFeedback) {
      window.cdShowCart();
    }
  };

  // Show cart modal
  window.cdShowCart = function() {
    if (!document.getElementById('cart-modal-overlay')) {
      createCartModal();
      attachCartEvents();
    }
    renderCart();
    updateCartBadge();
    document.getElementById('cart-modal-overlay').style.display = 'block';
  };

  // Attach cart modal events
  function attachCartEvents() {
    const overlay = document.getElementById('cart-modal-overlay');
    const closeBtn = document.querySelector('.cart-modal-close');
    const continueBtn = document.getElementById('continue-shopping-btn');
    const clearBtn = document.getElementById('clear-cart-btn');
    const checkoutBtn = document.getElementById('checkout-whatsapp-btn');
    
    if (closeBtn) {
      closeBtn.onclick = () => {
        overlay.style.display = 'none';
      };
    }
    
    if (continueBtn) {
      continueBtn.onclick = () => {
        overlay.style.display = 'none';
      };
    }
    
    if (clearBtn) {
      clearBtn.onclick = () => {
        window.showConfirm('Clear your cart?', () => {
          cart = [];
          saveCart();
          renderCart();
          updateCartBadge();
        });
      };
    }
    
    if (checkoutBtn) {
      checkoutBtn.onclick = checkoutViaWhatsApp;
    }
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
    };
  }

  /** Build a WhatsApp message from cart + customer details and open chat */
  function checkoutViaWhatsApp() {
    if (cart.length === 0) {
      window.showAlert('Cart is empty', 'error');
      return;
    }
    
    const name = document.getElementById('customer-name')?.value.trim();
    const address = document.getElementById('customer-address')?.value.trim();
    const landmark = document.getElementById('customer-landmark')?.value.trim();
    const city = document.getElementById('customer-city')?.value.trim();
    const pincode = document.getElementById('customer-pincode')?.value.trim();
    
    if (!name || !address || !city || !pincode) {
      window.showAlert('Please fill in all customer details.', 'error');
      return;
    }
    
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      window.showAlert('Please enter a valid 6-digit PIN code.', 'error');
      return;
    }
    
    // Build WhatsApp message
    let message = `Hello! I'd like to order the following items.\n\n`;
    cart.forEach(item => {
      message += `${item.name} (${item.size || 'N/A'}) x ${item.qty}\n`;
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    message += `\nTotal: ₹${total.toFixed(2)}\n\n`;
    message += `Customer:\n${name}\n${address}`;
    if (landmark) {
      message += `\nLandmark: ${landmark}`;
    }
    message += `\n${city} - ${pincode}\n`;
    
    // Get WhatsApp number from footer (no hardcoded default)
    const footerPhoneLink = document.getElementById('footer-phone');
    let phone = '';

    if (footerPhoneLink && footerPhoneLink.href.includes('wa.me')) {
      const match = footerPhoneLink.href.match(/wa\.me\/(\d+)/);
      if (match) {
        phone = match[1];
      }
    }

    if (!phone) {
      window.showAlert('WhatsApp contact not available. Please try again later.', 'error');
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
    
    // Clear cart after checkout
    cart = [];
    saveCart();
    updateCartBadge();
    document.getElementById('cart-modal-overlay').style.display = 'none';
  }

  // Initialize cart badge on page load
  updateCartBadge();

  // Handle shared product URLs on page load
  function handleSharedProductURL() {
    const hash = window.location.hash;
    if (hash && hash.includes('#product=')) {
      // Extract product ID and size from URL
      const params = new URLSearchParams(hash.substring(1));
      const productId = params.get('product');
      const size = params.get('size');
      
      if (productId) {
        // Wait for products to be loaded, then open the modal
        const checkProducts = setInterval(() => {
          if (PRODUCTS[productId]) {
            clearInterval(checkProducts);
            setTimeout(() => {
              window.openProductDetail(productId, size);
            }, 500);
          }
        }, 100);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkProducts), 10000);
      }
    }
  }

  // Call on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleSharedProductURL);
  } else {
    handleSharedProductURL();
  }

  // Removed unused openGalleryOverlay helper (not used in current site)
})();
