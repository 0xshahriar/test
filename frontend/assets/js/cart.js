function renderCart() {
  const container = document.getElementById('cartContainer');
  const cart = getCart();
  if (!cart.length) {
    container.innerHTML = '<div class="alert alert-info">Your cart is empty. Explore our <a href="products.html" class="alert-link">collections</a>.</div>';
    document.getElementById('checkoutBtn').classList.add('disabled');
    return;
  }
  document.getElementById('checkoutBtn').classList.remove('disabled');
  let total = 0;
  const rows = cart.map((item) => {
    const lineTotal = item.price * item.quantity;
    total += lineTotal;
    return `
      <tr>
        <td class="d-flex align-items-center gap-3">
          <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=200&q=80'}" class="rounded" width="72" height="72" alt="${item.title}">
          <div>
            <div class="fw-semibold">${item.title}</div>
            <div class="text-muted">$${item.price.toFixed(2)}</div>
          </div>
        </td>
        <td style="width: 140px;">
          <input type="number" class="form-control" min="1" value="${item.quantity}" data-cart-quantity="${item.id}">
        </td>
        <td class="fw-semibold">$${lineTotal.toFixed(2)}</td>
        <td class="text-end">
          <button class="btn btn-outline-danger btn-sm" data-remove-id="${item.id}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');
  container.innerHTML = `
    <div class="table-responsive">
      <table class="table align-middle">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="d-flex justify-content-end">
      <div class="text-end">
        <div class="text-muted">Subtotal</div>
        <div class="fs-4 fw-bold">$${total.toFixed(2)}</div>
      </div>
    </div>
  `;
  container.querySelectorAll('[data-remove-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.removeId);
      renderCart();
    });
  });
  container.querySelectorAll('[data-cart-quantity]').forEach((input) => {
    input.addEventListener('change', () => {
      const qty = Math.max(1, parseInt(input.value, 10) || 1);
      updateCartItem(input.dataset.cartQuantity, qty);
      renderCart();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', (event) => {
      const session = getStoredSession();
      if (!session || session.role !== 'customer') {
        event.preventDefault();
        const loginUrl = new URL('login.html', window.location.href);
        loginUrl.searchParams.set('next', 'checkout.html');
        window.location.href = loginUrl.toString();
      }
    });
  }
});
