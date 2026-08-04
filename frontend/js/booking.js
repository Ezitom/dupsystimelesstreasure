// Booking Form Logic & Zone-Based Delivery Fee Calculation

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('booking-form');
  const alertContainer = document.getElementById('booking-alert-container');
  const zoneSelect = document.getElementById('booking-delivery-zone');
  const submitBtn = document.getElementById('btn-submit-booking');
  const zonePrompt = document.getElementById('zone-select-prompt');

  const collectionPriceEl = document.getElementById('breakdown-collection-price');
  const deliveryFeeEl = document.getElementById('breakdown-delivery-fee');
  const totalAmountEl = document.getElementById('breakdown-total-amount');

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

  // State Management
  let collectionPrice = 3500.00; // Default bespoke price
  let deliveryFee = 0.00;
  let availableZones = [];

  function safeFormatCurrency(amount) {
    if (typeof formatCurrency === 'function') {
      return formatCurrency(amount);
    }
    const num = Number(amount) || 0;
    return '₦' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function updateBreakdown() {
    if (collectionPriceEl) collectionPriceEl.innerText = safeFormatCurrency(collectionPrice);
    if (deliveryFeeEl) deliveryFeeEl.innerText = safeFormatCurrency(deliveryFee);
    if (totalAmountEl) totalAmountEl.innerText = safeFormatCurrency(collectionPrice + deliveryFee);
  }

  // Fetch product price if product_id is specified
  if (productId) {
    try {
      const prodEndpoint = `/api/products/${productId}`;
      const prodUrl = (typeof getApiUrl === 'function') ? getApiUrl(prodEndpoint) : prodEndpoint;
      const res = await fetch(prodUrl);
      if (res.ok) {
        const prodData = await res.json();
        if (prodData && prodData.price) {
          collectionPrice = parseFloat(prodData.price);
          if (productNameInput && (!productNameInput.value || productNameInput.value === 'Custom Design')) {
            productNameInput.value = prodData.name;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch specific product price, using default:', e);
    }
  }

  updateBreakdown();

  // Initially disable button until zone selected
  if (submitBtn) submitBtn.disabled = true;
  if (zonePrompt) zonePrompt.style.display = 'block';

  // Load Delivery Zones dynamically from backend API
  try {
    const zonesEndpoint = '/api/delivery-zones';
    const zonesUrl = (typeof getApiUrl === 'function') ? getApiUrl(zonesEndpoint) : zonesEndpoint;
    const response = await fetch(zonesUrl);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      availableZones = contentType.includes('application/json') ? await response.json() : [];
      
      if (zoneSelect && availableZones.length > 0) {
        zoneSelect.innerHTML = `<option value="" disabled selected>-- Select Delivery Location --</option>` +
          availableZones.map(z => `
            <option value="${escapeHtml(z.zone_name)}" data-fee="${z.fee}">
              ${escapeHtml(z.zone_name)} (${safeFormatCurrency(z.fee)})
            </option>
          `).join('');
      }
    }
  } catch (err) {
    console.error('Error loading delivery zones:', err);
  }

  // Handle Zone Selection Change
  if (zoneSelect) {
    zoneSelect.addEventListener('change', (e) => {
      const selectedOption = zoneSelect.options[zoneSelect.selectedIndex];
      const feeVal = selectedOption ? parseFloat(selectedOption.getAttribute('data-fee')) : 0;
      
      if (!isNaN(feeVal) && zoneSelect.value) {
        deliveryFee = feeVal;
        updateBreakdown();
        
        // Enable submit button and hide prompt
        if (submitBtn) submitBtn.disabled = false;
        if (zonePrompt) zonePrompt.style.display = 'none';
      } else {
        deliveryFee = 0.00;
        updateBreakdown();
        if (submitBtn) submitBtn.disabled = true;
        if (zonePrompt) zonePrompt.style.display = 'block';
      }
    });
  }

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertContainer.innerHTML = '';

    if (!zoneSelect || !zoneSelect.value) {
      showAlert('booking-alert-container', 'Please select a delivery location before proceeding to payment.', 'error');
      return;
    }

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
      delivery_zone: zoneSelect.value,
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
