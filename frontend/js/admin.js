// Admin Authentication & Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');
  const dashboardContainer = document.getElementById('admin-dashboard-container');

  // Handle Login Page
  if (loginForm) {
    // If already logged in, redirect to dashboard
    const existingToken = localStorage.getItem('dtt_admin_token');
    if (existingToken) {
      verifyTokenAndRedirect(existingToken);
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('admin-username').value.trim();
      const passwordInput = document.getElementById('admin-password').value;

      document.getElementById('admin-login-alert').innerHTML = '';

      try {
        const url = (typeof getApiUrl === 'function') ? getApiUrl('/api/auth/login') : '/api/auth/login';
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await response.json() : {};

        if (!response.ok) {
          throw new Error(data.error || 'Login failed.');
        }

        localStorage.setItem('dtt_admin_token', data.token);
        window.location.href = '/admin/dashboard';
      } catch (err) {
        console.error('Login error:', err);
        showAlert('admin-login-alert', err.message, 'error');
      }
    });
  }

  // Handle Dashboard Page
  if (dashboardContainer) {
    const token = localStorage.getItem('dtt_admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }

    verifyToken(token).then(isValid => {
      if (!isValid) {
        localStorage.removeItem('dtt_admin_token');
        window.location.href = '/admin/login';
        return;
      }
      initDashboard();
    });
  }
});

async function verifyToken(token) {
  try {
    const url = (typeof getApiUrl === 'function') ? getApiUrl('/api/auth/verify') : '/api/auth/verify';
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.ok;
  } catch (err) {
    return false;
  }
}

async function verifyTokenAndRedirect(token) {
  const isValid = await verifyToken(token);
  if (isValid) {
    window.location.href = '/admin/dashboard';
  }
}

// Dashboard Initialization
function initDashboard() {
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('dtt_admin_token');
      window.location.href = '/admin/login';
    });
  }

  // Navigation Tabs
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabBookings = document.getElementById('tab-content-bookings');
  const tabProducts = document.getElementById('tab-content-products');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');
      if (targetTab === 'bookings') {
        tabBookings.style.display = 'block';
        tabProducts.style.display = 'none';
        loadAdminBookings();
      } else {
        tabBookings.style.display = 'none';
        tabProducts.style.display = 'block';
        loadAdminProducts();
      }
    });
  });

  // Load initial tab
  loadAdminBookings();

  // Modal setup for Products
  initProductModal();
}

// --- BOOKINGS MANAGEMENT --- //

function isMobile() {
  return window.innerWidth < 768;
}

async function loadAdminBookings() {
  const tableWrapper = document.getElementById('tab-content-bookings');
  const tbody = document.getElementById('bookings-tbody');
  if (!tableWrapper) return;

  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem;">Loading bookings...</td></tr>`;
  }

  try {
    const token = localStorage.getItem('dtt_admin_token');
    const url = (typeof getApiUrl === 'function') ? getApiUrl('/api/bookings') : '/api/bookings';
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to load bookings');
    const contentType = response.headers.get('content-type') || '';
    const bookings = contentType.includes('application/json') ? await response.json() : [];

    renderBookingsTable(bookings);
  } catch (err) {
    console.error('Admin bookings fetch error:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--accent-gold); padding: 2rem;">Error loading bookings. Please refresh.</td></tr>`;
    }
  }
}

