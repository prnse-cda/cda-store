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

  // Append mobile-only socials (Instagram/Facebook) at bottom of the collapsed menu
  try {
    if (collapseEl && !collapseEl.querySelector('.navbar-mobile-socials')) {
      var socials = document.createElement('div');
      socials.className = 'navbar-mobile-socials d-lg-none';
      socials.innerHTML = `
        <hr class="mt-3 mb-2" />
        <div class="d-flex align-items-center justify-content-start gap-3 pb-3 ps-2">
          <a href="https://www.instagram.com/cathys_dreamy_attire/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="text-decoration-none">
            <i class="fa fa-instagram fa-2x"></i>
          </a>
          <a href="https://www.facebook.com/CathysDreamyAttire/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="text-decoration-none">
            <i class="fa fa-facebook-square fa-2x"></i>
          </a>
        </div>`;
      collapseEl.appendChild(socials);
    }
  } catch(_) {}
})();
