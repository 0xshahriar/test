document.addEventListener('DOMContentLoaded', () => {
  const session = requireAuth(['customer', 'admin']);
  const summary = document.getElementById('checkoutSummary');
  const message = document.getElementById('checkoutMessage');
  const form = document.getElementById('checkoutForm');
  const cart = getCart();
  if (!cart.length) {
    summary.innerHTML = '<p class="text-muted">Your cart is empty.</p>';
    form.classList.add('d-none');
    return;
  }
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  summary.innerHTML = `
    <ul class="list-group list-group-flush mb-3">
      ${cart.map((item) => `<li class="list-group-item d-flex justify-content-between align-items-center"><span>${item.title} × ${item.quantity}</span><span>$${(item.price * item.quantity).toFixed(2)}</span></li>`).join('')}
    </ul>
    <div class="d-flex justify-content-between fw-bold">
      <span>Subtotal</span>
      <span>$${subtotal.toFixed(2)}</span>
    </div>
    <p class="text-muted mt-2">Payment pending. Orders marked as unpaid until manual confirmation.</p>
  `;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const items = cart.map((item) => ({ id: item.id, title: item.title, quantity: item.quantity, price: item.price }));
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    try {
      const response = await apiRequest('createOrder', { items, total });
      if (!response.ok) throw new Error(response.error || 'Unable to create order');
      message.innerHTML = '<div class="alert alert-success">Order placed! We will contact you with payment details.</div>';
      clearCart();
      form.reset();
      form.classList.add('d-none');
    } catch (error) {
      console.error(error);
      message.innerHTML = '<div class="alert alert-danger">Unable to submit order. Please try again.</div>';
    }
  });
});