// Mobile Card Rendering
function renderBookingsCards(bookings) {
  const container = document.getElementById('tab-content-bookings');

  // Replace table with card container
  container.innerHTML = '';

  if (bookings.length === 0) {
    container.innerHTML = `<p style="text-align: center; padding: 2rem; color: var(--text-muted);">No bookings recorded yet.</p>`;
    return;
  }

  bookings.forEach(b => {
    const hasPaymentLink = Boolean(b.payment_link && b.payment_link.trim());
    const card = document.createElement('div');
    card.className = 'booking-card';
    card.innerHTML = `
      <div class="booking-card-header">
        <a href="/order/${escapeHtml(b.reference)}" target="_blank" class="booking-card-ref">${escapeHtml(b.reference)}</a>
        <span class="status-badge status-${b.status}">${b.status.toUpperCase()}</span>
      </div>
      <div class="booking-card-grid">
        <div class="booking-card-field">
          <span class="booking-card-label">Client</span>
          <span class="booking-card-value">${escapeHtml(b.full_name)}</span>
        </div>
        <div class="booking-card-field">
          <span class="booking-card-label">Fitting Date</span>
          <span class="booking-card-value">${escapeHtml(b.preferred_date)}</span>
        </div>
        <div class="booking-card-field">
          <span class="booking-card-label">Piece</span>
          <span class="booking-card-value">${escapeHtml(b.product_name)}</span>
        </div>
        <div class="booking-card-field">
          <span class="booking-card-label">Phone</span>
          <span class="booking-card-value">${escapeHtml(b.phone)}</span>
        </div>
        <div class="booking-card-field" style="grid-column: 1 / -1;">
          <span class="booking-card-label">Email</span>
          <span class="booking-card-value">${escapeHtml(b.email)}</span>
        </div>
        <div class="booking-card-field" style="grid-column: 1 / -1;">
          <span class="booking-card-label">Delivery Address</span>
          <span class="booking-card-value">${escapeHtml(b.address)}</span>
          ${(b.nearest_park || b.pickup_location) ? `<div style="font-size: 0.8rem; color: var(--accent-gold); font-weight: 600; margin-top: 0.25rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 0.25rem;"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>Park: ${escapeHtml(b.nearest_park || b.pickup_location)}</div>` : ''}
        </div>
      </div>
      <div class="booking-card-actions">
        <div class="booking-card-status-row">
          <label>Update Status:</label>
          <select class="form-control status-select" data-id="${b.id}" style="flex: 1; padding: 0.4rem 0.5rem; font-size: 0.8rem;">
            <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>PENDING</option>
            <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>CONFIRMED</option>
            <option value="shipped" ${b.status === 'shipped' ? 'selected' : ''}>SHIPPED</option>
            <option value="delivered" ${b.status === 'delivered' ? 'selected' : ''}>DELIVERED</option>
          </select>
        </div>
        ${hasPaymentLink ? `
          <div>
            <span class="booking-card-label">Payment Link</span>
            <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.25rem;">
              <a href="${escapeHtml(b.payment_link)}" target="_blank" class="booking-card-value" style="color: var(--accent-gold); text-decoration: underline; flex: 1; word-break: break-all; font-size: 0.8rem;">${escapeHtml(b.payment_link)}</a>
              <button class="btn btn-outline btn-sm edit-paylink-btn" data-id="${b.id}" data-link="${escapeHtml(b.payment_link)}" style="padding: 0.3rem 0.6rem; font-size: 0.7rem; white-space: nowrap;">Update</button>
            </div>
          </div>
        ` : `
          <div>
            <span class="booking-card-label" style="display: block; margin-bottom: 0.4rem;">Send Payment Link</span>
            <div class="booking-card-paylink-row">
              <input type="url" class="form-control paylink-input" id="paylink-input-${b.id}" placeholder="https://paystack.com/pay/..." />
              <button class="btn btn-primary btn-sm send-paylink-btn" data-id="${b.id}" style="white-space: nowrap; padding: 0.4rem 0.75rem; font-size: 0.75rem;">Send</button>
            </div>
          </div>
        `}
        ${b.notes ? `
          <div>
            <span class="booking-card-label">Notes</span>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem; font-style: italic;">${escapeHtml(b.notes)}</p>
          </div>
        ` : ''}
        <div style="margin-top: 0.75rem;">
          <span class="booking-card-label" style="display: block; margin-bottom: 0.4rem;">Pickup Location <span style="color: var(--text-muted); font-size: 0.7rem;">(required before marking Shipped)</span></span>
          <input type="text" class="form-control pickup-location-input" id="pickup-loc-${b.id}" data-id="${b.id}" placeholder="e.g. ABC Park, 12 Lagos Island" value="${escapeHtml(b.pickup_location || '')}" style="font-size: 0.8rem; margin-bottom: 0.4rem;">
          <span class="booking-card-label" style="display: block; margin-bottom: 0.4rem;">Pickup Contact Number</span>
          <div style="display: flex; gap: 0.5rem;">
            <input type="tel" class="form-control pickup-contact-input" id="pickup-con-${b.id}" data-id="${b.id}" placeholder="e.g. 08012345678" value="${escapeHtml(b.pickup_contact_number || '')}" style="font-size: 0.8rem; flex: 1;">
            <button class="btn btn-outline btn-sm save-pickup-btn" data-id="${b.id}" style="white-space: nowrap; padding: 0.4rem 0.75rem; font-size: 0.75rem;">Save</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  attachBookingEventListeners();
}

// Desktop Table Rendering
function renderBookingsTable(bookings) {
  // Restore table markup if it was replaced by cards
  const container = document.getElementById('tab-content-bookings');
  if (!container.querySelector('.admin-table-container')) {
    container.innerHTML = `
      <div class="mobile-scroll-hint">&larr; Swipe horizontally to view full table details &rarr;</div>
      <div class="admin-table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Ref Code</th>
              <th>Client Contact</th>
              <th>Requested Piece</th>
              <th>Fitting Date</th>
              <th>Delivery Address</th>
              <th>Payment Status</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Pickup Details</th>
            </tr>
          </thead>
          <tbody id="bookings-tbody"></tbody>
        </table>
      </div>`;
  }

  const tbody = document.getElementById('bookings-tbody');
  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">No bookings recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const isPaid = (b.payment_status === 'paid' || b.status === 'confirmed' || b.status === 'shipped' || b.status === 'delivered');
    const isFailed = (b.payment_status === 'failed');

    return `
      <tr>
        <td style="white-space: nowrap;">
          <a href="/order/${escapeHtml(b.reference)}" target="_blank" style="color: var(--accent-gold); text-decoration: underline; font-weight: bold; white-space: nowrap;">
            ${escapeHtml(b.reference)}
          </a>
        </td>
        <td style="max-width: 130px;">
          <div style="font-weight: 600; line-height: 1.25; font-size: 0.8rem;">${escapeHtml(b.full_name)}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.2rem; word-break: break-all;">${escapeHtml(b.email)}<br>${escapeHtml(b.phone)}</div>
        </td>
        <td style="max-width: 120px; font-size: 0.78rem; line-height: 1.3;">${escapeHtml(b.product_name)}</td>
        <td style="white-space: nowrap; font-size: 0.75rem;">${escapeHtml(b.preferred_date)}</td>
        <td style="max-width: 140px; font-size: 0.75rem; color: var(--text-secondary); line-height: 1.3; word-break: break-word;">
          ${escapeHtml(b.address)}
          ${(b.nearest_park || b.pickup_location) ? `<div style="margin-top: 0.25rem; font-size: 0.7rem; color: var(--accent-gold); font-weight: 600;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 0.2rem;"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>Park: ${escapeHtml(b.nearest_park || b.pickup_location)}</div>` : ''}
        </td>
        <td style="min-width: 110px; white-space: nowrap;">
          ${isPaid ? `
            <span style="background-color: #2e7d32; color: #ffffff; padding: 0.2rem 0.45rem; font-size: 0.68rem; font-weight: bold; border-radius: 2px; display: inline-block;">PAID</span>
            <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 0.15rem; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(b.paystack_ref || b.reference)}">
              Ref: ${escapeHtml(b.paystack_ref || b.reference)}
            </div>
          ` : isFailed ? `
            <span style="background-color: #c62828; color: #ffffff; padding: 0.2rem 0.45rem; font-size: 0.68rem; font-weight: bold; border-radius: 2px; display: inline-block;">FAILED</span>
          ` : `
            <span style="background-color: #f57f17; color: #ffffff; padding: 0.2rem 0.45rem; font-size: 0.68rem; font-weight: bold; border-radius: 2px; display: inline-block;">UNPAID</span>
          `}
        </td>
        <td style="min-width: 110px; max-width: 125px; white-space: nowrap;">
          <select class="form-control status-select" data-id="${b.id}">
            <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>PENDING</option>
            <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>CONFIRMED</option>
            <option value="shipped" ${b.status === 'shipped' ? 'selected' : ''}>SHIPPED</option>
            <option value="delivered" ${b.status === 'delivered' ? 'selected' : ''}>DELIVERED</option>
          </select>
        </td>
        <td style="white-space: nowrap; text-align: center;">
          <button class="btn btn-outline btn-sm view-notes-btn" data-notes="${escapeHtml(b.notes || 'No notes provided')}" style="padding: 0.25rem 0.6rem; font-size: 0.72rem; white-space: nowrap; display: inline-block;">Notes</button>
        </td>
        <td style="min-width: 150px; max-width: 165px;">
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <input type="text" class="form-control pickup-location-input" id="pickup-loc-${b.id}" data-id="${b.id}" placeholder="Pickup location" value="${escapeHtml(b.pickup_location || '')}" style="padding: 0.2rem 0.35rem; font-size: 0.7rem; height: 26px;">
            <div style="display: flex; gap: 0.2rem;">
              <input type="tel" class="form-control pickup-contact-input" id="pickup-con-${b.id}" data-id="${b.id}" placeholder="Pickup phone" value="${escapeHtml(b.pickup_contact_number || '')}" style="padding: 0.2rem 0.35rem; font-size: 0.7rem; height: 26px; flex: 1;">
              <button class="btn btn-outline btn-sm save-pickup-btn" data-id="${b.id}" style="padding: 0.15rem 0.4rem; font-size: 0.65rem; height: 26px; white-space: nowrap;">Save</button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  attachBookingEventListeners();
}

function attachBookingEventListeners() {
  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      await updateBookingStatus(e.target.getAttribute('data-id'), e.target.value);
    });
  });

  document.querySelectorAll('.view-notes-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      alert(`Consultation Notes:\n\n${e.target.getAttribute('data-notes')}`);
    });
  });

  document.querySelectorAll('.save-pickup-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const bookingId = e.target.getAttribute('data-id');
      const locEl = document.getElementById(`pickup-loc-${bookingId}`);
      const conEl = document.getElementById(`pickup-con-${bookingId}`);
      const loc = locEl ? locEl.value.trim() : '';
      const con = conEl ? conEl.value.trim() : '';
      await savePickupDetails(bookingId, loc, con);
    });
  });
}

