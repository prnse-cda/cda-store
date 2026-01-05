/**
 * ============================================
 * CDA - Shared Utilities
 * ============================================
 * Common utility functions used across multiple scripts
 * Loaded first to make functions available globally
 */

(function() {
  'use strict';

  /**
   * ==========================================
   * GOOGLE DRIVE IMAGE UTILITIES
   * ==========================================
   * Functions to handle Google Drive image URLs
   * Converts various Drive URL formats to thumbnail URLs
   */

  /**
   * Extract Google Drive file ID from various URL formats
   * @param {string} token - Drive URL or ID
   * @returns {string|null} - Extracted file ID or null
   * 
   * Supported formats:
   * - Direct ID: 1a2b3c4d5e6f7g8h9i0j
   * - /d/{ID}/view
   * - ?id={ID}
   * - /uc?export=view&id={ID}
   */
  function extractDriveId(token) {
    if (!token) return null;
    const s = String(token).trim();
    
    // Direct ID (20+ alphanumeric chars)
    if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
    
    // URL patterns
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]{20,})/,           // /d/ID
      /[?&]id=([a-zA-Z0-9_-]{20,})/,          // ?id=ID
      /\/uc\?export=view&id=([a-zA-Z0-9_-]{20,})/  // /uc?export=view&id=ID
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const match = s.match(patterns[i]);
      if (match && match[1]) return match[1];
    }
    
    return null;
  }

  /**
   * Create Google Drive thumbnail URL
   * @param {string} id - Google Drive file ID
   * @param {number} size - Thumbnail width in pixels (default: 800)
   * @returns {string} - Thumbnail URL
   */
  function driveThumb(id, size) {
    size = size || 800;
    return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
  }

  /**
   * Convert comma-separated Drive IDs/URLs to image URL array
   * @param {string} token - Comma/semicolon separated Drive IDs or URLs
   * @returns {Array<string>} - Array of image URLs
   * 
   * Example input: "1abc123,2def456,https://drive.google.com/file/d/3ghi789/view"
   * Example output: ["https://drive.google.com/thumbnail?id=1abc123&sz=w800", ...]
   */
  function tokenToImgs(token) {
    if (!token) return [];
    
    return String(token)
      .split(/[,;]/)                    // Split by comma or semicolon
      .map(s => s.trim())               // Remove whitespace
      .filter(Boolean)                  // Remove empty strings
      .map(t => {
        const id = extractDriveId(t);
        return id ? driveThumb(id, 800) : t;
      });
  }

  /**
   * ==========================================
   * PRICE FORMATTING
   * ==========================================
   */

  /**
   * Format number as Indian Rupee
   * @param {string|number} value - Price value
   * @returns {string} - Formatted price (₹123.00)
   */
  function formatPrice(value) {
    const num = Number(String(value).replace(/[^0-9.-]+/g, '')) || 0;
    return `₹${num.toFixed(2)}`;
  }

  /**
   * ==========================================
   * NOTIFICATION SYSTEM
   * ==========================================
   */

  /**
   * Show toast notification
   * @param {string} message - Message to display
   * @param {string} type - Notification type: 'success', 'error', 'info'
   */
  function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.custom-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `custom-notification custom-notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Show confirmation dialog
   * @param {string} message - Message to display
   * @param {Function} onConfirm - Callback when user clicks OK
   */
  function showConfirm(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-confirm-overlay';
    overlay.innerHTML = `
      <div class="custom-confirm-box">
        <p>${message}</p>
        <div class="custom-confirm-buttons">
          <button class="btn-confirm-cancel">Cancel</button>
          <button class="btn-confirm-ok">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('.btn-confirm-cancel');
    const okBtn = overlay.querySelector('.btn-confirm-ok');

    cancelBtn.onclick = () => overlay.remove();
    okBtn.onclick = () => {
      overlay.remove();
      onConfirm();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  }

  // ==========================================
  // EXPOSE GLOBALLY
  // ==========================================
  window.CDA = window.CDA || {};
  window.CDA.extractDriveId = extractDriveId;
  window.CDA.driveThumb = driveThumb;
  window.CDA.tokenToImgs = tokenToImgs;
  window.CDA.formatPrice = formatPrice;
  window.CDA.showNotification = showNotification;
  window.CDA.showConfirm = showConfirm;

  // Legacy support (backwards compatibility)
  window.extractDriveId = extractDriveId;
  window.driveThumb = driveThumb;
  window.tokenToImgs = tokenToImgs;
  window.showNotification = showNotification;
  window.showConfirm = showConfirm;

})();
