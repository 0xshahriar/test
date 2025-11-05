async function loadProducts() {
  const results = document.getElementById('productResults');
  const emptyState = document.getElementById('productEmpty');
  if (!results) return;
  const query = document.getElementById('searchInput').value.trim();
  const category = document.getElementById('categoryFilter').value;
  try {
    const response = await apiRequest('listProducts', { query, category, status: 'active' }, 'POST');
    if (!response.ok) throw new Error(response.error || 'Failed to load');
    const products = response.products || [];
    if (!products.length) {
      results.innerHTML = '';
      emptyState.classList.remove('d-none');
      return;
    }
    emptyState.classList.add('d-none');
    const categories = new Set(['']);
    results.innerHTML = products.map((product) => {
      categories.add(product.Category || '');
      return `
        <div class="col-md-4">
          <div class="card h-100 shadow-sm border-0">
            <img src="${product.ImageUrl || 'https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=800&q=80'}" class="card-img-top" alt="${product.Title}">
            <div class="card-body d-flex flex-column">
              <span class="badge badge-category align-self-start mb-2">${product.Category || 'Collection'}</span>
              <h5 class="card-title">${product.Title}</h5>
              <p class="card-text text-muted flex-grow-1">${(product.Description || '').substring(0, 140)}...</p>
              <div class="d-flex justify-content-between align-items-center">
                <span class="fw-bold">$${Number(product.Price).toFixed(2)}</span>
                <a href="product.html?id=${encodeURIComponent(product.ID)}" class="btn btn-outline-primary btn-sm">Discover</a>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    populateCategories(categories, products);
  } catch (error) {
    console.error(error);
    results.innerHTML = '<p class="text-danger">Unable to load products right now.</p>';
  }
}

function populateCategories(set, products) {
  const filter = document.getElementById('categoryFilter');
  if (!filter || filter.dataset.initialized) return;
  const categories = Array.from(new Set(products.map((p) => p.Category).filter(Boolean))).sort();
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    filter.appendChild(option);
  });
  filter.dataset.initialized = 'true';
}

document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('searchInput');
  const filter = document.getElementById('categoryFilter');
  if (search) search.addEventListener('input', () => setTimeout(loadProducts, 250));
  if (filter) filter.addEventListener('change', loadProducts);
  loadProducts();
});
