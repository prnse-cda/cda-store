'use strict';

/**
 * Core UI interactions and navigation:
 * - Navbar open/close and scroll header state
 * - SHOP dropdown behavior on mobile/desktop
 * - URL hash navigation for products, collections, filters
 * - Policy overlay loader (shipping/refund/privacy) with dynamic contacts
 * - Footer contact scroll, year updates, and brand name injection
 */



/**
 * navbar toggle
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
 * header & go top btn active on page scroll
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
 * Shop dropdown & Contact scroll
 */
document.addEventListener('DOMContentLoaded', function(){
  
  /**
   * Dropdown toggle for mobile and close on click for desktop
   */
  const dropdownParent = document.querySelector('.navbar-item.has-dropdown');
  const dropdownLink = dropdownParent?.querySelector('.navbar-link');
  const dropdownMenu = dropdownParent?.querySelector('.dropdown-menu');
  
  if (dropdownParent && dropdownLink) {
    // Mobile: Toggle dropdown on SHOP link click, prevent navbar close
    dropdownLink.addEventListener('click', function(e) {
      if (window.innerWidth <= 991) {
        e.preventDefault();
        e.stopPropagation();
        dropdownParent.classList.toggle('active');
      }
    });
  }
  
  /**
   * URL Hash Navigation System
   */
  /** Handle URL hash changes for deep-link navigation */
  function handleHashNavigation() {
    const hash = window.location.hash;
    
    if (!hash || hash === '#') {
      // Home - scroll to top
      window.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }
    
    // Check if it's a product URL (#product=ABC&size=M or #product=ABC)
    if (hash.startsWith('#product=')) {
      const params = new URLSearchParams(hash.substring(1));
      const productId = params.get('product');
      const size = params.get('size');
      
      if (productId && window.openProductDetail) {
        // Wait for products to load, then open modal
        setTimeout(function() {
          window.openProductDetail(productId, size);
        }, 1000);
      }
      return;
    }
    
    // Check if it's a collection URL (#collection=Final+Sale)
    if (hash.startsWith('#collection=')) {
      const collectionName = decodeURIComponent(hash.substring(12)); // Remove #collection=
      setTimeout(function() {
        if (window.selectGroup) {
          window.selectGroup(collectionName);
          document.getElementById('product-section')?.scrollIntoView({behavior: 'smooth'});
        }
      }, 500);
      return;
    }
    
    // Check if it's a filter URL (#filter=CO-ORDS)
    if (hash.startsWith('#filter=')) {
      const filterLabel = decodeURIComponent(hash.substring(8)); // Remove #filter=
      setTimeout(function() {
        if (window.selectFilter) {
          window.selectFilter(filterLabel);
          document.getElementById('product-section')?.scrollIntoView({behavior: 'smooth'});
        }
      }, 500);
      return;
    }
    
    // Regular section navigation
    const targetId = hash.substring(1); // Remove #
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      setTimeout(function() {
        targetElement.scrollIntoView({behavior: 'smooth', block: 'start'});
      }, 100);
    }
  }
  
  // Handle hash changes
  window.addEventListener('hashchange', handleHashNavigation);
  
  // Handle initial page load with hash
  if (window.location.hash) {
    handleHashNavigation();
  }

  // Apply brand name from inputs.js to header and footer
  var brandName = (window.CDA_INPUTS && window.CDA_INPUTS.brand_name) ? window.CDA_INPUTS.brand_name : '';
  try {
    var brandEl = document.querySelector('.navbar-brand-text');
    if (brandEl && brandName) brandEl.textContent = brandName;
    var footerStrong = document.querySelector('.footer-brand strong');
    if (footerStrong && brandName) footerStrong.textContent = brandName + '™';
    var copyElName = document.getElementById('brand-copy-name');
    if (copyElName && brandName) copyElName.textContent = brandName;
  } catch (_) {}
  
  // Update navbar link behavior to close mobile menu (except SHOP dropdown)
  var navbarLinks = document.querySelectorAll('.navbar-link');
  navbarLinks.forEach(function(link){
    link.addEventListener('click', function(e){
      // Don't close if it's the SHOP dropdown link
      if (link.closest('.has-dropdown')) {
        return;
      }
      // Close mobile nav if open
      navbar?.classList.remove('active');
      overlay?.classList.remove('active');
    });
  });

  /**
   * Policy overlay functionality
   */
  // Policy links
  var policyLinks = document.querySelectorAll('.policy-link');
  policyLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      var policyType = this.getAttribute('data-policy');
      openPolicyOverlay(policyType);
    });
  });
  
  // Footer policy links
  var footerLinks = document.querySelectorAll('a[href*="policy.html"]');
  footerLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      var href = this.getAttribute('href');
      var policyType = '';
      if (href.includes('shipping')) policyType = 'shipping';
      else if (href.includes('refund')) policyType = 'refund';
      else if (href.includes('privacy')) policyType = 'privacy';
      if (policyType) openPolicyOverlay(policyType);
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
  
  // Close overlay on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closePolicyOverlay();
    }
  });

  /**
   * Auto-update year
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

/**
 * Policy overlay functions
 */
