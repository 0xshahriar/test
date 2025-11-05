function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('productContainer');
  const id = getQueryParam('id');
  if (!id) {
    container.innerHTML = '<div class="alert alert-danger">Product not found.</div>';
    return;
  }
  try {
    const response = await apiRequest('getProduct', { id }, 'POST');
    if (!response.ok) throw new Error(response.error || 'Unable to load product');
    const product = response.product;
    renderProduct(product);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="alert alert-danger">Unable to load product details.</div>';
  }
});

function renderProduct(product) {
  const container = document.getElementById('productContainer');
  const tags = (product.Tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
  container.innerHTML = `
    <div class="row g-5">
      <div class="col-md-6">
        <div class="ratio ratio-4x3 rounded-4 overflow-hidden shadow" id="productGallery">
          <img src="${product.ImageUrl || 'https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=800&q=80'}" class="w-100 h-100" alt="${product.Title}">
        </div>
      </div>
      <div class="col-md-6">
        <span class="badge badge-category mb-3">${product.Category || 'Collection'}</span>
        <h1 class="fw-bold">${product.Title}</h1>
        <p class="lead text-muted">${product.Description}</p>
        <h3 class="fw-semibold mb-4">$${Number(product.Price).toFixed(2)}</h3>
        <div class="d-flex align-items-center gap-2 mb-4">
          <label class="form-label mb-0" for="quantityInput">Quantity</label>
          <input type="number" id="quantityInput" class="form-control" value="1" min="1" style="width: 120px;">
        </div>
        <button class="btn btn-primary btn-lg" id="addToCartBtn">Add to Cart</button>
        <div class="mt-4">
          ${tags.length ? '<h6 class="text-uppercase text-muted">Tags</h6>' : ''}
          ${tags.map((tag) => `<span class="badge bg-light text-dark me-2 mb-2">${tag}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
  document.getElementById('addToCartBtn').addEventListener('click', () => {
    const quantity = Math.max(1, parseInt(document.getElementById('quantityInput').value, 10) || 1);
    addToCart({
      id: product.ID,
      title: product.Title,
      price: Number(product.Price),
      imageUrl: product.ImageUrl,
      quantity
    });
    const toast = document.createElement('div');
    toast.className = 'alert alert-success mt-3';
    toast.textContent = 'Added to cart!';
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  });
}
