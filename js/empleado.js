document.addEventListener("DOMContentLoaded", async () => {
  const ordersBody = document.querySelector("[data-employee-orders]");
  if (!ordersBody) return;

  const { escape, money, currentUser, showMessage, toast } = PetLove;
  const user = currentUser();
  
  // Si no hay usuario o no es empleado, lo sacamos al login
  if (!user || user.role !== "empleado") {
    location.replace("login.html");
    return;
  }

  const ESTADOS_PEDIDO = ["pendiente", "en preparacion", "empaquetado", "enviado", "entregado", "cancelado"];
  const ESTADOS_PEDIDO_LABEL = {
    "pendiente": "Pendiente",
    "en preparacion": "En preparación",
    "empaquetado": "Empaquetado",
    "enviado": "Enviado",
    "entregado": "Entregado",
    "cancelado": "Cancelado"
  };
  const ACTIVOS = ["pendiente", "en preparacion", "empaquetado", "enviado"];
  const FINALES = ["entregado", "cancelado"];
  const MIN_RESP = 5, MAX_RESP = 2000;

  const $ = selector => document.querySelector(selector);

  $("[data-employee-name]").textContent = user.nombre || user.correo;

  // ---------- Pestañas ----------
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const panels = [...document.querySelectorAll("[data-panel]")];
  function showTab(name) {
    tabs.forEach(t => { const a = t.dataset.tab === name; t.classList.toggle("active", a); t.setAttribute("aria-selected", String(a)); });
    panels.forEach(p => { p.hidden = p.dataset.panel !== name; });
  }
  tabs.forEach(t => t.addEventListener("click", () => showTab(t.dataset.tab)));

  // ---------- Estado local ----------
  let pedidos = [];
  let solicitudes = [];

  // ---------- Pedidos ----------
  const orderFilter = $("[data-order-filter]");
  const ordersTable = $("[data-orders-table]");
  const noOrders = $("[data-no-orders]");
  const noFilteredOrders = $("[data-no-filtered-orders]");

  function drawOrders() {
    const visible = orderFilter.value === "todos"
      ? pedidos
      : pedidos.filter(o => o.estado === orderFilter.value);

    $("[data-orders-total]").textContent = String(pedidos.length);
    $("[data-orders-active]").textContent = String(pedidos.filter(o => ACTIVOS.includes(o.estado)).length);
    $("[data-orders-delivered]").textContent = String(pedidos.filter(o => o.estado === "entregado").length);
    $("[data-orders-cancelled]").textContent = String(pedidos.filter(o => o.estado === "cancelado").length);

    if (noOrders) noOrders.hidden = pedidos.length > 0;
    if (noFilteredOrders) noFilteredOrders.hidden = pedidos.length === 0 || visible.length > 0;
    if (ordersTable) ordersTable.style.display = visible.length ? "" : "none";

    ordersBody.innerHTML = visible.map(o => {
      const nombres = (Array.isArray(o.items) ? o.items : [])
        .map(it => `${escape(it.nombre || "Producto")} × ${Number(it.cantidad) || 0}`)
        .join(", ");
      const fecha = o.fecha ? new Date(o.fecha).toLocaleDateString("es-CO") : "—";
      const id = Number(o.id_pedidos);
      const actual = o.estado;
      const bloqueado = FINALES.includes(actual);
      const opciones = ESTADOS_PEDIDO.map(est =>
        `<option value="${est}"${actual === est ? " selected" : ""}>${ESTADOS_PEDIDO_LABEL[est]}</option>`
      ).join("");
      return `<tr>
        <td>#${id}</td>
        <td>${escape(o.cliente || "Cliente")}<br><small>${escape(o.correo || "")}</small></td>
        <td>${fecha}</td>
        <td>${money(Number(o.total) || 0)}</td>
        <td>${nombres || "Sin productos"}</td>
        <td><div class="group"><select data-order-status="${id}" aria-label="Estado del pedido ${id}"${bloqueado ? ' disabled title="Un pedido entregado o cancelado ya no se puede modificar"' : ""}>${opciones}</select></div></td>
      </tr>`;
    }).join("");
  }

  orderFilter?.addEventListener("change", drawOrders);

  ordersBody.addEventListener("change", async event => {
    const select = event.target.closest("select[data-order-status]");
    if (!select) return;
    const id = select.dataset.orderStatus;
    const pedido = pedidos.find(p => String(p.id_pedidos) === id);
    if (!pedido) { toast("No se encontró el pedido."); drawOrders(); return; }
    if (FINALES.includes(pedido.estado)) { toast("Un pedido entregado o cancelado ya no se puede modificar."); drawOrders(); return; }
    if (select.value === "cancelado" && !confirm(`¿Cancelar el pedido #${id}? Se devolverán sus productos al inventario.`)) {
      drawOrders(); return;
    }
    select.disabled = true;
    try {
      await PetLove.api(`/api/pedidos/${id}/estado`, {
        method: "PUT",
        body: JSON.stringify({ estado: select.value })
      });
      toast(`Pedido #${id} actualizado.`);
      await recargarPedidos();
    } catch (error) {
      toast(error.message);
      drawOrders();
    }
  });

  async function recargarPedidos() {
    try {
      const lista = await PetLove.api("/api/pedidos");
      pedidos = Array.isArray(lista) ? lista : [];
      drawOrders();
    } catch (error) {
      toast("No se pudieron cargar los pedidos: " + error.message);
    }
  }

  // ---------- Solicitudes ----------
  const serviceFilter = $("[data-service-filter]");
  const serviceHost = $("[data-service-requests]");
  const noServices = $("[data-no-services]");
  const noFilteredServices = $("[data-no-filtered-services]");

  function drawServices() {
    const contestadas = solicitudes.filter(s => s.estado === "contestado").length;
    const pendientes = solicitudes.length - contestadas;
    const valor = serviceFilter.value;
    const visible = solicitudes.filter(s =>
      valor === "todos" ||
      (valor === "pendientes" && s.estado !== "contestado") ||
      (valor === "contestadas" && s.estado === "contestado")
    );

    $("[data-services-total]").textContent = String(solicitudes.length);
    $("[data-services-pending]").textContent = String(pendientes);
    $("[data-services-answered]").textContent = String(contestadas);
    $("[data-pending-count]").textContent = String(pendientes);

    if (noServices) noServices.hidden = solicitudes.length > 0;
    if (noFilteredServices) noFilteredServices.hidden = solicitudes.length === 0 || visible.length > 0;

    serviceHost.innerHTML = visible.map(s => {
      const contestada = s.estado === "contestado";
      const id = Number(s.id_solicitud_servicios);
      const fecha = s.fecha ? new Date(s.fecha).toLocaleString("es-CO") : "";
      const respuesta = contestada
        ? `<div class="request-response"><strong>Respuesta enviada</strong><p>${s.respuesta ? escape(s.respuesta) : "Marcada como contestada."}</p></div>`
        : `<form class="request-response" data-respond="${id}" novalidate>
             <div class="group">
               <label for="response-${id}">Tu respuesta</label>
               <textarea id="response-${id}" data-response-input rows="3" maxlength="${MAX_RESP}" placeholder="Escribe la respuesta para el cliente..."></textarea>
             </div>
             <small class="muted"><span data-counter>0</span>/${MAX_RESP} caracteres (mínimo ${MIN_RESP})</small>
             <div class="formmsg hidden" data-response-msg role="status"></div>
             <button class="btn" type="submit" style="margin-top:10px">Enviar respuesta</button>
           </form>`;
      return `<article class="status-item">
        <div class="status-item-top">
          <span class="status-id">Solicitud ${id}</span>
          <span class="status-pill ${contestada ? "status-pill-answered" : ""}">${contestada ? "Contestada" : "Pendiente"}</span>
        </div>
        <h2>${escape(s.servicio || "Solicitud")}</h2>
        <p><strong>Cliente:</strong> ${escape(s.cliente || "Cliente")} · ${escape(s.correo || "")}</p>
        <p class="status-description">${escape(s.descripcion || "")}</p>
        <div class="status-meta"><span>Enviada: ${escape(fecha)}</span></div>
        ${respuesta}
      </article>`;
    }).join("");
  }

  serviceFilter?.addEventListener("change", drawServices);

  serviceHost.addEventListener("input", event => {
    const input = event.target.closest("textarea[data-response-input]");
    if (input) input.closest("form").querySelector("[data-counter]").textContent = String(input.value.length);
  });

  serviceHost.addEventListener("submit", async event => {
    const form = event.target.closest("form[data-respond]");
    if (!form) return;
    event.preventDefault();
    const input = form.querySelector("textarea");
    const message = form.querySelector("[data-response-msg]");
    const text = input.value.trim();

    if (!text) { showMessage(message, "Escribe una respuesta.", true); return; }
    if (text.length < MIN_RESP) { showMessage(message, `Mínimo ${MIN_RESP} caracteres.`, true); return; }
    if (text.length > MAX_RESP) { showMessage(message, `Máximo ${MAX_RESP} caracteres.`, true); return; }

    const id = form.dataset.respond;
    const btn = form.querySelector("button[type='submit']");
    btn && (btn.disabled = true);
    try {
      await PetLove.api(`/api/solicitudes/${id}/respuesta`, {
        method: "PUT",
        body: JSON.stringify({ respuesta: text })
      });
      toast("Respuesta enviada al cliente.");
      await recargarSolicitudes();
    } catch (error) {
      showMessage(message, error.message, true);
    } finally {
      btn && (btn.disabled = false);
    }
  });

  async function recargarSolicitudes() {
    try {
      const lista = await PetLove.api("/api/solicitudes");
      solicitudes = Array.isArray(lista) ? lista : [];
      drawServices();
    } catch (error) {
      toast("No se pudieron cargar las solicitudes: " + error.message);
    }
  }

  // ---------- Logout ----------
  $("[data-logout]")?.addEventListener("click", event => {
    event.preventDefault();
    PetLove.clearSession();
    location.href = "inicio.html";
  });

  // ---------- Carga inicial ----------
  showTab("pedidos");
  await Promise.all([recargarPedidos(), recargarSolicitudes()]);
});