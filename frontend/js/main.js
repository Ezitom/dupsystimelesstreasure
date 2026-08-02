// Dupsy's Timeless Treasure - Main JavaScript Utilities

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initActiveNav();
  initMobileNav();
});

// SVG Icons for Theme Toggle Button
const SUN_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

const MOON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

// Theme Management (Persisted in localStorage)
function initTheme() {
  const savedTheme = localStorage.getItem('dtt_theme');
  const isDark = (savedTheme === 'dark');

  if (isDark) {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }

  updateLogoForTheme(isDark);

  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  themeToggleBtns.forEach(btn => {
    updateThemeIcon(btn, isDark);
    
    btn.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      const nowDark = document.body.classList.contains('dark-theme');
      localStorage.setItem('dtt_theme', nowDark ? 'dark' : 'light');
      updateThemeIcon(btn, nowDark);
      updateLogoForTheme(nowDark);
    });
  });
}

function updateLogoForTheme(isDark) {
  const logoImgs = document.querySelectorAll('.brand-logo-img');
  logoImgs.forEach(img => {
    const isHorizontal = img.src.includes('horizontal');
    if (isDark) {
      img.src = isHorizontal ? '/images/dupsys-logo-horizontal.png' : '/images/dupsys-logo-transparent.png';
    } else {
      img.src = isHorizontal ? '/images/dupsys-logo-horizontal-black.png' : '/images/dupsys-logo-transparent-black.png';
    }
  });
}

function updateThemeIcon(btn, isDark) {
  if (isDark) {
    btn.innerHTML = SUN_SVG;
    btn.setAttribute('title', 'Switch to Light Theme');
  } else {
    btn.innerHTML = MOON_SVG;
    btn.setAttribute('title', 'Switch to Dark Theme');
  }
}

// Active Nav Link Matcher
function initActiveNav() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '/' && href === '/')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Mobile Navigation Toggle
function initMobileNav() {
  const toggleBtn = document.querySelector('.mobile-nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (toggleBtn && navMenu) {
    const iconMenu = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    const iconClose = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('active');
      toggleBtn.innerHTML = navMenu.classList.contains('active') ? iconClose : iconMenu;
    });

    // Close menu when clicking any nav link
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        toggleBtn.innerHTML = iconMenu;
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        navMenu.classList.remove('active');
        toggleBtn.innerHTML = iconMenu;
      }
    });
  }
}

// Utility: Format Currency
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '₦' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Utility: Show Alert Notice
function showAlert(containerId, message, type = 'success') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
  container.innerHTML = `
    <div class="alert-box ${alertClass}">
      ${message}
    </div>
  `;
}

// Utility: HTML Escaping
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
