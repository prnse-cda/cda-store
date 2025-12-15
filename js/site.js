// js/site.js
// Small site-wide helpers: current year in footers, minor UI glue.
(function(){
  try {
    var year = new Date().getFullYear();
    // Set common footer year placeholders if present
    var ids = ['yearHome', 'year'];
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.textContent = year;
    });
  } catch(_) {}

  // GA4: Track WhatsApp link clicks (anchors pointing to wa.me)
  try {
    document.addEventListener('click', function(ev){
      var target = ev.target && ev.target.closest ? ev.target.closest('a[href*="wa.me"]') : null;
      if (!target) return;
      if (typeof gtag !== 'function') return;
      ev.preventDefault();
      var href = target.getAttribute('href');
      var openInNew = (target.getAttribute('target') === '_blank');
      var navigate = function(){
        if (openInNew) window.open(href, '_blank');
        else window.location.href = href;
      };
      var fired = false;
      try {
        gtag('event', 'whatsapp_click', {
          link_url: href,
          page_location: window.location.href,
          event_callback: function(){ if(!fired){ fired = true; navigate(); } },
          event_timeout: 1500
        });
        setTimeout(function(){ if(!fired) navigate(); }, 1600);
      } catch(_){ navigate(); }
    });
  } catch(_) {}

  // GA4: Track social icon clicks (Instagram/Facebook) via anchor hrefs
  try {
    document.addEventListener('click', function(ev){
      var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var isInstagram = /instagram\.com/i.test(href);
      var isFacebook = /facebook\.com/i.test(href);
      if (!isInstagram && !isFacebook) return;
      if (typeof gtag !== 'function') return;
      // Let default navigation happen; just fire event
      try {
        gtag('event', 'social_click', {
          network: isInstagram ? 'instagram' : 'facebook',
          link_url: href,
          page_location: window.location.href
        });
      } catch(_) {}
    });
  } catch(_) {}
})();
