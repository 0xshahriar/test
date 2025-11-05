document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('featuredProducts');
  if (!container) return;
  try {
    const response = await apiRequest('listProducts', { status: 'active' }, 'POST');
    if (response.ok && response.products) {
      const featured = response.products.slice(0, 3);
      if (!featured.length) {
        container.innerHTML = '<p class="text-muted">New treasures arriving soon. Stay tuned!</p>';
        return;
      }
      container.innerHTML = featured.map((product) => `
        <div class="col-md-4">
          <div class="card h-100 shadow-sm border-0">
            <img src="${product.ImageUrl || 'https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=800&q=80'}" class="card-img-top" alt="${product.Title}">
            <div class="card-body d-flex flex-column">
              <span class="badge badge-category align-self-start mb-2">${product.Category || 'Collection'}</span>
              <h5 class="card-title">${product.Title}</h5>
              <p class="card-text flex-grow-1 text-muted">${(product.Description || '').substring(0, 120)}...</p>
              <div class="d-flex justify-content-between align-items-center">
                <span class="fw-bold">$${Number(product.Price).toFixed(2)}</span>
                <a href="product.html?id=${encodeURIComponent(product.ID)}" class="btn btn-outline-primary btn-sm">View</a>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p class="text-danger">Unable to load featured items.</p>';
    }
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="text-danger">Something went wrong. Please try again later.</p>';
  }
});
