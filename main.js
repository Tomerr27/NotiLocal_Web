/* El Diario Nacional — main.js */

// Duplicar el ticker para loop infinito suave
(function initTicker() {
  const track = document.getElementById('ticker');
  if (!track) return;
  const clone = track.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  track.parentElement.appendChild(clone);
  // Ajustar animación al ancho real
  const totalW = track.scrollWidth;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ticker-scroll {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-${totalW}px); }
    }
  `;
  document.head.appendChild(style);
})();

// Highlight de nav al hacer scroll
(function initNavHighlight() {
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
})();

// Toast de newsletter
(function initNewsletter() {
  const btn = document.querySelector('.newsletter-form button');
  const input = document.querySelector('.newsletter-form input');
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const email = input.value.trim();
    if (!email || !email.includes('@')) {
      input.style.borderColor = '#D63031';
      input.focus();
      return;
    }
    input.style.borderColor = '';
    btn.textContent = '¡Suscrito!';
    btn.style.background = '#00B894';
    input.value = '';
    input.disabled = true;
    btn.disabled = true;

    setTimeout(() => {
      btn.textContent = 'Suscribirme';
      btn.style.background = '';
      input.disabled = false;
      btn.disabled = false;
    }, 4000);
  });
})();

// Actualizar fecha/hora en vivo
(function initClock() {
  const dateTags = document.querySelectorAll('.date-tag');
  if (!dateTags.length) return;
  const opts = {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  };
  function update() {
    const now = new Date().toLocaleDateString('es-MX', opts);
    dateTags.forEach(el => el.textContent = now);
  }
  update();
  setInterval(update, 60000);
})();
