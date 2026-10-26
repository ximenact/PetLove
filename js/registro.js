document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  if (!form) return;

  const message = form.querySelector("[data-message]");
  const submit = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const nombre = document.getElementById("name")?.value.trim() || "";
    const apellido = document.getElementById("lastname")?.value.trim() || "";
    const correo = document.getElementById("regemail")?.value.trim().toLowerCase() || "";
    const telefono = document.getElementById("phone")?.value.trim() || "";
    const ciudad = document.getElementById("city")?.value.trim() || "";
    const direccion = document.getElementById("address")?.value.trim() || "";
    const nombre_mascota = document.getElementById("pet")?.value.trim() || "";
    const clave = document.getElementById("regpass")?.value;
    const confirmar = document.getElementById("confirm")?.value;

    if (clave !== confirmar) {
      PetLove.showMessage(message, "Las contraseñas no coinciden.", true);
      return;
    }

    if (submit) submit.disabled = true;
    try {
      await PetLove.api("/api/auth/registro", {
        method: "POST",
        body: JSON.stringify({
          nombre,
          apellido,
          correo,
          contraseña: clave,
          telefono,
          ciudad,
          direccion,
          nombre_mascota
        })
      });
      PetLove.showMessage(message, "Cuenta creada. Ahora puedes iniciar sesión.");
      setTimeout(() => location.href = "login.html", 900);
    } catch (error) {
      console.error("Error devuelto por el servidor:", error);
      PetLove.showMessage(message, error.message, true);
    } finally {
      if (submit) submit.disabled = false;
    }
  });
});