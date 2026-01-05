'use strict';

/**
 * ============================================
 * CDA - Main Script
 * ============================================
 * Handles navigation, URL routing, policy overlays, and UI interactions
 */

/**
 * Mobile Navigation Toggle
 * Opens/closes the mobile menu and overlay
 */
const overlay = document.querySelector("[data-overlay]");
const navOpenBtn = document.querySelector("[data-nav-open-btn]");
const navbar = document.querySelector("[data-navbar]");
const navCloseBtn = document.querySelector("[data-nav-close-btn]");

const navElems = [overlay, navOpenBtn, navCloseBtn];

for (let i = 0; i < navElems.length; i++) {
  navElems[i].addEventListener("click", function () {
    navbar.classList.toggle("active");
    overlay.classList.toggle("active");
  });
}

/**
 * Header & Scroll-to-Top Button
 * Makes header sticky and shows scroll button when user scrolls down
 */
const header = document.querySelector("[data-header]");
const goTopBtn = document.querySelector("[data-go-top]");

window.addEventListener("scroll", function () {
  if (window.scrollY >= 80) {
    header.classList.add("active");
    goTopBtn.classList.add("active");
  } else {
    header.classList.remove("active");
    goTopBtn.classList.remove("active");
  }
});

/**
 * Shop Dropdown & URL-Based Navigation System
 * Handles:
 * - Mobile dropdown menu toggle
 * - Product deep links (#product=ABC123&size=M)
 * - Collection filtering (#collection=Final+Sale)
 * - Category filtering (#filter=CO-ORDS)
 * - Section navigation (#hero-section, #site-footer, etc.)
 */
document.addEventListener('DOMContentLoaded', function(){
  
  /**
   * Shop Dropdown Toggle (Mobile)
   * Desktop: Click anywhere closes menu
   * Mobile: Click SHOP link toggles dropdown
   */
  const dropdownParent = document.querySelector('.navbar-item.has-dropdown');
  const dropdownLink = dropdownParent?.querySelector('.navbar-link');
  const dropdownMenu = dropdownParent?.querySelector('.dropdown-menu');
  
  if (dropdownParent && dropdownLink) {
    dropdownLink.addEventListener('click', function(e) {
      if (window.innerWidth <= 991) {
        e.preventDefault();
        e.stopPropagation();
        dropdownParent.classList.toggle('active');
      }
    });
  }
  
  /**
   * URL Hash Navigation Handler
   * Supports multiple URL patterns for deep linking
   */
  function handleHashNavigation() {
    const hash = window.location.hash;
    
    // Home page (no hash or #hero-section)
    if (!hash || hash === '#' || hash === '#hero-section') {
      window.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }
    
    // Product detail modal (#product=ABC&size=M)
    // Example: #product=LPL-1001&size=M
    if (hash.startsWith('#product=')) {
      const params = new URLSearchParams(hash.substring(1));
      const productId = params.get('product');
      const size = params.get('size');
      
      if (productId && window.openProductDetail) {
        // Wait for CSV products to load
        setTimeout(function() {
          window.openProductDetail(productId, size);
        }, 1000);
      }
      return;
    }
    
    // Collection filter (#collection=Final+Sale)
    // Loads specific collection from Google Sheets
    if (hash.startsWith('#collection=')) {
      const collectionName = decodeURIComponent(hash.substring(12));
      setTimeout(function() {
        if (window.selectGroup) {
          window.selectGroup(collectionName);
          document.getElementById('product-section')?.scrollIntoView({behavior: 'smooth'});
        }
      }, 1500);
      return;
    }
    
    // Category filter (#filter=CO-ORDS)
    // Filters products by category/tag
    if (hash.startsWith('#filter=')) {
      const filterLabel = decodeURIComponent(hash.substring(8));
      setTimeout(function() {
        if (window.selectFilter) {
          window.selectFilter(filterLabel);
          document.getElementById('product-section')?.scrollIntoView({behavior: 'smooth'});
        }
      }, 1500);
      return;
    }
    
    // Regular section navigation (#site-footer, #hero-section, etc.)
    const targetId = hash.substring(1);
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      setTimeout(function() {
        targetElement.scrollIntoView({behavior: 'smooth', block: 'start'});
      }, 100);
    }
  }
  
  // Listen for URL hash changes
  window.addEventListener('hashchange', handleHashNavigation);
  
  // Handle initial page load with hash - wait for CSV data to load
  window.addEventListener('load', function() {
    if (window.location.hash) {
      setTimeout(function() {
        handleHashNavigation();
      }, 2000);
    }
  });
  
  /**
   * Close Mobile Menu on Navigation
   * Closes navbar when clicking links (except SHOP dropdown)
   */
  var navbarLinks = document.querySelectorAll('.navbar-link');
  navbarLinks.forEach(function(link){
    link.addEventListener('click', function(e){
      // Skip if it's the SHOP dropdown toggle
      if (link.closest('.has-dropdown')) {
        return;
      }
      navbar?.classList.remove('active');
      overlay?.classList.remove('active');
    });
  });

  // Contact Us link - navigate to footer
  var serviceContactLink = document.getElementById('service-contact-link');
  if (serviceContactLink) {
    serviceContactLink.href = '#site-footer';
    serviceContactLink.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.hash = 'site-footer';
      document.getElementById('site-footer').scrollIntoView({ behavior: 'smooth' });
    });
  }

  /**
   * Auto-Update Copyright Year
   * Dynamically sets current year in footer and policy pages
   */
  var yearHome = document.getElementById('yearHome');
  if (yearHome) {
    yearHome.textContent = new Date().getFullYear();
  }
  var yearElements = document.querySelectorAll('#year');
  yearElements.forEach(function(el) {
    el.textContent = new Date().getFullYear();
  });
});