function formatOrderDate(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

async function loadOrders() {
  const ordersBody = document.getElementById('ordersTableBody');
  const alertContainer = document.getElementById('ordersAlert');
  const orderCount = document.getElementById('orderCount');
  if (!ordersBody) return;
  ordersBody.innerHTML = '<tr><td colspan="5" class="text-muted text-center py-4">Loading your orders...</td></tr>';
  alertContainer.innerHTML = '';
  try {
    const response = await apiRequest('listMyOrders');
    if (!response.ok) throw new Error(response.error || 'Unable to load orders');
    const orders = response.orders || [];
    if (orderCount) {
      orderCount.textContent = orders.length === 1 ? '1 order' : `${orders.length} orders`;
    }
    if (!orders.length) {
      ordersBody.innerHTML = '<tr><td colspan="5" class="text-muted text-center py-4">No orders yet. Start a story in the <a href="products.html" class="link-secondary">shop</a>.</td></tr>';
      return;
    }
    ordersBody.innerHTML = orders.map((order) => {
      const status = (order.Status || '').toString().toLowerCase();
      const canCancel = status === 'pending';
      const badgeClass = status === 'pending'
        ? 'bg-warning text-dark'
        : status === 'confirmed'
        ? 'bg-primary'
        : status === 'delivered'
        ? 'bg-success'
        : status === 'cancelled'
        ? 'bg-secondary'
        : 'bg-light text-dark';
      return `
        <tr>
          <td class="text-break">${order.ID}</td>
          <td>${formatOrderDate(order.CreatedAt)}</td>
          <td>${formatCurrency(order.Total)}</td>
          <td><span class="badge ${badgeClass} text-uppercase">${order.Status || 'pending'}</span></td>
          <td class="text-end">
            ${canCancel
              ? `<button class="btn btn-sm btn-outline-danger" data-cancel-order="${order.ID}">Cancel order</button>`
              : '<span class="text-muted small">No actions</span>'}
          </td>
        </tr>
      `;
    }).join('');
    ordersBody.querySelectorAll('[data-cancel-order]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const target = event.currentTarget;
        const orderId = target.getAttribute('data-cancel-order');
        try {
          target.disabled = true;
          const cancelResponse = await apiRequest('cancelOrder', { orderId });
          if (!cancelResponse.ok) throw new Error(cancelResponse.error || 'Unable to cancel order');
          alertContainer.innerHTML = '<div class="alert alert-success">Order cancelled successfully.</div>';
          loadOrders();
          return;
        } catch (error) {
          console.error(error);
          alertContainer.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
          target.disabled = false;
        }
      });
    });
  } catch (error) {
    console.error(error);
    ordersBody.innerHTML = '<tr><td colspan="5" class="text-danger text-center py-4">Failed to load orders.</td></tr>';
    alertContainer.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
    if (orderCount) {
      orderCount.textContent = '0 orders';
    }
  }
}

function bindDeleteAccount() {
  const form = document.getElementById('deleteAccountForm');
  const feedback = document.getElementById('accountFeedback');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.innerHTML = '';
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }
    if (!confirm('This action permanently deletes your account. Continue?')) {
      return;
    }
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      const password = document.getElementById('deletePassword').value;
      const response = await apiRequest('deleteAccount', { password });
      if (!response.ok) throw new Error(response.error || 'Unable to delete account');
      feedback.innerHTML = '<div class="alert alert-success">Your account has been deleted. Redirecting…</div>';
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (error) {
      console.error(error);
      feedback.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
      submitButton.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const session = requireAuth(['customer']);
  if (!session) return;
  const nameTarget = document.getElementById('accountName');
  const emailTarget = document.getElementById('accountEmail');
  if (nameTarget) {
    nameTarget.textContent = session.name || 'Valued customer';
  }
  if (emailTarget) {
    emailTarget.textContent = session.email || 'Email available after next sign in.';
  }
  bindDeleteAccount();
  loadOrders();
});
