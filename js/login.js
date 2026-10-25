document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (!form) return;
  
  const message = form.querySelector("[data-message]");
  const submit = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const correo = document.getElementById("email")?.value.trim().toLowerCase();
    const clave  = document.getElementById("pass")?.value;

    if (!correo || !clave) { 
      PetLove.showMessage(message, "Escribe tu correo y contraseña.", true); 
      return; 
    }

    if (submit) submit.disabled = true;
    try {
      const data = await PetLove.api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ correo, contraseña: clave })
      });

      // Normalizamos el rol que viene de Neon (minúsculas y sin espacios)
      const rol = String(data.usuario.rol || "cliente").trim().toLowerCase();
      
      // Guardamos la sesión completa (token + datos del usuario incluyendo el ROL)
      PetLove.setSession(data.token, {
        id_usuarios: data.usuario.id_usuarios,
        nombre: data.usuario.nombre,
        correo: data.usuario.correo,
        rol: rol,
        role: rol // 👈 common.js y empleado.js leen "user.role", por eso se guarda con este nombre también
      });
      
      PetLove.showMessage(message, `Bienvenido, ${data.usuario.nombre}.`);
      PetLove.updateAccountMenu();

      // Redirección según el rol
      if (rol === "administrador") {
        location.href = "administrador.html";
      } else if (rol === "empleado") {
        location.href = "empleado.html";
      } else {
        location.href = "inicio.html";
      }
      
    } catch (error) {
      PetLove.showMessage(message, error.message, true);
    } finally {
      if (submit) submit.disabled = false;
    }
  });
});