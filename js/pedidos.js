document.addEventListener("DOMContentLoaded", () => {
  const body = document.querySelector(".orders tbody");
  if (!body) return;

  const { money, escape, isLoggedIn, currentUser } = PetLove;
  if (!isLoggedIn()) {
    body.innerHTML = `<tr><td colspan="4">Inicia sesión para ver tus pedidos.</td></tr>`;
    return;
  }

  body.innerHTML = `<tr><td colspan="4">Cargando tus pedidos…</td></tr>`;

  PetLove.api("/api/pedidos/mios")
    .then(orders => {
      if (!Array.isArray(orders) || !orders.length) {
        body.innerHTML = `<tr><td colspan="4">Aún no tienes pedidos. Cuando completes una compra aparecerán aquí.</td></tr>`;
        return;
      }
      body.innerHTML = orders.map(order => {
        const fecha = new Date(order.fecha);
        const fechaLabel = Number.isNaN(fecha.getTime()) ? "—" : fecha.toLocaleDateString("es-CO");
        return `<tr>
          <td>#${order.id_pedidos}</td>
          <td>${fechaLabel}</td>
          <td>${money(Number(order.total) || 0)}</td>
          <td><span class="badge">${escape(order.estado)}</span></td>
        </tr>`;
      }).join("");
    })
    .catch(error => {
      body.innerHTML = `<tr><td colspan="4">No se pudieron cargar tus pedidos: ${escape(error.message)}</td></tr>`;
    });
});