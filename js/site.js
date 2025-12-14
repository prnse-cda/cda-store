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
})();
