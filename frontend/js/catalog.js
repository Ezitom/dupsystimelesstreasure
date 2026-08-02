// Catalog & Collections Management

document.addEventListener('DOMContentLoaded', () => {
  const productsContainer = document.getElementById('products-grid');
  const featuredContainer = document.getElementById('featured-grid');

  if (productsContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category') || 'all';

    // Set initial active filter button state
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      if (btn.getAttribute('data-category') === initialCategory) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    loadProducts(productsContainer, initialCategory);
    initCategoryFilters(productsContainer);

    // Scroll to filter section if category param was provided in URL
    if (urlParams.has('category')) {
      const filterGroup = document.getElementById('collections-filter-group');
      if (filterGroup) {
        filterGroup.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  if (featuredContainer) {
    loadFeaturedProducts(featuredContainer);
  }
});

async function loadProducts(container, category = 'all') {
  container.innerHTML = `<div class="catalog-state-msg">Loading collection...</div>`;
  
  try {
    const url = category && category !== 'all' ? `/api/products?category=${category}` : '/api/products';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch products');
    const products = await response.json();

    renderProducts(container, products);
  } catch (err) {
    console.error('Catalog load error:', err);
    container.innerHTML = `<div class="catalog-state-msg">Unable to load catalog. Please refresh or try again later.</div>`;
  }
}

async function loadFeaturedProducts(container) {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Failed to fetch products');
    const products = await response.json();
    
    // Display top 3 featured products
    renderProducts(container, products.slice(0, 3));
  } catch (err) {
    console.error('Featured load error:', err);
  }
}

function renderProducts(container, products) {
  if (products.length === 0) {
    container.innerHTML = `<div class="catalog-state-msg">No pieces available in this category at present.</div>`;
    return;
  }

  container.innerHTML = products.map(product => `
    <article class="product-card">
      <div class="product-img-wrapper">
        <a href="/product?id=${product.id}">
          <img src="${product.image_url}" alt="${escapeHtml(product.name)}" loading="lazy" />
        </a>
        <span class="product-tag">${escapeHtml(product.category)}</span>
      </div>
      <div class="product-info">
        <h3 class="product-title">
          <a href="/product?id=${product.id}">${escapeHtml(product.name)}</a>
        </h3>
        <p class="product-material">${escapeHtml(product.material)}</p>
        <div class="product-meta">
          <span class="product-price">${formatCurrency(product.price)}</span>
          <a href="/booking?product_id=${product.id}&product_name=${encodeURIComponent(product.name)}" class="btn btn-gold-outline btn-sm btn-reserve">Reserve This Piece</a>
        </div>
      </div>
    </article>
  `).join('');
}

function initCategoryFilters(container) {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const category = e.target.getAttribute('data-category');
      loadProducts(container, category);
    });
  });
}

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
