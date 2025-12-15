(function(){
  try {
    // Avoid duplicate
    if (document.getElementById('cd-whatsapp-float')) return;
    // Create floating WhatsApp button (mobile only via CSS)
    var a = document.createElement('a');
    a.id = 'cd-whatsapp-float';
    a.className = 'cd-whatsapp-float';
    a.href = 'https://wa.me/917907555924?text=Hello%20Cathy%E2%80%99s%20Dreamy%20Attire';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', 'Chat on WhatsApp');
    a.innerHTML = '<i class="fa fa-whatsapp" aria-hidden="true"></i>';
    document.body.appendChild(a);
  } catch(_) {}
})();
