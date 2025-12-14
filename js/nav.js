// js/nav.js
// Common navbar behaviors for all pages: auto-close on outside click or link click,
// and toggle solid background on scroll or when collapse is open.
(function(){
  var collapseEl = document.getElementById('navbarNav');
  var navbar = document.querySelector('nav.navbar');
  if (!navbar) return;

  // Auto-close mobile navbar when clicking outside or on a nav link
  if (collapseEl && typeof bootstrap !== 'undefined') {
    document.addEventListener('click', function(e) {
      var isOpen = collapseEl.classList.contains('show');
      if (!isOpen) return;
      var clickedInside = e.target.closest('.navbar') || e.target.closest('.navbar-toggler');
      if (clickedInside) return;
      try {
        var bsCollapse = bootstrap.Collapse.getInstance(collapseEl) || new bootstrap.Collapse(collapseEl, { toggle: false });
        bsCollapse.hide();
      } catch (_) {
        collapseEl.classList.remove('show');
      }
    }, true);

    var links = collapseEl.querySelectorAll('.nav-link, .dropdown-item');
    links.forEach(function(link){
      link.addEventListener('click', function(){
        try {
          var bsCollapse = bootstrap.Collapse.getInstance(collapseEl) || new bootstrap.Collapse(collapseEl, { toggle: false });
          bsCollapse.hide();
        } catch (_) {
          collapseEl.classList.remove('show');
        }
      });
    });
  }

  // Solid background after scroll or when mobile menu is open
  (function(){
    var nav = document.querySelector('nav.fixed-navbar');
    if (!nav) return;
    function updateSolid() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var isOpen = collapseEl && collapseEl.classList.contains('show');
      nav.classList.toggle('navbar-solid', y > 24 || !!isOpen);
    }
    updateSolid();
    window.addEventListener('scroll', updateSolid, { passive: true });
    window.addEventListener('resize', updateSolid);
    if (collapseEl) {
      collapseEl.addEventListener('shown.bs.collapse', updateSolid);
      collapseEl.addEventListener('hidden.bs.collapse', updateSolid);
    }
  })();
})();
