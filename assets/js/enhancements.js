/**
 * ==============================================
 * CDA ENHANCEMENTS
 * ==============================================
 * Additional features: Wishlist, Recently Viewed, Reviews, etc.
 */

(function() {
  'use strict';

  //===========================================
  // RECENTLY VIEWED PRODUCTS
  //===========================================
  
  function saveRecentlyViewed(productId) {
    if (!productId) return;
    
    let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    
    // Remove if already exists
    recentlyViewed = recentlyViewed.filter(id => id !== productId);
    
    // Add to beginning
    recentlyViewed.unshift(productId);
    
    // Keep only last 10
    recentlyViewed = recentlyViewed.slice(0, 10);
    
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
  }
  
  function getRecentlyViewed() {
    return JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
  }
  
  // Hook into product detail opening
  const originalOpenProductDetail = window.openProductDetail;
  if (originalOpenProductDetail) {
    window.openProductDetail = function(productId, size) {
      saveRecentlyViewed(productId);
      return originalOpenProductDetail(productId, size);
    };
  }

  //===========================================
  // SLOW CONNECTION MESSAGE
  //===========================================
  
  function addSlowConnectionMessage() {
    setTimeout(() => {
      const preloader = document.querySelector('.preloader');
      if (preloader && !preloader.classList.contains('hidden')) {
        const loadingText = preloader.querySelector('.loading-text');
        if (loadingText) {
          loadingText.textContent = 'Still loading... Please wait';
          loadingText.style.color = '#ff9800';
        }
      }
    }, 5000);
    
    setTimeout(() => {
      const preloader = document.querySelector('.preloader');
      if (preloader && !preloader.classList.contains('hidden')) {
        const loadingText = preloader.querySelector('.loading-text');
        if (loadingText) {
          loadingText.textContent = 'Slow connection detected. Products loading...';
          loadingText.style.color = '#f44336';
        }
      }
    }, 10000);
  }
  
  if (document.querySelector('.preloader')) {
    addSlowConnectionMessage();
  }

  //===========================================
  // LOADING SKELETONS
  //===========================================
  
  function showLoadingSkeletons(container, count = 6) {
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('li');
      skeleton.className = 'product-item';
      skeleton.innerHTML = `
        <div class="product-card">
          <div class="skeleton product-skeleton"></div>
          <div class="card-content">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-price"></div>
          </div>
        </div>
      `;
      container.appendChild(skeleton);
    }
  }
  
  window.showLoadingSkeletons = showLoadingSkeletons;

  //===========================================
  // NOTE: Notification functions are in utils.js
  // showNotification() and showConfirm() available globally
  //===========================================

  //===========================================
  // INITIALIZATION
  //===========================================
  
  document.addEventListener('DOMContentLoaded', () => {
    // Update cart badge on page load
    if (window.updateCartBadge) {
      window.updateCartBadge();
    }
  });

})();
