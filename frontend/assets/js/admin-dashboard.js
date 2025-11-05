let productsCache = [];
let productModalInstance;

async function loadDashboard() {
  await Promise.all([loadProducts(), loadOrders(), loadContacts()]);
}

async function loadProducts() {
  const tableBody = document.querySelector('#productsTable tbody');
  if (!tableBody) return;
  try {
    const response = await apiRequest('listProducts', { status: 'all' });
    if (!response.ok) throw new Error(response.error || 'Unable to fetch products');
    productsCache = response.products || [];
    document.getElementById('statProducts').textContent = productsCache.length;
    tableBody.innerHTML = productsCache.map((product) => `
      <tr>
        <td>${product.Title}</td>
        <td>${product.Category || '-'}</td>
        <td>$${Number(product.Price).toFixed(2)}</td>
        <td><span class="badge ${product.Status === 'active' ? 'bg-success' : 'bg-secondary'}">${product.Status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary me-2" data-edit="${product.ID}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-delete="${product.ID}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
    tableBody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openProductModal(btn.dataset.edit));
    });
    tableBody.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.delete));
    });
  } catch (error) {
    console.error(error);
    tableBody.innerHTML = '<tr><td colspan="5" class="text-danger">Failed to load products.</td></tr>';
  }
}

async function loadOrders() {
  const tableBody = document.querySelector('#ordersTable tbody');
  if (!tableBody) return;
  try {
    const response = await apiRequest('listOrders');
    if (!response.ok) throw new Error(response.error || 'Unable to fetch orders');
    const orders = response.orders || [];
    document.getElementById('statOrders').textContent = orders.length;
    tableBody.innerHTML = orders.map((order) => `
      <tr>
        <td>${order.ID}</td>
        <td>${order.UserEmail}</td>
        <td>$${Number(order.Total || 0).toFixed(2)}</td>
        <td>${order.Status}</td>
        <td>${order.PaymentStatus}</td>
        <td>${order.CreatedAt}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error(error);
    tableBody.innerHTML = '<tr><td colspan="6" class="text-danger">Failed to load orders.</td></tr>';
  }
}

async function loadContacts() {
  const tableBody = document.querySelector('#contactsTable tbody');
  if (!tableBody) return;
  try {
    const response = await apiRequest('listContacts');
    if (!response.ok) throw new Error(response.error || 'Unable to fetch contacts');
    const contacts = response.contacts || [];
    document.getElementById('statContacts').textContent = contacts.length;
    tableBody.innerHTML = contacts.map((contact) => `
      <tr>
        <td>${contact.Name}</td>
        <td>${contact.Email}</td>
        <td>${contact.Subject}</td>
        <td>${contact.CreatedAt}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error(error);
    tableBody.innerHTML = '<tr><td colspan="4" class="text-danger">Failed to load contact requests.</td></tr>';
  }
}

function openProductModal(productId) {
  const form = document.getElementById('productForm');
  if (!form) return;
  form.reset();
  document.getElementById('productId').value = '';
  document.getElementById('productModalLabel').textContent = 'Add Product';
  if (productId) {
    const product = productsCache.find((item) => item.ID === productId);
    if (!product) return;
    document.getElementById('productModalLabel').textContent = 'Edit Product';
    document.getElementById('productId').value = product.ID;
    document.getElementById('productTitle').value = product.Title || '';
    document.getElementById('productCategory').value = product.Category || '';
    document.getElementById('productPrice').value = product.Price || '';
    document.getElementById('productInventory').value = product.Inventory || 0;
    document.getElementById('productImage').value = product.ImageUrl || '';
    document.getElementById('productTags').value = product.Tags || '';
    document.getElementById('productDescription').value = product.Description || '';
    document.getElementById('productStatus').value = product.Status || 'draft';
  }
  productModalInstance.show();
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    const response = await apiRequest('deleteProduct', { id });
    if (!response.ok) throw new Error(response.error || 'Unable to delete product');
    await loadProducts();
  } catch (error) {
    alert(error.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const session = requireAuth(['admin']);
  if (!session) return;
  const modalElement = document.getElementById('productModal');
  productModalInstance = new bootstrap.Modal(modalElement);

  document.getElementById('logoutAdmin').addEventListener('click', (event) => {
    event.preventDefault();
    logout();
  });

  document.querySelector('[data-bs-target="#productModal"]').addEventListener('click', () => openProductModal());

  document.getElementById('productForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = document.getElementById('productId').value;
    const payload = {
      title: document.getElementById('productTitle').value.trim(),
      category: document.getElementById('productCategory').value.trim(),
      price: parseFloat(document.getElementById('productPrice').value),
      inventory: parseInt(document.getElementById('productInventory').value, 10),
      imageUrl: document.getElementById('productImage').value.trim(),
      tags: document.getElementById('productTags').value.split(',').map((tag) => tag.trim()).filter(Boolean),
      description: document.getElementById('productDescription').value.trim(),
      status: document.getElementById('productStatus').value
    };
    try {
      let response;
      if (id) {
        response = await apiRequest('updateProduct', Object.assign({ id }, payload));
      } else {
        response = await apiRequest('addProduct', payload);
      }
      if (!response.ok) throw new Error(response.error || 'Unable to save product');
      productModalInstance.hide();
      await loadProducts();
    } catch (error) {
      alert(error.message);
    }
  });

  loadDashboard();
});
