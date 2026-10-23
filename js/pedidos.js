document.addEventListener("DOMContentLoaded", () => {
  const body = document.querySelector(".orders tbody"); if (!body) return;
  const { keys, read, money, escape, currentUser } = PetLove, user = currentUser(), orders = read(keys.orders, []).filter(order => user && order.customerEmail === user.email);
  body.innerHTML = orders.length ? orders.map(order => `<tr><td>${escape(order.id)}</td><td>${new Date(order.date).toLocaleDateString("es-CO")}</td><td>${money(order.total)}</td><td><span class="badge">${escape(order.status)}</span></td></tr>`).join("") : `<tr><td colspan="4">Aún no tienes pedidos. Cuando completes una compra aparecerán aquí.</td></tr>`;
});