/** Open a modal and load the requested policy HTML into it */
function openPolicyOverlay(policyType) {
  var overlay = document.getElementById('policy-modal');
  var content = document.getElementById('policy-content');
  
  var policyUrl = '';
  if (policyType === 'shipping') {
    policyUrl = 'policies/shipping-policy.html';
  } else if (policyType === 'refund') {
    policyUrl = 'policies/refund-policy.html';
  } else if (policyType === 'privacy') {
    policyUrl = 'policies/privacy-policy.html';
  }
  
  if (policyUrl) {
    // Fetch and load policy content
    fetch(policyUrl)
      .then(response => response.text())
      .then(html => {
        // Extract content between <main> tags
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var section = doc.querySelector('main section');
        if (section) {
          // Clone the section and remove the Back to Home button
          var clonedSection = section.cloneNode(true);
          var backButton = clonedSection.querySelector('.btn.btn-primary');
          if (backButton && backButton.parentElement) {
            backButton.parentElement.remove();
          }
          content.innerHTML = clonedSection.innerHTML;
          // Replace hardcoded brand name with configured brand_name
          try {
            var bName = (window.CDA_INPUTS && window.CDA_INPUTS.brand_name) ? window.CDA_INPUTS.brand_name : '';
            if (bName) {
              content.innerHTML = content.innerHTML.replace(/Cathy[’']s\s+Dreamy\s+Attire(?:™)?/g, bName + '™');
            }
          } catch(_) {}
          // Replace hardcoded contacts with dynamic ones from footer sheet
          var contacts = window.CDA_CONTACTS || null;
          if (contacts) {
            var strongs = content.querySelectorAll('strong');
            strongs.forEach(function(s){
              var txt = (s.textContent || '').trim();
              if (txt.includes('@') && contacts.email) {
                s.textContent = contacts.email;
              } else if (/[0-9]{8,}/.test(txt) && contacts.whatsapp) {
                var disp = contacts.whatsapp;
                if (disp.startsWith('91') && disp.length > 10) disp = disp.substring(disp.length - 10);
                s.textContent = '+91 ' + disp;
              }
            });
          }
        } else {
          content.innerHTML = '<div style="padding: 40px;"><h2>Content not found</h2></div>';
        }
        overlay.style.display = 'block';
        setTimeout(function() {
          overlay.classList.add('active');
        }, 10);
      })
      .catch(error => {
        console.error('Error loading policy:', error);
        content.innerHTML = '<div style="padding: 40px; text-align: center;"><h2>Error loading policy</h2><p>Please try again later.</p></div>';
        overlay.style.display = 'block';
        setTimeout(function() {
          overlay.classList.add('active');
        }, 10);
      });
  }
}

/** Close the policy modal and clear its content */
function closePolicyOverlay() {
  var overlay = document.getElementById('policy-modal');
  overlay.classList.remove('active');
  setTimeout(function() {
    overlay.style.display = 'none';
    document.getElementById('policy-content').innerHTML = '';
  }, 400);
}