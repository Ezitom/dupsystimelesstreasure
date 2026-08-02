// Order Tracking Logic

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('track-form');
  const resultContainer = document.getElementById('track-result-container');
  const alertContainer = document.getElementById('track-alert-container');

  if (!form) return;

  // Check for pre-populated query params
  const urlParams = new URLSearchParams(window.location.search);
  const refParam = urlParams.get('reference');
  const idParam = urlParams.get('identifier');

  if (refParam) {
    document.getElementById('track-reference').value = refParam;
  }
  if (idParam) {
    document.getElementById('track-identifier').value = decodeURIComponent(idParam);
  }

  if (refParam && idParam) {
    performTracking(refParam, idParam);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const reference = document.getElementById('track-reference').value.trim();
    const identifier = document.getElementById('track-identifier').value.trim();

    if (!reference || !identifier) {
      showAlert('track-alert-container', 'Please provide both reference code and email or phone.', 'error');
      return;
    }

    performTracking(reference, identifier);
  });

  async function performTracking(reference, identifier) {
    alertContainer.innerHTML = '';
    resultContainer.style.display = 'none';

    try {
      const endpoint = `/api/bookings/track?reference=${encodeURIComponent(reference)}&identifier=${encodeURIComponent(identifier)}`;
      const url = (typeof getApiUrl === 'function') ? getApiUrl(endpoint) : endpoint;
      const response = await fetch(url);
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : {};

      if (!response.ok) {
        throw new Error(data.error || 'No booking found matching those details.');
      }

      renderTrackingResult(data);
    } catch (err) {
      console.error('Tracking fetch error:', err);
      showAlert('track-alert-container', err.message, 'error');
    }
  }

  function renderTrackingResult(booking) {
    resultContainer.style.display = 'block';
    const statusClass = `status-${booking.status.toLowerCase()}`;

    resultContainer.innerHTML = `
      <div class="tracking-result-box">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
          <div>
            <span class="section-subtitle">Reference Code</span>
            <h2 style="font-family: var(--font-heading); font-size: 2rem; color: var(--accent-gold);">${booking.reference}</h2>
          </div>
          <div>
            <span class="section-subtitle">Current Status</span>
            <span class="status-badge ${statusClass}">${booking.status.toUpperCase()}</span>
          </div>
        </div>

        <div class="tracking-grid">
          <div>
            <span class="meta-item-label">Client Name</span>
            <span class="meta-item-value">${escapeHtml(booking.full_name)}</span>
          </div>
          <div>
            <span class="meta-item-label">Requested Piece / Service</span>
            <span class="meta-item-value">${escapeHtml(booking.product_name)}</span>
          </div>
          <div>
            <span class="meta-item-label">Category</span>
            <span class="meta-item-value" style="text-transform: capitalize;">${escapeHtml(booking.category)}</span>
          </div>
          <div>
            <span class="meta-item-label">Preferred Fitting Date</span>
            <span class="meta-item-value">${escapeHtml(booking.preferred_date)}</span>
          </div>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <span class="meta-item-label">Delivery Address</span>
          <p style="color: var(--text-primary); margin-top: 0.25rem;">${escapeHtml(booking.address)}</p>
        </div>

        ${(booking.pickup_location || booking.pickup_contact_number) ? `
          <div style="background-color: var(--bg-elevated); border: 1px solid var(--accent-gold); padding: 1.25rem; margin-bottom: 1.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--accent-gold); font-weight: 600; font-size: 0.9rem; margin-bottom: 0.75rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
              <span>Collection & Pickup Information</span>
            </div>
            <div style="display: grid; gap: 0.75rem; font-size: 0.9rem;">
              <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 0.25rem; flex-shrink: 0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <div>
                  <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Pickup Location / Park</span>
                  <strong style="color: var(--text-primary);">${escapeHtml(booking.pickup_location || 'Not specified')}</strong>
                </div>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 0.25rem; flex-shrink: 0;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <div>
                  <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Contact Number at Pickup</span>
                  <strong style="color: var(--text-primary);">${escapeHtml(booking.pickup_contact_number || 'Not specified')}</strong>
                </div>
              </div>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.75rem; border-top: 1px dashed var(--border-color); padding-top: 0.5rem;">
              Please call the contact number above when you arrive at the location to collect your package.
            </p>
          </div>
        ` : ''}

        ${booking.notes ? `
          <div style="margin-bottom: 1.5rem;">
            <span class="meta-item-label">Special Consultation Notes</span>
            <p style="color: var(--text-secondary); margin-top: 0.25rem; font-style: italic;">"${escapeHtml(booking.notes)}"</p>
          </div>
        ` : ''}

        <div style="font-size: 0.8125rem; color: var(--text-muted); padding-top: 1rem; border-top: 1px solid var(--border-color);">
          Request Submitted: ${new Date(booking.created_at).toLocaleString()}
        </div>
      </div>
    `;
  }
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
