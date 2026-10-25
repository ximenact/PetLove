document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("[data-profile-form]");
  if (!form) return;
  if (!PetLove.isLoggedIn()) { location.replace("login.html"); return; }

  const { showMessage, updateAccountMenu, currentUser, read, write, keys } = PetLove;
  const name = form.querySelector("#profile-name");
  const email = form.querySelector("#profile-email");
  const pet = form.querySelector("#profile-pet");
  const message = form.querySelector("[data-profile-msg]");

  // Cargar datos reales desde Neon
  let usuarioActual = currentUser();
  try {
    usuarioActual = await PetLove.api("/api/auth/yo");
    PetLove.setSession(PetLove.getToken(), {
      id_usuarios: usuarioActual.id_usuarios,
      nombre: usuarioActual.nombre,
      correo: usuarioActual.correo,
      rol: usuarioActual.rol
    });
  } catch (error) {
    showMessage(message, "No se pudo cargar tu perfil: " + error.message, true);
  }

  const perfilLocal = read(keys.profile, {});
  if (name) name.value = usuarioActual?.nombre || perfilLocal.name || "";
  if (email) email.value = usuarioActual?.correo || perfilLocal.email || "";
  if (pet) pet.value = perfilLocal.pet || "";

  function paint() {
    document.querySelector("#profile-greeting").textContent =
      name?.value.trim() ? `¡Hola, ${name.value.trim().split(" ")[0]}!` : "¡Hola, amante de las mascotas!";
    document.querySelector("#profile-name-card").textContent = name?.value.trim() || "Mi perfil";
    document.querySelector("#profile-email-card").textContent = email?.value || "";
  }
  paint();

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const nuevoNombre = name.value.trim();
    const nuevoCorreo = email.value.trim().toLowerCase();
    const nuevaMascota = pet?.value.trim() || "";

    const btn = form.querySelector('button[type="submit"]');
    btn && (btn.disabled = true);
    try {
      const actualizado = await PetLove.api("/api/auth/yo", {
        method: "PUT",
        body: JSON.stringify({ nombre: nuevoNombre, correo: nuevoCorreo })
      });
      // Actualizar cache local
      PetLove.setSession(PetLove.getToken(), {
        id_usuarios: actualizado.id_usuarios,
        nombre: actualizado.nombre,
        correo: actualizado.correo,
        rol: actualizado.rol
      });
      // Preferencia local (mascota)
      write(keys.profile, { ...perfilLocal, name: actualizado.nombre, email: actualizado.correo, pet: nuevaMascota });

      paint();
      updateAccountMenu();
      showMessage(message, "Perfil actualizado correctamente.");
    } catch (error) {
      showMessage(message, error.message, true);
    } finally {
      btn && (btn.disabled = false);
    }
  });

  document.querySelector("#logout-btn")?.addEventListener("click", () => {
    PetLove.clearSession();
    updateAccountMenu();
    location.href = "inicio.html";
  });
});