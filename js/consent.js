(function(){
  var KEY = 'cd_consent_choice_v1';
  var choice = null;
  try { choice = localStorage.getItem(KEY); } catch(_) {}

  function updateConsent(granted){
    try {
      if (typeof gtag === 'function') {
        gtag('consent', 'update', {
          ad_storage: granted ? 'granted' : 'denied',
          analytics_storage: granted ? 'granted' : 'denied',
          ad_user_data: granted ? 'granted' : 'denied',
          ad_personalization: granted ? 'granted' : 'denied'
        });
      }
    } catch(_) {}
  }

  function renderBanner(){
    var banner = document.createElement('div');
    banner.id = 'cdConsentBanner';
    banner.style.position = 'fixed';
    banner.style.bottom = '0';
    banner.style.left = '0';
    banner.style.right = '0';
    banner.style.zIndex = '2000';
    banner.style.background = '#111';
    banner.style.color = '#fff';
    banner.style.padding = '12px';
    banner.style.display = 'flex';
    banner.style.flexWrap = 'wrap';
    banner.style.alignItems = 'center';
    banner.style.gap = '8px';
    banner.innerHTML = '<span style="flex:1; min-width: 220px;">We use Google Analytics to improve our website. Consent enables measurement cookies. You can continue without analytics.</span>'+
      '<div style="display:flex; gap:8px;">'+
      '<button id="cdConsentAccept" class="btn btn-sm btn-primary">Allow analytics</button>'+
      '<button id="cdConsentDeny" class="btn btn-sm btn-outline-light">Continue without</button>'+
      '</div>';
    document.body.appendChild(banner);

    document.getElementById('cdConsentAccept').addEventListener('click', function(){
      try { localStorage.setItem(KEY, 'granted'); } catch(_) {}
      updateConsent(true);
      banner.remove();
    });
    document.getElementById('cdConsentDeny').addEventListener('click', function(){
      try { localStorage.setItem(KEY, 'denied'); } catch(_) {}
      updateConsent(false);
      banner.remove();
    });
  }

  // On load: apply stored choice or show banner
  if (choice === 'granted') {
    updateConsent(true);
  } else if (choice === 'denied') {
    updateConsent(false);
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderBanner);
    } else {
      renderBanner();
    }
  }
})();