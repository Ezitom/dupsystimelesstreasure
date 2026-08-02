// Single Product Detail Logic

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('product-detail-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    container.innerHTML = `
      <div class="text-center section-padding">
        <h2>No Piece Specified</h2>
        <p class="section-description" style="margin-top: 0.5rem; margin-bottom: 1.5rem;">Please choose a piece from our collection portfolio.</p>
        <a href="/collections" class="btn btn-primary">Browse Collections</a>
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) throw new Error('Product not found');
    const product = await response.json();

    document.title = `${product.name} - Dupsy's Timeless Treasure`;

    container.innerHTML = `
      <div class="product-detail-layout">
        <div class="product-detail-gallery">
          <img src="${product.image_url}" alt="${escapeHtml(product.name)}" />
        </div>
        <div class="product-detail-content">
          <span class="section-subtitle">${escapeHtml(product.category)}</span>
          <h1 class="product-detail-title">${escapeHtml(product.name)}</h1>
          <div class="product-detail-price">${formatCurrency(product.price)}</div>
          
          <div class="product-detail-meta">
            <div>
              <span class="meta-item-label">Crafted Material</span>
              <span class="meta-item-value">${escapeHtml(product.material)}</span>
            </div>
            <div>
              <span class="meta-item-label">Availability</span>
              <span class="meta-item-value text-gold">
                ${product.availability ? 'Available for Custom Fitting' : 'Bespoke Order Only'}
              </span>
            </div>
          </div>

          <p class="product-detail-desc">${escapeHtml(product.description)}</p>

          <div class="product-detail-actions">
            <a href="/booking?product_id=${product.id}&product_name=${encodeURIComponent(product.name)}" class="btn btn-gold-outline w-100 btn-reserve">
              Reserve This Piece
            </a>
            <a href="/collections" class="btn btn-outline">
              Back to Catalog
            </a>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Product detail error:', err);
    container.innerHTML = `
      <div class="text-center section-padding">
        <h2>Piece Not Found</h2>
        <p class="section-description" style="margin-top: 0.5rem; margin-bottom: 1.5rem;">The requested jewelry piece could not be located in our portfolio.</p>
        <a href="/collections" class="btn btn-primary">Return to Catalog</a>
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