async function savePickupDetails(id, pickup_location, pickup_contact_number) {
  if (!pickup_location && !pickup_contact_number) {
    showAlert('admin-dash-alert', 'Please enter at least a pickup location or contact number before saving.', 'error');
    return;
  }
  try {
    const token = localStorage.getItem('dtt_admin_token');
    const endpoint = `/api/bookings/${id}/pickup`;
    const url = (typeof getApiUrl === 'function') ? getApiUrl(endpoint) : endpoint;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ pickup_location, pickup_contact_number })
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : {};
    if (!response.ok) throw new Error(data.error || 'Failed to save pickup details');

    showAlert('admin-dash-alert', 'Pickup details saved successfully.', 'success');
  } catch (err) {
    console.error('Pickup save error:', err);
    showAlert('admin-dash-alert', err.message, 'error');
  }
}

async function updateBookingStatus(id, status) {
  // Client-side guard: if admin selects 'shipped', check that pickup fields are filled
  if (status === 'shipped') {
    const locEl = document.getElementById(`pickup-loc-${id}`);
    const conEl = document.getElementById(`pickup-con-${id}`);
    const loc = locEl ? locEl.value.trim() : '';
    const con = conEl ? conEl.value.trim() : '';
    if (!loc || !con) {
      showAlert(
        'admin-dash-alert',
        'Cannot mark as Shipped: Pickup Location and Pickup Contact Number must both be filled in and saved first.',
        'error'
      );
      // Reset the select back to its previous value by reloading
      loadAdminBookings();
      return;
    }
  }

  try {
    const token = localStorage.getItem('dtt_admin_token');
    const endpoint = `/api/bookings/${id}/status`;
    const url = (typeof getApiUrl === 'function') ? getApiUrl(endpoint) : endpoint;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : {};

    if (!response.ok) throw new Error(data.error || 'Failed to update status');

    showAlert('admin-dash-alert', `Booking status updated to ${status.toUpperCase()} and notification sent via Email & WhatsApp!`, 'success');
  } catch (err) {
    console.error('Status update error:', err);
    showAlert('admin-dash-alert', err.message, 'error');
    // Reload to reset the select dropdown to the real status
    loadAdminBookings();
  }
}

