/**
 * ============================================
 * CDA - Product Store & Cart
 * ============================================
 * Handles product detail modal, cart operations, and checkout
 * Features:
 * - Flipkart-style product detail modal with image gallery
 * - Size selection and quantity management
 * - Shopping cart with local storage persistence
 * - WhatsApp checkout integration
 * - Product sharing functionality
 */

// store.js - Product detail modal and cart management
(() => {
  let PRODUCTS = {}; // Stores all products loaded from CSV
  let cart = []; // Shopping cart array

  /**
   * NOTE: Notification functions are loaded from utils.js
   * showNotification(message, type) and showConfirm(message, callback)
   */
  const showNotification = window.showNotification || window.CDA.showNotification;
  const showConfirm = window.showConfirm || window.CDA.showConfirm;

  /**
   * NOTE: Drive utility functions are loaded from utils.js
   * extractDriveId, driveThumb, tokenToImgs available globally
   */
  const extractDriveId = window.extractDriveId || window.CDA.extractDriveId;
  const driveThumb = window.driveThumb || window.CDA.driveThumb;
  const tokenToImgs = window.tokenToImgs || window.CDA.tokenToImgs;

  /**
   * Register Product from CSV
   * Called by csv-render.js for each product loaded
   * @param {Object} product - Product data object with id, name, price, etc.
   */
  window.cdRegisterProduct = function(product) {
    if (product && product.id) {
      PRODUCTS[product.id] = product;
    }
  };

  /**
   * Create Product Detail Modal HTML Structure
   * Builds Flipkart-style modal with image gallery and product details
   */
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
                <a href="#" class="helper-link" id="fabric-link" style="display:none;">
                  <i class="fas fa-tshirt"></i> View Fabric
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
              </div>
              <div class="product-reviews-section" id="product-reviews-section" style="display:none;">
                <h3 class="reviews-title">Customer Reviews</h3>
                <div class="reviews-summary" id="reviews-summary"></div>
                <div class="reviews-list" id="reviews-list"></div>
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
        /* Custom Notifications */
        .custom-notification {
          position: fixed;
          top: 80px;
          right: 20px;
          background: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 100000;
          font-size: 1.5rem;
          font-weight: 500;
          transform: translateX(400px);
          transition: transform 0.3s ease;
          max-width: 350px;
        }

        .custom-notification.show {
          transform: translateX(0);
        }

        .custom-notification-success {
          border-left: 4px solid #4CAF50;
          color: #2E7D32;
        }

        .custom-notification-error {
          border-left: 4px solid #f44336;
          color: #C62828;
        }

        .custom-notification-info {
          border-left: 4px solid var(--candy-pink);
          color: var(--dark-brown);
        }

        /* Custom Confirm Dialog */
        .custom-confirm-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 100001;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .custom-confirm-box {
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .custom-confirm-box p {
          font-size: 1.6rem;
          color: #333;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .custom-confirm-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .custom-confirm-buttons button {
          padding: 10px 24px;
          border-radius: 6px;
          font-size: 1.4rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-confirm-cancel {
          background: #f5f5f5;
          color: #666;
        }

        .btn-confirm-cancel:hover {
          background: #e0e0e0;
        }

        .btn-confirm-ok {
          background: var(--candy-pink);
          color: white;
        }

        .btn-confirm-ok:hover {
          background: #d96169;
        }

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
          border-color: #E84B3D;
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
          color: #333;
        }

        .product-modal-price {
          font-size: 2.8rem;
          font-weight: 700;
          color: #333;
          margin-bottom: 20px;
        }

        .product-modal-price del {
          font-size: 2rem;
          color: #999;
          margin-left: 15px;
          font-weight: 400;
        }

        .product-modal-price .discount-badge {
          display: inline-block;
          background: #E84B3D;
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
          color: #666;
          margin-bottom: 25px;
          padding: 15px;
          background: #f8f8f8;
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
          font-family: "Google Sans", Roboto, Arial, sans-serif;
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
          background: #F6F9FE;
          color: #174ea6;
          box-shadow: rgba(60, 64, 67, .3) 0 2px 3px 0, rgba(60, 64, 67, .15) 0 6px 10px 4px;
        }

        .size-option:not(:disabled) {
          box-shadow: rgba(60, 64, 67, .3) 0 1px 3px 0, rgba(60, 64, 67, .15) 0 4px 8px 3px;
        }

        .size-option.selected {
          background: #174ea6;
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
          background: #e0e0e0;
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
          font-family: "Google Sans", Roboto, Arial, sans-serif;
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
          background: #F6F9FE;
          color: #174ea6;
          box-shadow: rgba(60, 64, 67, .3) 0 2px 3px 0, rgba(60, 64, 67, .15) 0 6px 10px 4px;
        }

        .btn-add-cart:focus {
          outline: none;
          border: 2px solid #4285f4;
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
          font-family: "Google Sans", Roboto, Arial, sans-serif;
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
          background: #F6F9FE;
          color: #174ea6;
          box-shadow: rgba(60, 64, 67, .3) 0 2px 3px 0, rgba(60, 64, 67, .15) 0 6px 10px 4px;
        }

        .btn-share:focus {
          outline: none;
          border: 2px solid #4285f4;
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
          color: #174ea6;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: color 0.2s;
        }

        .helper-link:hover {
          color: #0d3a75;
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

        .product-reviews-section {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .reviews-title {
          font-size: 1.5rem;
          margin-bottom: 15px;
          color: var(--dark-brown);
        }

        .reviews-summary {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .rating-stars {
          display: flex;
          gap: 2px;
        }

        .rating-stars ion-icon {
          color: #ffc107;
          font-size: 18px;
        }

        .rating-text {
          font-size: 14px;
          color: #666;
        }

        .review-item {
          padding: 15px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .review-item:last-child {
          border-bottom: none;
        }

        .review-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .review-stars {
          display: flex;
          gap: 2px;
        }

        .review-stars ion-icon {
          color: #ffc107;
          font-size: 14px;
        }

        .review-author {
          font-weight: 600;
          color: var(--dark-brown);
          font-size: 14px;
        }

        .review-date {
          font-size: 12px;
          color: #999;
        }

        .review-text {
          font-size: 14px;
          line-height: 1.6;
          color: #333;
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

  // Display product review from inline product data
  function displayProductReview(product) {
    const reviewsSection = document.getElementById('product-reviews-section');
    const reviewsSummary = document.getElementById('reviews-summary');
    const reviewsList = document.getElementById('reviews-list');
    
    if (!reviewsSection || !reviewsSummary || !reviewsList) return;
    
    // Hide by default
    reviewsSection.style.display = 'none';
    reviewsList.innerHTML = '';
    reviewsSummary.innerHTML = '';
    
    // Check if product has review
    if (!product.review || !product.rating || product.rating === 0) return;
    
    var rating = product.rating;
    
    // Display summary with stars
    var starsHtml = '';
    for (var i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        starsHtml += '<ion-icon name="star"></ion-icon>';
      } else if (i - 0.5 <= rating) {
        starsHtml += '<ion-icon name="star-half"></ion-icon>';
      } else {
        starsHtml += '<ion-icon name="star-outline"></ion-icon>';
      }
    }
    
    reviewsSummary.innerHTML = '<div class="rating-stars">' + starsHtml + '</div>' +
      '<div class="rating-text">' + rating.toFixed(1) + ' out of 5</div>';
    
    // Display the review if text exists
    if (product.review_text) {
      var reviewStarsHtml = '';
      for (var i = 1; i <= 5; i++) {
        reviewStarsHtml += '<ion-icon name="' + (i <= rating ? 'star' : 'star-outline') + '"></ion-icon>';
      }
      
      var reviewHtml = '<div class="review-item">' +
        '<div class="review-header">' +
          '<div class="review-stars">' + reviewStarsHtml + '</div>' +
          '<div class="review-author">' + (product.customer_name || 'Verified Customer') + '</div>' +
          '<div class="review-date">' + (product.review_date || '') + '</div>' +
        '</div>' +
        '<div class="review-text">' + product.review_text + '</div>' +
      '</div>';
      
      reviewsList.innerHTML = reviewHtml;
    }
    
    // Show reviews section
    reviewsSection.style.display = 'block';
  }

  // Open product detail modal
  window.openProductDetail = function(productId, preselectedSize) {
    const product = PRODUCTS[productId];
    if (!product) return;

    // Track product view in Google Analytics
    if (typeof gtag !== 'undefined') {
      const effectivePrice = (product.offer_price && product.offer_price !== '0' && product.offer_price !== '') 
        ? parseFloat(product.offer_price) 
        : parseFloat(product.price);
      
      gtag('event', 'view_item', {
        currency: 'INR',
        value: effectivePrice || 0,
        items: [{
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: effectivePrice || 0
        }]
      });
    }

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

    // Return policy - navigate to policy page
    returnPolicyLink.onclick = (e) => {
      e.preventDefault();
      window.location.href = 'policies/refund-policy.html';
    };
    
    // Fabric link - show only if product has fabric_product_id
    const fabricLink = document.getElementById('fabric-link');
    if (product.fabric_product_id && product.fabric_product_id.trim() !== '') {
      const fabricUrl = window.location.origin + window.location.pathname + '#product=' + product.fabric_product_id;
      fabricLink.href = fabricUrl;
      fabricLink.style.display = 'inline-flex';
      fabricLink.target = '_self';
    } else {
      fabricLink.style.display = 'none';
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
        showNotification('WhatsApp contact not available', 'error');
      }
    };

    // Display product review if available
    displayProductReview(product);

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
        showNotification('Product link copied to clipboard!', 'success');
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
      showNotification('Product link copied to clipboard!', 'success');
    } catch (err) {
      showNotification('Failed to copy link. Please copy manually: ' + text, 'error');
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

        .cart-item-image {
          width: 80px;
          height: 80px;
          flex-shrink: 0;
          border-radius: 6px;
          overflow: hidden;
          background: #f5f5f5;
        }

        .cart-item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cart-item-details {
          flex: 1;
        }

        .cart-item-name {
          font-size: 1.6rem;
          font-weight: 600;
          margin-bottom: 4px;
          color: #333;
          cursor: pointer;
          transition: color 0.2s;
        }

        .cart-item-name:hover {
          color: var(--candy-pink);
          text-decoration: underline;
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
          font-family: "Google Sans", Roboto, Arial, sans-serif;
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
          font-family: "Google Sans", Roboto, Arial, sans-serif;
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
          font-family: "Google Sans", Roboto, Arial, sans-serif;
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
      // Try to get fresh product data if available, otherwise use stored cart data
      const product = PRODUCTS[item.id];
      
      // Get sizes from product or from stored cart item
      const sizesStr = product ? (product.sizes || '') : (item.sizes || '');
      const sizes = sizesStr.split(',').map(s => s.trim()).filter(Boolean);
      
      // Get product image from cart item (already stored)
      const productImage = item.image || './assets/images/product-1.jpg';
      
      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      
      const imgDiv = document.createElement('div');
      imgDiv.className = 'cart-item-image';
      const imgEl = document.createElement('img');
      imgEl.src = productImage;
      imgEl.alt = item.name;
      imgEl.loading = 'lazy';
      imgDiv.appendChild(imgEl);
      itemEl.appendChild(imgDiv);
      
      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'cart-item-details';
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'cart-item-name';
      nameDiv.setAttribute('data-product-id', item.id);
      nameDiv.textContent = item.name;
      detailsDiv.appendChild(nameDiv);
      
      const priceDiv = document.createElement('div');
      priceDiv.className = 'cart-item-price';
      priceDiv.textContent = '₹' + item.price.toFixed(2);
      detailsDiv.appendChild(priceDiv);
      
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'cart-item-controls';
      controlsDiv.innerHTML = `
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
      `;
      detailsDiv.appendChild(controlsDiv);
      itemEl.appendChild(detailsDiv);
      itemsList.appendChild(itemEl);
    });
    
    // Make product names clickable
    itemsList.querySelectorAll('.cart-item-name').forEach(nameEl => {
      const productId = nameEl.getAttribute('data-product-id');
      if (productId) {
        nameEl.style.cursor = 'pointer';
        nameEl.style.color = 'var(--candy-pink)';
        nameEl.addEventListener('click', () => {
          // Close cart modal
          const cartOverlay = document.getElementById('cart-modal-overlay');
          if (cartOverlay) cartOverlay.style.display = 'none';
          
          // If we have product data loaded (main page), open modal directly
          if (PRODUCTS[productId] && window.openProductDetail) {
            window.openProductDetail(productId);
          } else {
            // On policy pages, navigate to main page with hash fragment
            window.location.href = '../index.html#product=' + productId;
          }
        });
      }
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
    
    // Update bottom nav cart badge (mobile)
    const bottomNavBadge = document.getElementById('bottomNavCartBadge');
    if (bottomNavBadge) {
      bottomNavBadge.textContent = count;
      bottomNavBadge.style.display = count > 0 ? 'block' : 'none';
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
      existing.qty += 1;
    } else {
      cart.push({
        id: productId,
        name: product.name,
        price: effectivePrice,
        qty: 1,
        size: size || null,
        image: image,
        sizes: product.sizes || '' // Store available sizes for dropdown
      });
    }
    
    // Track add to cart in Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'add_to_cart', {
        currency: 'INR',
        value: effectivePrice,
        items: [{
          item_id: productId,
          item_name: product.name,
          item_category: product.category,
          price: effectivePrice,
          quantity: 1
        }]
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
    
    // Track cart view in Google Analytics
    if (typeof gtag !== 'undefined' && cart.length > 0) {
      const totalValue = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const items = cart.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.qty
      }));
      
      gtag('event', 'view_cart', {
        currency: 'INR',
        value: totalValue,
        items: items
      });
    }
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
        showConfirm('Clear your cart?', () => {
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
    
    // Add real-time validation feedback for form fields
    const nameField = document.getElementById('customer-name');
    const addressField = document.getElementById('customer-address');
    const cityField = document.getElementById('customer-city');
    const pincodeField = document.getElementById('customer-pincode');
    
    if (nameField) {
      nameField.addEventListener('input', function() {
        if (this.value.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(this.value.trim())) {
          this.style.borderColor = '#4CAF50';
        } else if (this.value.trim().length > 0) {
          this.style.borderColor = '#ff4444';
        } else {
          this.style.borderColor = '#ddd';
        }
      });
    }
    
    if (addressField) {
      addressField.addEventListener('input', function() {
        if (this.value.trim().length >= 10) {
          this.style.borderColor = '#4CAF50';
        } else if (this.value.trim().length > 0) {
          this.style.borderColor = '#ff4444';
        } else {
          this.style.borderColor = '#ddd';
        }
      });
    }
    
    if (cityField) {
      cityField.addEventListener('input', function() {
        if (this.value.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(this.value.trim())) {
          this.style.borderColor = '#4CAF50';
        } else if (this.value.trim().length > 0) {
          this.style.borderColor = '#ff4444';
        } else {
          this.style.borderColor = '#ddd';
        }
      });
    }
    
    if (pincodeField) {
      pincodeField.addEventListener('input', function() {
        const value = this.value.trim();
        if (/^[1-9][0-9]{5}$/.test(value)) {
          this.style.borderColor = '#4CAF50';
        } else if (value.length > 0) {
          this.style.borderColor = '#ff4444';
        } else {
          this.style.borderColor = '#ddd';
        }
      });
      
      // Only allow digits
      pincodeField.addEventListener('keypress', function(e) {
        if (!/[0-9]/.test(e.key)) {
          e.preventDefault();
        }
      });
    }
  }

  // WhatsApp Checkout
  function checkoutViaWhatsApp() {
    if (cart.length === 0) {
      showNotification('Cart is empty', 'info');
      return;
    }
    
    // Get form values
    const name = document.getElementById('customer-name')?.value.trim();
    const address = document.getElementById('customer-address')?.value.trim();
    const landmark = document.getElementById('customer-landmark')?.value.trim();
    const city = document.getElementById('customer-city')?.value.trim();
    const pincode = document.getElementById('customer-pincode')?.value.trim();
    
    // Validate required fields
    if (!name || !address || !city || !pincode) {
      showNotification('Please fill in all required fields (marked with *).', 'error');
      // Highlight empty required fields
      if (!name) document.getElementById('customer-name').style.borderColor = '#ff4444';
      if (!address) document.getElementById('customer-address').style.borderColor = '#ff4444';
      if (!city) document.getElementById('customer-city').style.borderColor = '#ff4444';
      if (!pincode) document.getElementById('customer-pincode').style.borderColor = '#ff4444';
      return;
    }
    
    // Track begin checkout in Google Analytics
    if (typeof gtag !== 'undefined') {
      const totalValue = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const items = cart.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.qty
      }));
      
      gtag('event', 'begin_checkout', {
        currency: 'INR',
        value: totalValue,
        items: items
      });
    }
    
    // Validate name (at least 2 characters, only letters and spaces)
    if (name.length < 2 || !/^[a-zA-Z\s]+$/.test(name)) {
      showNotification('Please enter a valid name (letters and spaces only).', 'error');
      document.getElementById('customer-name').style.borderColor = '#ff4444';
      document.getElementById('customer-name').focus();
      return;
    }
    
    // Validate address (at least 10 characters)
    if (address.length < 10) {
      showNotification('Please enter a complete address (at least 10 characters).', 'error');
      document.getElementById('customer-address').style.borderColor = '#ff4444';
      document.getElementById('customer-address').focus();
      return;
    }
    
    // Validate city (at least 2 characters, only letters and spaces)
    if (city.length < 2 || !/^[a-zA-Z\s]+$/.test(city)) {
      showNotification('Please enter a valid city name (letters and spaces only).', 'error');
      document.getElementById('customer-city').style.borderColor = '#ff4444';
      document.getElementById('customer-city').focus();
      return;
    }
    
    // Validate PIN code (6 digits, doesn't start with 0)
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      showNotification('Please enter a valid 6-digit PIN code (e.g., 560001).', 'error');
      document.getElementById('customer-pincode').style.borderColor = '#ff4444';
      document.getElementById('customer-pincode').focus();
      return;
    }
    
    // Reset all field border colors on successful validation
    ['customer-name', 'customer-address', 'customer-city', 'customer-pincode'].forEach(id => {
      const field = document.getElementById(id);
      if (field) field.style.borderColor = '#ddd';
    });
    
    // Build WhatsApp message
    let message = `Hello! I'd like to order the following items.\n\n`;
    cart.forEach(item => {
      message += `Product ID: ${item.id}\n${item.name} (${item.size || 'N/A'}) x ${item.qty}\n₹${item.price.toFixed(2)} each\n\n`;
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    message += `Total: ₹${total.toFixed(2)}\n\n`;
    message += `Customer:\n${name}\n${address}`;
    if (landmark) {
      message += `\nLandmark: ${landmark}`;
    }
    message += `\n${city} - ${pincode}\n`;
    
    // Get WhatsApp number from footer (set by CSV)
    const footerPhoneLink = document.getElementById('footer-phone');
    let phone = '';
    
    if (footerPhoneLink && footerPhoneLink.href.includes('wa.me')) {
      const match = footerPhoneLink.href.match(/wa\.me\/(\d+)/);
      if (match) {
        phone = match[1];
      }
    }
    
    if (!phone) {
      showNotification('WhatsApp number not configured. Please contact support.', 'error');
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

  // Gallery overlay (existing functionality)
  window.openGalleryOverlay = function(images) {
    console.log('Gallery:', images);
    // Simple implementation - just show first image in modal
    if (images && images.length > 0) {
      window.open(images[0], '_blank');
    }
  };
})();
