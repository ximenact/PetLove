document.addEventListener("DOMContentLoaded", () => {
  // Solo entra el administrador (el rol se guarda como "role" al iniciar sesión).
  const user = PetLove.currentUser();
  if (!user || user.role !== "administrador") {
    location.replace("login.html");
    return;
  }

  const $ = selector => document.querySelector(selector);
  const escape = PetLove.escape;
  const roles = ["cliente", "empleado", "administrador"];
  const orderStates = [
    ["pendiente", "Pendiente"],
    ["en preparacion", "En preparación"],
    ["empaquetado", "Empaquetado"],
    ["enviado", "Enviado"],
    ["entregado", "Entregado"],
    ["cancelado", "Cancelado"]
  ];
  const collections = { products: [], categories: [], services: [], users: [], orders: [], requests: [] };
  const endpoints = { products: "/api/productos", categories: "/api/categorias", services: "/api/servicios" };
  const ownId = Number(user.id_usuarios ?? user.id);

  // Usamos PetLove.api (common.js): envía el token (Authorization: Bearer ...)
  // y llama al servidor correcto (localhost:3000 en local). Sin esto, el servidor
  // respondería 401 porque no sabría quién eres.
  const api = PetLove.api;

  $("[data-admin-name]").textContent = user.name || user.nombre || user.email || user.correo;

  function notify(message, error = false) {
    PetLove.showMessage($("[data-admin-message]"), message, error);
    $("[data-admin-message]").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Fecha no disponible" : date.toLocaleString("es-CO");
  }

  function tab(name) {
    document.querySelectorAll("[data-tab]").forEach(button => {
      const active = button.dataset.tab === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-panel]").forEach(panel => { panel.hidden = panel.dataset.panel !== name; });
  }

  document.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => tab(button.dataset.tab));
  });

  function setCollectionEmpty(name, isEmpty) {
    const el = $(`[data-empty="${name}"]`);
    if (el) el.hidden = !isEmpty;
  }

  function renderCategories() {
    const list = $("[data-category-list]");
    list.innerHTML = collections.categories.map(category => {
      const id = Number(category.id_categorias);
      return `<tr>
        <td>${escape(category.nombre)}</td>
        <td>${escape(category.descripcion || "Sin descripción")}</td>
        <td><button class="btn outline" type="button" data-edit-category="${id}">Editar</button>
        <button class="btn" type="button" data-delete-category="${id}">Eliminar</button></td>
      </tr>`;
    }).join("");
    setCollectionEmpty("categories", collections.categories.length === 0);
    const select = $("[name='id_categorias']");
    if (!select) return;
    const selected = select.value;
    select.innerHTML = `<option value="">Sin categoría</option>${collections.categories.map(category =>
      `<option value="${Number(category.id_categorias)}">${escape(category.nombre)}</option>`
    ).join("")}`;
    if (collections.categories.some(category => String(category.id_categorias) === selected)) select.value = selected;
  }

  function renderProducts() {
    $("[data-product-list]").innerHTML = collections.products.map(product =>
      `<tr>
        <td>${escape(product.nombre)}</td>
        <td>${escape(product.categoria || "Sin categoría")}</td>
        <td>${PetLove.money(Number(product.precio) || 0)}</td>
        <td>${Number(product.stock) || 0}</td>
        <td><button class="btn outline" type="button" data-edit-product="${Number(product.id_productos)}">Editar</button>
        <button class="btn" type="button" data-delete-product="${Number(product.id_productos)}">Eliminar</button></td>
      </tr>`
    ).join("");
    setCollectionEmpty("products", collections.products.length === 0);
  }

  function renderServices() {
    $("[data-service-list]").innerHTML = collections.services.map(service =>
      `<tr>
        <td>${escape(service.titulo)}</td>
        <td>${escape(service.descripcion)}</td>
        <td><div style="display:flex;gap:8px;flex-wrap:nowrap"><button class="btn outline" type="button" data-edit-service="${Number(service.id_servicios)}">Editar</button>
        <button class="btn" type="button" data-delete-service="${Number(service.id_servicios)}">Eliminar</button></div></td>
      </tr>`
    ).join("");
    setCollectionEmpty("services", collections.services.length === 0);
  }

  function renderUsers() {
    $("[data-user-list]").innerHTML = collections.users.map(account => {
      const id = Number(account.id_usuarios);
      const isSelf = id === ownId;
      const roleOptions = roles.map(role =>
        `<option value="${role}"${account.rol === role ? " selected" : ""}>${role[0].toUpperCase()}${role.slice(1)}</option>`
      ).join("");
      return `<tr>
        <td>${escape(account.nombre)}</td>
        <td>${escape(account.correo)}</td>
        <td><div class="group"><select data-user-role="${id}" aria-label="Rol de ${escape(account.nombre)}"${isSelf ? " disabled" : ""}>${roleOptions}</select></div></td>
        <td>${escape(formatDate(account.fecha_registro))}</td>
        <td><button class="btn" type="button" data-save-role="${id}"${isSelf ? " disabled title='No puedes cambiar tu propio rol'" : ""}>Guardar rol</button></td>
      </tr>`;
    }).join("");
    setCollectionEmpty("users", collections.users.length === 0);
  }

  function renderOrders() {
    const filter = $("[data-order-filter]").value;
    const visible = filter === "todos" ? collections.orders : collections.orders.filter(order => order.estado === filter);
    const activeStates = ["pendiente", "en preparacion", "empaquetado", "enviado"];
    $("[data-orders-total]").textContent = String(collections.orders.length);
    $("[data-orders-active]").textContent = String(collections.orders.filter(order => activeStates.includes(order.estado)).length);
    $("[data-orders-delivered]").textContent = String(collections.orders.filter(order => order.estado === "entregado").length);
    $("[data-orders-cancelled]").textContent = String(collections.orders.filter(order => order.estado === "cancelado").length);
    $("[data-no-orders]").hidden = collections.orders.length > 0;
    $("[data-no-filtered-orders]").hidden = collections.orders.length === 0 || visible.length > 0;
    $("[data-orders-table]").hidden = visible.length === 0;
    $("[data-admin-orders]").innerHTML = visible.map(order => {
      const items = (Array.isArray(order.items) ? order.items : []).map(item =>
        `${escape(item.nombre || "Producto")} × ${Number(item.cantidad) || 0}`
      ).join(", ");
      const stateOptions = orderStates.map(([value, label]) =>
        `<option value="${value}"${order.estado === value ? " selected" : ""}${order.estado === "cancelado" && value !== "cancelado" ? " disabled" : ""}>${label}</option>`
      ).join("");
      return `<tr>
        <td>${Number(order.id_pedidos)}</td>
        <td>${escape(order.cliente || "Cliente")}<br><small>${escape(order.correo || "")}</small></td>
        <td>${escape(formatDate(order.fecha))}</td>
        <td>${PetLove.money(Number(order.total) || 0)}</td>
        <td>${items || "Sin productos"}</td>
        <td><div class="group"><select data-order-state="${Number(order.id_pedidos)}" aria-label="Estado del pedido ${Number(order.id_pedidos)}"${order.estado === "cancelado" ? " disabled" : ""}>${stateOptions}</select></div></td>
        <td><button class="btn" type="button" data-delete-order="${Number(order.id_pedidos)}">Eliminar</button></td>
      </tr>`;
    }).join("");
  }

  function renderRequests() {
    const filter = $("[data-request-filter]").value;
    const visible = collections.requests.filter(request => filter === "todas" || request.estado === filter);
    const pending = collections.requests.filter(request => request.estado === "pendiente").length;
    $("[data-requests-total]").textContent = String(collections.requests.length);
    $("[data-requests-pending]").textContent = String(pending);
    $("[data-requests-answered]").textContent = String(collections.requests.length - pending);
    $("[data-no-requests]").hidden = collections.requests.length > 0;
    $("[data-no-filtered-requests]").hidden = collections.requests.length === 0 || visible.length > 0;
    $("[data-admin-requests]").innerHTML = visible.map(request => {
      const id = Number(request.id_solicitud_servicios);
      const answered = request.estado === "contestado";
      const response = answered
        ? `<div class="request-response"><strong>Respuesta enviada</strong><p>${escape(request.respuesta || "")}</p></div>`
        : `<form class="request-response" data-answer-request="${id}">
             <div class="group"><label for="answer-${id}">Respuesta</label><textarea id="answer-${id}" name="respuesta" rows="3" minlength="2" maxlength="2000" required></textarea></div>
             <button class="btn" type="submit">Enviar respuesta</button>
           </form>`;
      return `<article class="status-item">
        <div class="status-item-top"><span class="status-id">Solicitud ${id}</span><span class="status-pill${answered ? " status-pill-answered" : ""}">${answered ? "Contestada" : "Pendiente"}</span></div>
        <h2>${escape(request.servicio || "Servicio")}</h2>
        <p><strong>Cliente:</strong> ${escape(request.cliente || "Cliente")} · ${escape(request.correo || "")}</p>
        <p class="status-description">${escape(request.descripcion || "")}</p>
        <div class="status-meta"><span>Recibida: ${escape(formatDate(request.fecha))}</span></div>
        ${response}
      </article>`;
    }).join("");
  }

  function renderAll() {
    renderCategories();
    renderProducts();
    renderServices();
    renderUsers();
    renderOrders();
    renderRequests();
  }

  async function loadData() {
    const tasks = [
      ["products", () => api(endpoints.products)],
      ["categories", () => api(endpoints.categories)],
      ["services", () => api(endpoints.services)],
      ["users", () => api("/api/usuarios")],
      ["orders", () => api("/api/pedidos")],
      ["requests", () => api("/api/solicitudes")]
    ];
    const results = await Promise.allSettled(tasks.map(([, load]) => load()));
    const errors = [];
    results.forEach((result, index) => {
      const [name] = tasks[index];
      if (result.status === "fulfilled" && Array.isArray(result.value)) collections[name] = result.value;
      else errors.push(result.status === "rejected" ? result.reason.message : `La respuesta de ${name} no tiene un formato válido.`);
    });
    renderAll();
    return errors.length ? `No se pudo cargar toda la información: ${errors.join(" ")}` : "";
  }

  async function refreshAfterChange(successMessage) {
    const error = await loadData();
    notify(error ? `${successMessage} Sin embargo, no se pudo actualizar toda la vista: ${error}` : successMessage, Boolean(error));
  }

  const entityForms = {
    products: {
      endpoint: endpoints.products,
      fields: ["nombre", "id_categorias", "precio", "stock", "imagen_url", "descripcion"],
      payload: form => ({
        nombre: form.elements.nombre.value.trim(),
        id_categorias: form.elements.id_categorias.value || null,
        precio: form.elements.precio.value,
        stock: form.elements.stock.value || 0,
        imagen_url: form.elements.imagen_url.value.trim() || null,
        descripcion: form.elements.descripcion.value.trim() || null
      }),
      id: item => item.id_productos,
      title: "producto"
    },
    categories: {
      endpoint: endpoints.categories,
      fields: ["nombre", "descripcion"],
      payload: form => ({ nombre: form.elements.nombre.value.trim(), descripcion: form.elements.descripcion.value.trim() || null }),
      id: item => item.id_categorias,
      title: "categoría"
    },
    services: {
      endpoint: endpoints.services,
      fields: ["titulo", "descripcion"],
      payload: form => ({ titulo: form.elements.titulo.value.trim(), descripcion: form.elements.descripcion.value.trim() }),
      id: item => item.id_servicios,
      title: "servicio"
    }
  };

  // Nombre de cada pestaña/panel en administrador.html (data-tab y data-panel)
  const panelOf = { products: "productos", categories: "categorias", services: "servicios" };

  function resetEntityForm(form) {
    form.reset();
    form.elements.id.value = "";
    form.querySelector("[data-form-title]").textContent = `Crear ${entityForms[form.dataset.entityForm].title}`;
    form.querySelector("[data-submit]").textContent = `Crear ${entityForms[form.dataset.entityForm].title}`;
    form.querySelector("[data-cancel]").hidden = true;
  }

  document.querySelectorAll("[data-entity-form]").forEach(form => {
    const config = entityForms[form.dataset.entityForm];
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const id = form.elements.id.value;
      const submit = form.querySelector("[data-submit]");
      submit.disabled = true;
      try {
        await api(id ? `${config.endpoint}/${encodeURIComponent(id)}` : config.endpoint, {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(config.payload(form))
        });
        resetEntityForm(form);
        await refreshAfterChange(`${config.title[0].toUpperCase()}${config.title.slice(1)} ${id ? "actualizado" : "creado"} correctamente.`);
      } catch (error) {
        notify(error.message, true);
      } finally {
        submit.disabled = false;
      }
    });
    form.querySelector("[data-cancel]").addEventListener("click", () => resetEntityForm(form));
  });

  document.addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button) return;

    const editTypes = [
      ["products", "data-edit-product", collections.products],
      ["categories", "data-edit-category", collections.categories],
      ["services", "data-edit-service", collections.services]
    ];
    for (const [name, attribute, items] of editTypes) {
      const id = button.getAttribute(attribute);
      if (!id) continue;
      const config = entityForms[name];
      const item = items.find(entry => String(config.id(entry)) === id);
      if (!item) { notify(`No se encontró el ${config.title}.`, true); return; }
      const form = $(`[data-entity-form="${name}"]`);
      form.elements.id.value = id;
      config.fields.forEach(field => {
        const input = form.elements[field];
        input.value = item[field] ?? "";
      });
      form.querySelector("[data-form-title]").textContent = `Editar ${config.title}`;
      form.querySelector("[data-submit]").textContent = `Guardar cambios`;
      form.querySelector("[data-cancel]").hidden = false;
      tab(panelOf[name]);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const deleteTypes = [
      ["products", "data-delete-product", "id_productos"],
      ["categories", "data-delete-category", "id_categorias"],
      ["services", "data-delete-service", "id_servicios"]
    ];
    for (const [name, attribute, idField] of deleteTypes) {
      const id = button.getAttribute(attribute);
      if (!id) continue;
      const item = collections[name].find(entry => String(entry[idField]) === id);
      if (!item) { notify("No se encontró el registro que quieres eliminar.", true); return; }
      const label = item.nombre || item.titulo;
      if (!confirm(`¿Seguro que quieres eliminar "${label}"?`)) return;
      button.disabled = true;
      try {
        await api(`${endpoints[name]}/${encodeURIComponent(id)}`, { method: "DELETE" });
        await refreshAfterChange(`Se eliminó "${label}".`);
      } catch (error) {
        notify(error.message, true);
      } finally {
        button.disabled = false;
      }
      return;
    }

    const orderId = button.getAttribute("data-delete-order");
    if (orderId) {
      const order = collections.orders.find(entry => String(entry.id_pedidos) === orderId);
      if (!order) { notify("No se encontró el pedido que quieres eliminar.", true); return; }
      const aviso = order.estado === "cancelado" ? "" : " Sus productos se devolverán al inventario.";
      if (!confirm(`¿Eliminar el pedido ${orderId} de forma definitiva?${aviso} Esta acción no se puede deshacer.`)) return;
      button.disabled = true;
      try {
        await api(`/api/pedidos/${encodeURIComponent(orderId)}`, { method: "DELETE" });
        await refreshAfterChange(`El pedido ${orderId} se eliminó correctamente.`);
      } catch (error) {
        notify(error.message === "Ruta no encontrada" ? "El servidor todavía no tiene la opción de eliminar pedidos." : error.message, true);
      } finally {
        button.disabled = false;
      }
      return;
    }

    const userId = button.getAttribute("data-save-role");
    if (userId) {
      const select = $(`[data-user-role="${CSS.escape(userId)}"]`);
      if (!select || !roles.includes(select.value)) { notify("Selecciona un rol válido.", true); return; }
      if (Number(userId) === ownId) { notify("No puedes cambiar tu propio rol.", true); return; }
      button.disabled = true;
      try {
        await api(`/api/usuarios/${encodeURIComponent(userId)}/rol`, {
          method: "PUT",
          body: JSON.stringify({ rol: select.value })
        });
        await refreshAfterChange("El rol del usuario se actualizó correctamente.");
      } catch (error) {
        notify(error.message, true);
      } finally {
        button.disabled = false;
      }
    }
  });

  $("[data-order-filter]").addEventListener("change", renderOrders);
  $("[data-request-filter]").addEventListener("change", renderRequests);

  $("[data-admin-orders]").addEventListener("change", async event => {
    const select = event.target.closest("[data-order-state]");
    if (!select) return;
    const id = select.dataset.orderState;
    const order = collections.orders.find(entry => String(entry.id_pedidos) === id);
    if (!order) { notify("No se encontró el pedido.", true); renderOrders(); return; }
    if (order.estado === "cancelado") { notify("Un pedido cancelado no se puede reactivar.", true); renderOrders(); return; }
    if (select.value === "cancelado" && !confirm(`¿Cancelar el pedido ${id}? Se devolverán sus productos al inventario.`)) {
      renderOrders();
      return;
    }
    select.disabled = true;
    try {
      await api(`/api/pedidos/${encodeURIComponent(id)}/estado`, {
        method: "PUT",
        body: JSON.stringify({ estado: select.value })
      });
      await refreshAfterChange(`El pedido ${id} se actualizó correctamente.`);
    } catch (error) {
      notify(error.message, true);
      renderOrders();
    }
  });

  $("[data-admin-requests]").addEventListener("submit", async event => {
    const form = event.target.closest("form[data-answer-request]");
    if (!form) return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    const answer = form.elements.respuesta.value.trim();
    if (answer.length < 2 || answer.length > 2000) {
      notify("La respuesta debe tener entre 2 y 2000 caracteres.", true);
      return;
    }
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      await api(`/api/solicitudes/${encodeURIComponent(form.dataset.answerRequest)}/respuesta`, {
        method: "PUT",
        body: JSON.stringify({ respuesta: answer })
      });
      await refreshAfterChange("La respuesta se envió correctamente.");
    } catch (error) {
      notify(error.message, true);
      button.disabled = false;
    }
  });

  $("[data-logout]").addEventListener("click", () => {
    PetLove.clearSession();
    location.href = "login.html";
  });

  tab("pedidos");
  loadData().then(error => { if (error) notify(error, true); });
});