// --- PRODUCTS MANAGEMENT (CRUD) --- //
async function loadAdminProducts() {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;">Loading catalog...</td></tr>`;

  try {
    const url = (typeof getApiUrl === 'function') ? getApiUrl('/api/products') : '/api/products';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load products');
    const contentType = response.headers.get('content-type') || '';
    const products = contentType.includes('application/json') ? await response.json() : [];

    renderProductsTable(products);
  } catch (err) {
    console.error('Admin products fetch error:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--accent-gold);">Error loading products.</td></tr>`;
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('products-tbody');
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No products in catalog.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr>
      <td>
        <img src="${p.image_url}" alt="${escapeHtml(p.name)}" style="width: 48px; height: 48px; object-fit: cover; border: 1px solid var(--border-color);" />
      </td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td style="text-transform: capitalize;">${escapeHtml(p.category)}</td>
      <td>${escapeHtml(p.material)}</td>
      <td>${formatCurrency(p.price)}</td>
      <td>
        <button class="btn btn-outline btn-sm edit-prod-btn" data-prod='${JSON.stringify(p).replace(/'/g, "&apos;")}'>Edit</button>
        <button class="btn btn-gold-outline btn-sm delete-prod-btn" data-id="${p.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  // Attach Edit Listeners
  document.querySelectorAll('.edit-prod-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prodData = JSON.parse(e.target.getAttribute('data-prod'));
      openProductModal('edit', prodData);
    });
  });

  // Attach Delete Listeners
  document.querySelectorAll('.delete-prod-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this product piece?')) {
        await deleteProduct(id);
      }
    });
  });
}

