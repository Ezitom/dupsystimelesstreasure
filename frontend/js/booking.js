// Booking Form Logic

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('booking-form');
  const resultBox = document.getElementById('booking-result-box');
  const alertContainer = document.getElementById('booking-alert-container');

  if (!form) return;

  // Pre-fill parameters if present in URL
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('product_id');
  const productName = urlParams.get('product_name');

  const productIdInput = document.getElementById('booking-product-id');
  const productNameInput = document.getElementById('booking-product-name');

  if (productId && productIdInput) {
    productIdInput.value = productId;
  }
  if (productName && productNameInput) {
    productNameInput.value = decodeURIComponent(productName);
  }

  // Set minimum date to today
  const dateInput = document.getElementById('booking-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertContainer.innerHTML = '';

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin-icon"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
        Initializing Paystack Checkout...
      </span>
    `;

    const nearestParkEl = document.getElementById('booking-nearest-park');
    const nearestParkVal = nearestParkEl ? nearestParkEl.value.trim() : '';

    const payload = {
      product_id: document.getElementById('booking-product-id').value || null,
      product_name: document.getElementById('booking-product-name').value || 'Custom Fitting Consultation',
      full_name: document.getElementById('booking-full-name').value.trim(),
      phone: document.getElementById('booking-phone').value.trim(),
      email: document.getElementById('booking-email').value.trim(),
      address: document.getElementById('booking-address').value.trim(),
      nearest_park: nearestParkVal,
      preferred_date: document.getElementById('booking-date').value,
      category: document.getElementById('booking-category').value,
      notes: document.getElementById('booking-notes').value.trim()
    };

    try {
      const url = (typeof getApiUrl === 'function') ? getApiUrl('/api/paystack/initialize') : '/api/paystack/initialize';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : {};

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize Paystack checkout.');
      }

      submitBtn.innerHTML = 'Redirecting to Checkout...';

      // Redirect to Paystack Hosted Checkout URL
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error('No checkout URL returned from payment provider.');
      }

    } catch (err) {
      console.error('Paystack initialization error:', err);
      showAlert('booking-alert-container', err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
