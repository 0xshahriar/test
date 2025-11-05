function getCart() {
  try {
    return JSON.parse(localStorage.getItem('tt_cart')) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('tt_cart', JSON.stringify(cart));
  document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((entry) => entry.id === item.id);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push(item);
  }
  saveCart(cart);
}

function updateCartItem(id, quantity) {
  const cart = getCart().map((item) => {
    if (item.id === id) {
      return Object.assign({}, item, { quantity });
    }
    return item;
  }).filter((item) => item.quantity > 0);
  saveCart(cart);
}

function removeFromCart(id) {
  const cart = getCart().filter((item) => item.id !== id);
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

function renderCartBadge() {
  const badgeTargets = document.querySelectorAll('[data-cart-count]');
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  badgeTargets.forEach((el) => {
    el.textContent = total > 0 ? total : '';
    el.classList.toggle('d-none', total === 0);
  });
}

document.addEventListener('DOMContentLoaded', renderCartBadge);
document.addEventListener('cart:updated', renderCartBadge);