function initProductModal() {
  const modal = document.getElementById('product-modal');
  const addBtn = document.getElementById('add-product-btn');
  const closeBtn = document.getElementById('product-modal-close');
  const form = document.getElementById('product-form');

  if (!modal || !form) return;

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openProductModal('add');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = document.getElementById('modal-mode').value;
    const prodId = document.getElementById('modal-prod-id').value;

    const payload = {
      name: document.getElementById('modal-name').value.trim(),
      category: document.getElementById('modal-category').value,
      price: parseFloat(document.getElementById('modal-price').value),
      material: document.getElementById('modal-material').value.trim(),
      image_url: document.getElementById('modal-image-url').value.trim() || '/images/sovereign-ring.jpg',
      description: document.getElementById('modal-description').value.trim(),
      availability: document.getElementById('modal-availability').checked
    };

    try {
      const token = localStorage.getItem('dtt_admin_token');
      const endpoint = mode === 'add' ? '/api/products' : `/api/products/${prodId}`;
      const url = (typeof getApiUrl === 'function') ? getApiUrl(endpoint) : endpoint;
      const method = mode === 'add' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : {};

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save product');
      }

      modal.classList.remove('active');
      showAlert('admin-dash-alert', `Product ${mode === 'add' ? 'created' : 'updated'} successfully!`, 'success');
      loadAdminProducts();
    } catch (err) {
      console.error('Product save error:', err);
      alert(err.message);
    }
  });
}

function openProductModal(mode, product = null) {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('product-form');

  if (!modal || !form) return;

  document.getElementById('modal-mode').value = mode;
  document.getElementById('modal-prod-id').value = product ? product.id : '';

  if (mode === 'add') {
    title.innerText = 'Add New Jewelry Piece';
    form.reset();
    document.getElementById('modal-image-url').value = '/images/sovereign-ring.jpg';
  } else {
    title.innerText = 'Edit Jewelry Piece';
    document.getElementById('modal-name').value = product.name;
    document.getElementById('modal-category').value = product.category;
    document.getElementById('modal-price').value = product.price;
    document.getElementById('modal-material').value = product.material;
    document.getElementById('modal-image-url').value = product.image_url;
    document.getElementById('modal-description').value = product.description;
    document.getElementById('modal-availability').checked = product.availability;
  }

  modal.classList.add('active');
}

async function deleteProduct(id) {
  try {
    const token = localStorage.getItem('dtt_admin_token');
    const endpoint = `/api/products/${id}`;
    const url = (typeof getApiUrl === 'function') ? getApiUrl(endpoint) : endpoint;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to delete product');

    showAlert('admin-dash-alert', 'Product piece deleted successfully.', 'success');
    loadAdminProducts();
  } catch (err) {
    console.error('Product delete error:', err);
    showAlert('admin-dash-alert', err.message, 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '₦' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
