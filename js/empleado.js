document.addEventListener("DOMContentLoaded", () => {
  const { keys, read, write, money, escape, currentUser } = PetLove;
  const user = currentUser();
  if (!user || user.role !== "empleado") return;

  const body = document.querySelector("[data-employee-orders]");
  const empty = document.querySelector("[data-no-orders]");
  const summary = document.querySelector("[data-orders-summary]");
  const statuses = ["Recibido", "En preparación", "Enviado", "Entregado", "Cancelado"];
  document.querySelector("[data-employee-name]").textContent = user.name;

  function draw() {
    const orders = read(keys.orders, []);
    summary.textContent = `${orders.length} pedido${orders.length === 1 ? "" : "s"} en total`;
    empty.hidden = orders.length > 0;
    body.innerHTML = orders.map(order => {
      const productNames = (order.items || []).map(item => {
        const product = PetLove.products.find(entry => entry.id === item.id);
        return product ? `${escape(product.name)} × ${Number(item.quantity) || 0}` : "Producto no disponible";
      }).join(", ");
      return `<tr><td>${escape(order.id)}</td><td>${escape(order.customerName || order.customerEmail || "Invitado")}<br><small>${escape(order.customerEmail || "")}</small></td><td>${new Date(order.date).toLocaleDateString("es-CO")}</td><td>${money(order.total)}</td><td>${productNames}</td><td><select data-order-status="${escape(order.id)}" aria-label="Estado del pedido ${escape(order.id)}">${statuses.map(status => `<option${(order.status || "Recibido") === status ? " selected" : ""}>${status}</option>`).join("")}</select></td></tr>`;
    }).join("");
  }

  body.addEventListener("change", event => {
    const select = event.target.closest("[data-order-status]");
    if (!select || !statuses.includes(select.value)) return;
    const orders = read(keys.orders, []), order = orders.find(entry => entry.id === select.dataset.orderStatus);
    if (!order) return;
    order.status = select.value;
    write(keys.orders, orders);
  });

  draw();
});
