// js/zoom.js
// Flipkart-like zoom panel (rectangular) placed to the right/left of the hovered image.
// Uses natural image resolution when available for crispness.
// Skip on touch devices.
//
// Fixes:
// - PANEL size is now computed responsively and the panel will prefer a square
//   based on the configured width (height follows width) so increasing width
//   actually increases height up to viewport limits.
// - ZOOM default >= 1 so the panel actually magnifies instead of shrinking.
//
// Usage:
// - Tweak ZOOM, MIN_PANEL, MAX_PANEL, or percent caps in computePanelSize()
// - The panel will resize on window resize automatically.

(function () {
  'use strict';

  const isTouchDevice = !!(window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches);

  // Tunables
  const ZOOM = 1.0;           // magnification factor (>=1 for magnify; 1.2 - 2.5 recommended)
  const MIN_PANEL = 360;      // smallest panel size (px)
  const MAX_PANEL = 900;      // largest panel size (px)
  const PANEL_VIEWPORT_WIDTH_PCT = 0.55; // max fraction of viewport width for panel
  const PANEL_VIEWPORT_HEIGHT_PCT = 0.75; // max fraction of viewport height for panel
  const GAP = 14;             // gap between cursor/image and panel
  const SELECTOR = '.product-media img, .card-product > img';

  let panel = null;

  // Compute responsive panel size (square preference)
  function computePanelSize() {
    const maxW = Math.round(window.innerWidth * PANEL_VIEWPORT_WIDTH_PCT);
    const maxH = Math.round(window.innerHeight * PANEL_VIEWPORT_HEIGHT_PCT);
    const size = Math.max(MIN_PANEL, Math.min(MAX_PANEL, Math.min(maxW, maxH)));
    return { w: size, h: size };
  }

  // Update panel size on resize (keeps values fresh)
  let CURRENT_PANEL = computePanelSize();
  window.addEventListener('resize', () => {
    CURRENT_PANEL = computePanelSize();
    if (panel) {
      // adjust visible panel immediately if open
      panel.style.width = CURRENT_PANEL.w + 'px';
      // height is set when shown (onEnter) to prefer square but clamp to viewport
    }
  });

  function createPanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'cd-zoom-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      width: CURRENT_PANEL.w + 'px',
      height: CURRENT_PANEL.h + 'px',
      borderRadius: '8px',
      boxShadow: '0 12px 36px rgba(0,0,0,0.28)',
      border: '1px solid rgba(0,0,0,0.06)',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '0 0',
      backgroundSize: '0 0',
      pointerEvents: 'none',
      zIndex: 120000,
      display: 'none',
      backgroundColor: '#fff',
      overflow: 'hidden'
    });
    document.body.appendChild(panel);
    return panel;
  }

  // --- Mobile: Fullscreen touch zoom overlay ---
  let mobileOverlay = null;
  let mobileInner = null;
  let mobileImg = null;
  function ensureMobileOverlay() {
    if (mobileOverlay) return mobileOverlay;
    mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'cd-zoom-mobile-overlay';
    Object.assign(mobileOverlay.style, {
      position: 'fixed', left: '0', top: '0', right: '0', bottom: '0',
      backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 120001, display: 'none'
    });

    mobileInner = document.createElement('div');
    Object.assign(mobileInner.style, {
      position: 'absolute', left: '0', top: '0', right: '0', bottom: '0',
      overflow: 'hidden', touchAction: 'none'
    });
    mobileImg = document.createElement('img');
    Object.assign(mobileImg.style, {
      position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) scale(1)',
      transformOrigin: 'center center', maxWidth: '90%', maxHeight: '90%', userSelect: 'none'
    });

    const closeHint = document.createElement('div');
    closeHint.textContent = 'Tap outside or pinch/drag. Double-tap to reset';
    Object.assign(closeHint.style, {
      position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: '12px',
      color: '#fff', fontSize: '12px', opacity: '0.7'
    });

    mobileInner.appendChild(mobileImg);
    mobileOverlay.appendChild(mobileInner);
    mobileOverlay.appendChild(closeHint);
    document.body.appendChild(mobileOverlay);

    // Gesture state
    let scale = 1, baseScale = 1;
    let dx = 0, dy = 0;
    let startDx = 0, startDy = 0;
    let lastTapTime = 0;
    let pinchStartDist = 0;

    function applyTransform() {
      mobileImg.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale})`;
    }

    function dist(t1, t2) {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx*dx + dy*dy);
    }

    mobileInner.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startDx = dx; startDy = dy;
      } else if (e.touches.length === 2) {
        pinchStartDist = dist(e.touches[0], e.touches[1]);
        baseScale = scale;
      }
    }, { passive: true });

    mobileInner.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        // drag
        dx = startDx + (e.touches[0].clientX - e.touches[0].screenX + e.touches[0].movementX || 0);
        dy = startDy + (e.touches[0].clientY - e.touches[0].screenY + e.touches[0].movementY || 0);
        applyTransform();
      } else if (e.touches.length === 2) {
        const d = dist(e.touches[0], e.touches[1]);
        const factor = d / (pinchStartDist || d);
        scale = Math.min(6, Math.max(1, baseScale * factor));
        applyTransform();
      }
    }, { passive: false });

    mobileInner.addEventListener('touchend', (e) => {
      // double-tap to reset
      const now = Date.now();
      if (e.touches.length === 0) {
        if (now - lastTapTime < 300) {
          scale = 1; dx = 0; dy = 0; applyTransform();
        }
        lastTapTime = now;
      }
    });

    function closeOverlay() {
      mobileOverlay.style.display = 'none';
    }

    // Close on any tap/click outside the image
    mobileOverlay.addEventListener('click', (e) => {
      if (!mobileImg.contains(e.target)) {
        closeOverlay();
      }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileOverlay.style.display === 'block') {
        closeOverlay();
      }
    });

    return mobileOverlay;
  }

  function openMobileZoom(src) {
    ensureMobileOverlay();
    if (!mobileOverlay || !mobileImg) return;
    mobileImg.src = src;
    mobileOverlay.style.display = 'block';
  }

  function attachZoomTo(img) {
    if (!img || img.dataset.cdZoomAttached) return;
    img.dataset.cdZoomAttached = '1';

    // If the image isn't loaded yet, wait for it so we can use naturalWidth/naturalHeight
    if (!img.complete) {
      img.addEventListener('load', () => attachZoomTo(img), { once: true });
      return;
    }

    // Touch devices: enable tap to open fullscreen zoom overlay
    if (isTouchDevice) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => {
        const src = img.currentSrc || img.src;
        if (!src) return;
        openMobileZoom(src);
      });
      return;
    }

    const pnl = createPanel();

    function onEnter(e) {
      const src = img.currentSrc || img.src;
      if (!src) return;

      // refresh panel size (responsive)
      CURRENT_PANEL = computePanelSize();
      pnl.style.width = CURRENT_PANEL.w + 'px';

      // Determine natural image size; fall back to displayed size
      const natW = img.naturalWidth || img.width;
      const natH = img.naturalHeight || img.height;
      const rect = img.getBoundingClientRect();

      // Prefer a square panel (width-driven). Clamp to viewport height so it never overflows.
      const maxAvailHeight = Math.max(120, window.innerHeight - 16);
      const desiredHeight = Math.min(CURRENT_PANEL.h, CURRENT_PANEL.w, maxAvailHeight);
      pnl.style.height = Math.round(desiredHeight) + 'px';

      // Compute background size using natural dimensions when available
      const bgW = (natW && natH) ? Math.round(natW * ZOOM) : Math.round(rect.width * ZOOM);
      const bgH = (natW && natH) ? Math.round(natH * ZOOM) : Math.round(rect.height * ZOOM);
      pnl.style.backgroundSize = `${bgW}px ${bgH}px`;
      pnl.style.backgroundImage = `url("${src}")`;

      // show panel
      pnl.style.display = 'block';
      pnl.style.opacity = '1';
    }

    function onMove(e) {
      const rect = img.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      // clamp cursor inside image bounding rect (so we don't show weird areas)
      const clampedX = Math.max(rect.left, Math.min(rect.right, clientX));
      const clampedY = Math.max(rect.top, Math.min(rect.bottom, clientY));

      // relative coordinates within displayed image
      const relX = (rect.width > 0) ? ((clampedX - rect.left) / rect.width) : 0.5;
      const relY = (rect.height > 0) ? ((clampedY - rect.top) / rect.height) : 0.5;

      // Ensure panel size reflects current responsive size (in case of resize while open)
      const panelW = pnl.offsetWidth || CURRENT_PANEL.w;
      const panelH = pnl.offsetHeight || Math.min(CURRENT_PANEL.h, CURRENT_PANEL.w, window.innerHeight - 16);

      // panel placement: prefer right side of image (near cursor), else viewport-right (like Flipkart), else left
      let preferredLeft = rect.right + GAP;
      let panelLeft = preferredLeft;
      if (panelLeft + panelW + 8 > window.innerWidth) {
        // try viewport right edge
        panelLeft = Math.max(window.innerWidth - panelW - 12, 8);
        // if this still overlaps the image (rare), place to left of image
        if (panelLeft + panelW > rect.left - GAP) {
          panelLeft = rect.left - GAP - panelW;
        }
      }

      // keep panel vertically centered around cursor (clamped)
      let panelTop = clientY - panelH / 2;
      panelTop = Math.max(8, Math.min(window.innerHeight - panelH - 8, panelTop));

      pnl.style.left = Math.round(panelLeft) + 'px';
      pnl.style.top = Math.round(panelTop) + 'px';

      // compute background offsets
      const natW = img.naturalWidth || img.width;
      const natH = img.naturalHeight || img.height;
      const bgW = (natW && natH) ? natW * ZOOM : rect.width * ZOOM;
      const bgH = (natW && natH) ? natH * ZOOM : rect.height * ZOOM;

      // target center in background to correspond to cursor relative position
      const targetX = relX * bgW;
      const targetY = relY * bgH;

      // We want the pixel under cursor to appear roughly at the center of the panel
      const offsetX = targetX - (panelW / 2);
      const offsetY = targetY - (panelH / 2);

      pnl.style.backgroundPosition = `-${Math.round(offsetX)}px -${Math.round(offsetY)}px`;
    }

    function onLeave() {
      pnl.style.display = 'none';
    }

    img.addEventListener('mouseenter', onEnter);
    img.addEventListener('mousemove', onMove);
    img.addEventListener('mouseleave', onLeave);
    // hide on scroll/resize to avoid stale rendering
    window.addEventListener('scroll', onLeave, { passive: true });
    window.addEventListener('resize', onLeave);
  }

  function attachAll() {
    if (!isTouchDevice) createPanel();
    const imgs = document.querySelectorAll(SELECTOR);
    imgs.forEach(img => attachZoomTo(img));
  }

  // MutationObserver to catch dynamically inserted images
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches(SELECTOR)) {
            attachZoomTo(node);
          } else if (node.querySelectorAll) {
            const nested = node.querySelectorAll(SELECTOR);
            if (nested && nested.length) nested.forEach(img => attachZoomTo(img));
          }
        });
      }
    }
  });

  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', () => observer.observe(document.body, { childList: true, subtree: true }));

  document.addEventListener('DOMContentLoaded', () => {
    attachAll();
    setTimeout(attachAll, 1200); // re-run for late-rendered content
  });

  // public helper to re-attach after manual renders
  window.cdZoomAttachAll = attachAll;

})();