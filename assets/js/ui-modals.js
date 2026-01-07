(function(){
  window.showAlert = function(message, type = 'default', duration = 4000) {
    let overlay = document.getElementById('cda-alert-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cda-alert-overlay';
      overlay.className = 'cda-alert-overlay';
      document.body.appendChild(overlay);
    }

    const alertBox = document.createElement('div');
    alertBox.className = 'cda-alert';
    if (type === 'success' || type === 'error') {
      alertBox.classList.add(type);
    }
    alertBox.textContent = message;

    alertBox.style.animationDuration = `0.5s, 0.5s`;
    alertBox.style.animationDelay = `0s, ${duration / 1000}s`;

    overlay.appendChild(alertBox);

    setTimeout(() => {
      alertBox.remove();
      if (overlay.children.length === 0) {
        overlay.remove();
      }
    }, duration + 500);
  };

  window.showConfirm = function(message, onConfirm) {
    // Remove existing confirm modal if any
    const existingModal = document.getElementById('cda-confirm-overlay');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal
    const overlay = document.createElement('div');
    overlay.id = 'cda-confirm-overlay';
    overlay.className = 'cda-confirm-overlay';

    const confirmBox = document.createElement('div');
    confirmBox.className = 'cda-confirm';

    confirmBox.innerHTML = `
      <p class="cda-confirm-message">${message}</p>
      <div class="cda-confirm-actions">
        <button class="btn btn-secondary" id="cda-confirm-cancel">Cancel</button>
        <button class="btn btn-primary" id="cda-confirm-ok">Confirm</button>
      </div>
    `;

    overlay.appendChild(confirmBox);
    document.body.appendChild(overlay);

    // Force reflow to enable transitions
    void overlay.offsetWidth;

    overlay.style.opacity = '1';
    confirmBox.style.transform = 'scale(1)';

    const close = () => {
      overlay.style.opacity = '0';
      confirmBox.style.transform = 'scale(0.9)';
      setTimeout(() => {
        overlay.remove();
      }, 300);
    };

    document.getElementById('cda-confirm-ok').onclick = () => {
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
      close();
    };

    document.getElementById('cda-confirm-cancel').onclick = () => {
      close();
    };
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
      }
    });
  };
})();
