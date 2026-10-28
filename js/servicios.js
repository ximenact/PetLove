document.addEventListener("DOMContentLoaded", async () => {
  const { escape, currentUser, isLoggedIn, showMessage } = PetLove;

  // ---------- Catálogo real de servicios desde la BD ----------
  let serviciosBD = [];
  try {
    const lista = await PetLove.api("/api/servicios");
    if (Array.isArray(lista)) serviciosBD = lista;
  } catch { /* sigue vacío */ }

  // ---------- Tarjetas de servicios (servicios.html) ----------
  // La página tiene 4 tarjetas fijas. Los servicios creados desde el panel de administrador
  // (que viven en Neon) se agregan como tarjetas nuevas si no se parecen a una que ya exista.
  const grid = document.querySelector(".services-grid");
  if (grid && serviciosBD.length) {
    const normalizar = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
    const imagenPorDefecto = "data:image/svg+xml;utf8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#f3efff"/>' +
      '<text x="50%" y="50%" font-size="80" text-anchor="middle" dominant-baseline="middle">🐾</text></svg>'
    );
    const titulosActuales = [...grid.querySelectorAll(".service-card h3")].map(h => normalizar(h.textContent));
    serviciosBD.forEach(servicio => {
      const titulo = normalizar(servicio.titulo);
      if (!titulo || titulosActuales.some(t => t.includes(titulo) || titulo.includes(t))) return;
      titulosActuales.push(titulo);
      const numero = String(grid.querySelectorAll(".service-card").length + 1).padStart(2, "0");
      const card = document.createElement("article");
      card.className = "service-card";
      card.innerHTML = `<img src="${imagenPorDefecto}" alt="${escape(servicio.titulo)}">
        <div class="service-card-body">
          <span class="service-number">${numero}</span>
          <h3>${escape(servicio.titulo)}</h3>
          <p>${escape(servicio.descripcion)}</p>
        </div>`;
      grid.append(card);
    });
  }

  // ---------- Formulario de nueva solicitud ----------
  const form = document.querySelector("#service-request-form");
  if (form) {
    const message = form.querySelector("#request-message");
    const nameInput = form.querySelector("#request-name");
    const emailInput = form.querySelector("#request-email");
    const phoneInput = form.querySelector("#request-phone");
    const serviceSelect = form.querySelector("#request-service");
    const descriptionInput = form.querySelector("#request-description");
    const termsInput = form.querySelector("#request-terms");
    const submitButton = form.querySelector('button[type="submit"]');

    // Rellena el select con los servicios reales de Neon
    if (serviceSelect) {
      serviceSelect.innerHTML = `<option value="">Selecciona un servicio</option>` +
        serviciosBD.map(s => `<option value="${Number(s.id_servicios)}">${escape(s.titulo)}</option>`).join("");
    }

    // Pre-selección por query string ?servicio=Titulo
    const chosen = new URLSearchParams(location.search).get("servicio");
    if (chosen && serviceSelect) {
      const opt = [...serviceSelect.options].find(o => o.text.toLowerCase() === chosen.toLowerCase());
      if (opt) serviceSelect.value = opt.value;
    }

    const user = currentUser();
    if (user) {
      if (nameInput) nameInput.value = user.nombre || "";
      if (emailInput) emailInput.value = user.correo || "";
    }

    if (!isLoggedIn()) {
      showMessage(message, "Inicia sesión para poder enviar una solicitud.", true);
    } else if (user.role === "empleado" || user.role === "administrador") {
      showMessage(message, "Este tipo de cuenta no puede crear solicitudes.", true);
      submitButton && (submitButton.disabled = true);
    }

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const fail = (text, field) => { showMessage(message, text, true); field?.focus(); };

      if (!isLoggedIn()) return fail("Inicia sesión para poder enviar una solicitud.");
      const u = currentUser();
      if (u.role === "empleado" || u.role === "administrador") return fail("Este tipo de cuenta no puede crear solicitudes.");

      const idServicio = Number(serviceSelect.value);
      const descripcion = descriptionInput.value.trim();

      if (!Number.isInteger(idServicio) || idServicio <= 0) return fail("Selecciona un servicio válido.", serviceSelect);
      if (descripcion.length < 10) return fail("La descripción debe tener al menos 10 caracteres.", descriptionInput);
      if (descripcion.length > 2000) return fail("La descripción no puede superar 2000 caracteres.", descriptionInput);
      if (termsInput && !termsInput.checked) return fail("Debes confirmar que la información es correcta.", termsInput);

      submitButton && (submitButton.disabled = true);
      try {
        await PetLove.api("/api/solicitudes", {
          method: "POST",
          body: JSON.stringify({ id_servicios: idServicio, descripcion })
        });
        showMessage(message, "Mensaje enviado, te contestaremos lo más rápido que podamos.");
        form.reset();
        setTimeout(() => location.href = "servicio_solicitado.html", 900);
      } catch (error) {
        fail(error.message);
      } finally {
        submitButton && (submitButton.disabled = false);
      }
    });
  }

  // ---------- Listado de MIS solicitudes ----------
  const host = document.querySelector("#service-status-list");
  if (!host) return;

  if (!isLoggedIn()) {
    host.innerHTML = '<div class="status-empty"><h2>Inicia sesión</h2><p>Para consultar tus solicitudes primero <a href="login.html">inicia sesión</a>.</p></div>';
    return;
  }
  const u = currentUser();
  if (u.role === "empleado" || u.role === "administrador") {
    host.innerHTML = '<div class="status-empty"><h2>Eres parte del equipo</h2><p>Las solicitudes se responden desde el <a href="empleado.html">panel de empleado</a>.</p></div>';
    return;
  }

  async function cargarMisSolicitudes() {
    host.innerHTML = '<div class="status-empty"><h2>Cargando…</h2></div>';
    try {
      const mine = await PetLove.api("/api/solicitudes/mias");
      if (!Array.isArray(mine) || !mine.length) {
        host.innerHTML = '<div class="status-empty"><h2>Aún no tienes solicitudes</h2><p>Cuando envíes una solicitud, podrás consultar aquí su estado y la respuesta del equipo.</p></div>';
        return;
      }
      // Mensajes de seguimiento: nuevas consultas del cliente y respuestas del equipo
      let mensajes = [];
      try {
        const lista = await PetLove.api("/api/mensajes-solicitudes");
        if (Array.isArray(lista)) mensajes = lista;
      } catch { /* si todavía no existe el seguimiento, se muestra solo la respuesta inicial */ }

      host.innerHTML = mine.map(item => {
        const id = Number(item.id_solicitud_servicios);
        const answered = String(item.estado || "").toLowerCase() === "contestado";
        const replyText = item.respuesta
          ? escape(item.respuesta)
          : (answered
            ? "El equipo marcó esta solicitud como contestada."
            : "Aún estamos revisando tu solicitud. Te mostraremos aquí la respuesta cuando el equipo conteste.");
        const fecha = item.fecha ? new Date(item.fecha).toLocaleString("es-CO") : "";
        const hilo = mensajes
          .filter(m => Number(m.id_solicitud_servicios) === id)
          .map(m => `<div class="request-response"><strong>${m.autor === "cliente" ? "Tu consulta" : "Respuesta del equipo"}</strong><p>${escape(m.mensaje)}</p><small class="muted">${escape(new Date(m.fecha).toLocaleString("es-CO"))}</small></div>`)
          .join("");
        const seguimiento = answered
          ? `<form class="request-response" data-followup="${id}" novalidate>
              <div class="group">
                <label for="followup-${id}">¿Te quedaron dudas? Pide más respuestas</label>
                <textarea id="followup-${id}" rows="3" maxlength="2000" placeholder="Escribe tu nueva pregunta para el equipo..."></textarea>
              </div>
              <div class="formmsg hidden" data-followup-msg role="status"></div>
              <button class="btn" type="submit" style="margin-top:10px">Pedir más respuestas</button>
            </form>`
          : (item.respuesta ? `<p class="muted" style="margin-top:12px">Tu nueva consulta fue enviada. El equipo te responderá pronto.</p>` : "");
        return `<article class="status-item">
        <div class="status-item-top">
          <span class="status-id">Solicitud ${id}</span>
          <span class="status-pill ${answered ? "status-pill-answered" : ""}">${answered ? "Contestado" : "Esperando respuesta"}</span>
        </div>
        <h2>${escape(item.servicio || "Solicitud de servicio")}</h2>
        <p class="status-description">${escape(item.descripcion || "")}</p>
        <div class="status-meta"><span>Enviada: ${escape(fecha)}</span></div>
        <div class="request-response"><strong>Respuesta del equipo</strong><p>${replyText}</p></div>
        ${hilo}
        ${seguimiento}
      </article>`;
      }).join("");
    } catch (error) {
      host.innerHTML = `<div class="status-empty"><h2>No se pudieron cargar tus solicitudes</h2><p>${escape(error.message)}</p></div>`;
    }
  }

  // Enviar una nueva consulta sobre una solicitud ya contestada
  host.addEventListener("submit", async event => {
    const form = event.target.closest("form[data-followup]");
    if (!form) return;
    event.preventDefault();
    const input = form.querySelector("textarea");
    const msg = form.querySelector("[data-followup-msg]");
    const text = input.value.trim();
    if (text.length < 5) { showMessage(msg, "Escribe al menos 5 caracteres.", true); return; }
    if (text.length > 2000) { showMessage(msg, "El mensaje no puede superar 2000 caracteres.", true); return; }
    const btn = form.querySelector("button[type='submit']");
    btn.disabled = true;
    try {
      await PetLove.api(`/api/solicitudes/${encodeURIComponent(form.dataset.followup)}/mensajes`, {
        method: "POST",
        body: JSON.stringify({ mensaje: text })
      });
      await cargarMisSolicitudes();
    } catch (error) {
      showMessage(msg, error.message === "Ruta no encontrada" ? "El servidor todavía no tiene activada esta opción." : error.message, true);
      btn.disabled = false;
    }
  });

  await cargarMisSolicitudes();
});