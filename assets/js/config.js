// ============================================
// USER CONFIGURATION - EDIT THESE VALUES ONLY
// ============================================

/**
 * Master CSV URL - Contains sheet ID mappings
 * Get this from: File > Share > Publish to web > Choose "Master" sheet > Get CSV link
 */
var MASTER_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRlK-Hr97VbQCH1UFQ4TUjdhcPbpX2cKbc-Oq05rc9XEQ1jz48rGN2zp4lTdtie9HRbBDHuK8gaF3ub/pub?gid=0&single=true&output=csv';

/**
 * Brand Name - Your store name
 * This will be shown immediately on page load (no delay)
 * Can still be overridden by footer CSV if brand_name column exists
 */
var BRAND_NAME = "Cathy's Dreamy Attire";

/**
 * WhatsApp Number - Your contact number (digits only)
 * Leave empty to fetch from footer CSV, or set here for immediate availability
 */
var WHATSAPP_NUMBER = "";

// ============================================
// END OF USER CONFIGURATION
// ============================================

// Make configuration available globally
window.MASTER_CSV_URL = MASTER_CSV_URL;
window.BRAND_NAME = BRAND_NAME;
window.WHATSAPP_NUMBER = WHATSAPP_NUMBER || null;
