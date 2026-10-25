document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  if (!form) return;
  
  const message = form.querySelector("[data-message]");
  const submit = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async event => {
    event.preventDefault();
    console.log("¡Botón presionado! Iniciando validación..."); // 👈 Mensaje para saber si llega aquí
    
    const nombre1 = document.getElementById("name")?.value.trim() || "";
    const nombre2 = document.getElementById("lastname")?.value.trim() || "";
    const nombreCompleto = `${nombre1} ${nombre2}`.trim();
    
    const correo = document.getElementById("regemail")?.value.trim().toLowerCase();
    const clave = document.getElementById("regpass")?.value;
    const confirmar = document.getElementById("confirm")?.value;

    if (clave !== confirmar) {
      PetLove.showMessage(message, "Las contraseñas no coinciden.", true);
      return;
    }

    if (submit) submit.disabled = true;
    try {
      console.log("Haciendo petición a la API..."); // 👈 Mensaje de control
      await PetLove.api("/api/auth/registro", {
        method: "POST",
        body: JSON.stringify({ 
          nombre: nombreCompleto, 
          correo: correo, 
          contraseña: clave 
        })
      });
      PetLove.showMessage(message, "Cuenta creada. Ahora puedes iniciar sesión.");
      setTimeout(() => location.href = "login.html", 900);
    } catch (error) {
      console.error("Error devuelto por el servidor:", error); // 👈 Para ver el error exacto
      PetLove.showMessage(message, error.message, true);
    } finally {
      if (submit) submit.disabled = false;
    }
  });
});