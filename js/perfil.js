
document.addEventListener("DOMContentLoaded", async () => {
  // =====================================================
  // 1. VERIFICAR SESIÓN
  // =====================================================

  const form = document.querySelector("[data-profile-form]");

  if (!form) {
    console.error("No se encontró el formulario del perfil.");
    return;
  }

  if (!PetLove.isLoggedIn()) {
    location.replace("login.html");
    return;
  }

  const {
    showMessage,
    updateAccountMenu,
    currentUser,
    read,
    write,
    keys
  } = PetLove;

  // =====================================================
  // 2. ELEMENTOS DEL PERFIL
  // =====================================================

  const name = form.querySelector("#profile-name");
  const email = form.querySelector("#profile-email");
  const pet = form.querySelector("#profile-pet");
  const message = form.querySelector("[data-profile-msg]");

  const phone = form.querySelector("#profile-tel");
  const address = form.querySelector("#profile-dire");

  // =====================================================
  // 3. NAVEGACIÓN DEL PANEL DEL CLIENTE
  // =====================================================

  const tabs = document.querySelectorAll("[data-client-tab]");

  const views = {
    perfil: document.querySelector("#vista-perfil"),
    pedidos: document.querySelector("#vista-pedidos"),
    servicios: document.querySelector("#vista-servicios")
  };

  const pageTitle = document.querySelector("#client-page-title");

  const titles = {
    perfil: "Mi perfil",
    pedidos: "Mis pedidos",
    servicios: "Servicios solicitados"
  };

  // =====================================================
  // 4. FUNCIONES DE PEDIDOS Y SERVICIOS
  // =====================================================

  async function cargarPedidos() {
    const ordersBody = document.querySelector("#client-orders-body");

    if (!ordersBody) {
      console.error("No existe #client-orders-body en perfil.html");
      return;
    }

    ordersBody.innerHTML = `
      <tr>
        <td colspan="4">Cargando pedidos...</td>
      </tr>
    `;

    try {
      const pedidos = await PetLove.api("/api/pedidos/mios");

      if (!Array.isArray(pedidos) || pedidos.length === 0) {
        ordersBody.innerHTML = `
          <tr>
            <td colspan="4">Todavía no tienes pedidos registrados.</td>
          </tr>
        `;
        return;
      }

      ordersBody.innerHTML = pedidos.map(pedido => {
        const fecha = pedido.fecha
          ? new Date(pedido.fecha)
          : null;

        const fechaTexto =
          fecha && !Number.isNaN(fecha.getTime())
            ? fecha.toLocaleDateString("es-CO")
            : "—";

        const total = Number(pedido.total) || 0;

        const totalTexto = total.toLocaleString("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 0
        });

        return `
          <tr>
            <td>#${escapar(pedido.id_pedidos ?? pedido.id ?? "—")}</td>
            <td>${escapar(fechaTexto)}</td>
            <td>${escapar(totalTexto)}</td>
            <td>
              <span class="badge">
                ${escapar(pedido.estado || "Pendiente")}
              </span>
            </td>
          </tr>
        `;
      }).join("");

    } catch (error) {
      console.error("Error al cargar pedidos:", error);

      ordersBody.innerHTML = `
        <tr>
          <td colspan="4">
            No se pudieron cargar los pedidos.
            Comprueba la conexión con el servidor.
          </td>
        </tr>
      `;
    }
  }

  async function cargarServicios() {
    const servicesHost = document.querySelector("#client-services-list");

    if (!servicesHost) {
      console.error("No existe #client-services-list en perfil.html");
      return;
    }

    servicesHost.innerHTML = `
      <div class="client-empty-state">
        <p>Cargando solicitudes...</p>
      </div>
    `;

    try {
      const solicitudes = await PetLove.api("/api/solicitudes/mias");

      if (!Array.isArray(solicitudes) || solicitudes.length === 0) {
        servicesHost.innerHTML = `
          <div class="client-empty-state">
            <span class="material-symbols-outlined">pets</span>
            <h3>Aún no tienes solicitudes</h3>
            <p>Tus servicios solicitados aparecerán aquí.</p>
          </div>
        `;
        return;
      }

      servicesHost.innerHTML = solicitudes.map(solicitud => {
        const id = escapar(
          solicitud.id_solicitud_servicios ??
          solicitud.id_solicitud ??
          solicitud.id ??
          "—"
        );

        const servicio = escapar(
          solicitud.servicio ??
          solicitud.nombre_servicio ??
          solicitud.tipo_servicio ??
          "Servicio solicitado"
        );

        const descripcion = escapar(
          solicitud.descripcion ?? "Sin descripción"
        );

        const estado = String(
          solicitud.estado ?? "pendiente"
        ).toLowerCase();

        const contestado = [
          "contestado",
          "respondido",
          "completado",
          "atendido"
        ].includes(estado);

        const estadoTexto = escapar(
          solicitud.estado || "Pendiente"
        );

        const fecha = solicitud.fecha
          ? new Date(solicitud.fecha)
          : null;

        const fechaTexto =
          fecha && !Number.isNaN(fecha.getTime())
            ? fecha.toLocaleDateString("es-CO")
            : "—";

        const respuesta = escapar(
          solicitud.respuesta ??
          solicitud.observaciones_empleado ??
          solicitud.comentario_respuesta ??
          "Tu solicitud está pendiente de respuesta."
        );

        return `
          <article class="client-service-card">
            <div class="client-service-top">
              <span class="client-service-id">
                Solicitud #${id}
              </span>

              <span class="client-status ${
                contestado ? "is-answered" : "is-pending"
              }">
                ${estadoTexto}
              </span>
            </div>

            <h3>${servicio}</h3>

            <p class="client-service-description">
              ${descripcion}
            </p>

            <p class="client-service-date">
              <span class="material-symbols-outlined">
                calendar_month
              </span>
              Fecha: ${escapar(fechaTexto)}
            </p>

            <div class="client-service-reply">
              <strong>
                <span class="material-symbols-outlined">forum</span>
                Respuesta del equipo
              </strong>

              <p>${respuesta}</p>
            </div>
          </article>
        `;
      }).join("");

    } catch (error) {
      console.error("Error al cargar servicios:", error);

      servicesHost.innerHTML = `
        <div class="client-empty-state">
          <span class="material-symbols-outlined">error</span>
          <h3>No se pudieron cargar las solicitudes</h3>
          <p>Comprueba la conexión con el servidor.</p>
        </div>
      `;
    }
  }

  // Escapa texto recibido del servidor antes de insertarlo en HTML.
  function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[caracter]);
  }

  // =====================================================
  // 5. MOSTRAR LA SECCIÓN SELECCIONADA
  // =====================================================

  function cambiarSeccion(seccion) {
    if (!views[seccion]) {
      console.error(
        `No existe la sección "vista-${seccion}" en perfil.html`
      );
      return;
    }

    Object.entries(views).forEach(([clave, vista]) => {
      if (vista) {
        vista.hidden = clave !== seccion;
      }
    });

    tabs.forEach(tab => {
      const activa = tab.dataset.clientTab === seccion;

      tab.classList.toggle("active", activa);

      if (activa) {
        tab.setAttribute("aria-current", "page");
      } else {
        tab.removeAttribute("aria-current");
      }
    });

    if (pageTitle) {
      pageTitle.textContent = titles[seccion];
    }

    // Consultar los datos cuando el cliente abre cada sección.
    if (seccion === "pedidos") {
      cargarPedidos();
    }

    if (seccion === "servicios") {
      cargarServicios();
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      cambiarSeccion(tab.dataset.clientTab);
    });
  });

  // =====================================================
  // 6. CARGAR DATOS DEL PERFIL DESDE EL SERVIDOR
  // =====================================================

  let usuarioActual = currentUser() || {};

  const perfilLocal = read(keys.profile, {}) || {};

  try {
    usuarioActual = await PetLove.api("/api/auth/yo");

    PetLove.setSession(PetLove.getToken(), {
      id_usuarios: usuarioActual.id_usuarios,
      nombre: usuarioActual.nombre,
      correo: usuarioActual.correo,
      rol: usuarioActual.rol
    });
  } catch (error) {
    showMessage(
      message,
      "No se pudo cargar tu perfil: " + error.message,
      true
    );
  }

  if (name) {
    name.value = usuarioActual.nombre || perfilLocal.name || "";
  }

  if (email) {
    email.value = usuarioActual.correo || perfilLocal.email || "";
  }

  if (pet) {
    pet.value = perfilLocal.pet || "";
  }

  if (phone) {
    phone.value = perfilLocal.phone || "";
  }

  if (address) {
    address.value = perfilLocal.address || "";
  }

  // =====================================================
  // 7. ACTUALIZAR LOS DATOS VISIBLES DEL PERFIL
  // =====================================================

  function paint() {
    const nombre = name?.value.trim() || "";

    const greeting = document.querySelector("#profile-greeting");
    const nameCard = document.querySelector("#profile-name-card");
    const emailCard = document.querySelector("#profile-email-card");

    if (greeting) {
      greeting.textContent = nombre
        ? `¡Hola, ${nombre.split(/\s+/)[0]}!`
        : "¡Hola, amante de las mascotas!";
    }

    if (nameCard) {
      nameCard.textContent = nombre || "Mi perfil";
    }

    if (emailCard) {
      emailCard.textContent = email?.value || "";
    }
  }

  paint();

  name?.addEventListener("input", paint);
  email?.addEventListener("input", paint);

  // =====================================================
  // 8. GUARDAR CAMBIOS DEL PERFIL
  // =====================================================

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const nuevoNombre = name.value.trim();
    const nuevoCorreo = email.value.trim().toLowerCase();
    const nuevaMascota = pet?.value.trim() || "";

    const nuevoTelefono = phone?.value.trim() || "";
    const nuevaDireccion = address?.value.trim() || "";

    const btn = form.querySelector('button[type="submit"]');

    if (btn) btn.disabled = true;

    try {
      const actualizado = await PetLove.api("/api/auth/yo", {
        method: "PUT",
        body: JSON.stringify({
          nombre: nuevoNombre,
          correo: nuevoCorreo
        })
      });

      PetLove.setSession(PetLove.getToken(), {
        id_usuarios: actualizado.id_usuarios,
        nombre: actualizado.nombre,
        correo: actualizado.correo,
        rol: actualizado.rol
      });

      write(keys.profile, {
        ...perfilLocal,
        name: actualizado.nombre,
        email: actualizado.correo,
        pet: nuevaMascota,
        phone: nuevoTelefono,
        address: nuevaDireccion
      });

      paint();
      updateAccountMenu();

      showMessage(
        message,
        "Perfil actualizado correctamente."
      );

    } catch (error) {
      showMessage(message, error.message, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // =====================================================
  // 9. BOTONES PARA ACTUALIZAR PEDIDOS Y SERVICIOS
  // =====================================================

  document.querySelector("#refresh-orders")?.addEventListener(
    "click",
    cargarPedidos
  );

  document.querySelector("#refresh-services")?.addEventListener(
    "click",
    cargarServicios
  );

  // =====================================================
  // 10. CERRAR SESIÓN
  // =====================================================

  document.querySelector("#logout-btn")?.addEventListener("click", () => {
    PetLove.clearSession();
    updateAccountMenu();
    location.href = "inicio.html";
  });

  // =====================================================
  // 11. INICIAR EL PANEL
  // =====================================================

  // Registrar la navegación antes de cargar el perfil.
  cambiarSeccion("perfil");
});
