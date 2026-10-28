document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  if (!form) return;
  
  const message = form.querySelector("[data-message]");
  const submit = form.querySelector('button[type="submit"]');

  // ---------- Reglas para una contraseña segura ----------
  // (el servidor valida las mismas reglas en /api/auth/registro)
  const CLAVES_COMUNES = ["password", "contrasena", "qwerty", "123456", "abc123", "admin", "petlove", "iloveyou", "letmein", "welcome"];
  const TEXTO_REGLAS = {
    largo: "entre 8 y 72 caracteres",
    mayuscula: "una letra mayúscula",
    minuscula: "una letra minúscula",
    numero: "un número",
    especial: "un carácter especial (por ejemplo ! @ # $ %)",
    espacios: "sin espacios",
    personal: "sin tu nombre ni la parte de tu correo antes de la @",
    comun: "que no sea una contraseña común",
    repetidos: "sin el mismo carácter repetido 3 veces seguidas"
  };
  const sinTildes = texto => String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  function revisarClave(clave, nombreCompleto, correo) {
    const minus = sinTildes(clave);
    const palabrasPersonales = [sinTildes(correo).split("@")[0], ...sinTildes(nombreCompleto).split(/\s+/)]
      .filter(palabra => palabra.length >= 3);
    return {
      largo: clave.length >= 8 && new TextEncoder().encode(clave).length <= 72,
      mayuscula: /\p{Lu}/u.test(clave),
      minuscula: /\p{Ll}/u.test(clave),
      numero: /[0-9]/.test(clave),
      especial: /[^\p{L}\p{N}\s]/u.test(clave),
      espacios: !/\s/.test(clave),
      personal: !palabrasPersonales.some(palabra => minus.includes(palabra)),
      comun: !CLAVES_COMUNES.some(comun => minus.includes(comun)),
      repetidos: !/(.)\1\1/u.test(clave)
    };
  }

  const campoClave = document.getElementById("regpass");
  const textoSeguridad = form.querySelector("[data-password-strength]");

  function datosParaRevisar() {
    const nombre = `${document.getElementById("name")?.value || ""} ${document.getElementById("lastname")?.value || ""}`.trim();
    const correo = (document.getElementById("regemail")?.value || "").trim().toLowerCase();
    return { nombre, correo };
  }

  // Marca cada regla con ✓ (cumplida), ○ (pendiente) o ✗ (no cumplida, después de intentar enviar)
  function pintarReglas(marcarFallos = false) {
    const clave = campoClave?.value || "";
    const { nombre, correo } = datosParaRevisar();
    const resultado = revisarClave(clave, nombre, correo);
    form.querySelectorAll("[data-rule]").forEach(item => {
      const cumple = resultado[item.dataset.rule];
      const icono = item.querySelector("[data-icon]");
      if (icono) icono.textContent = cumple ? "✓" : (marcarFallos ? "✗" : "○");
      item.style.color = cumple ? "#2e7d32" : (marcarFallos ? "#c62828" : "");
    });
    if (textoSeguridad) {
      const todas = Object.values(resultado).every(Boolean);
      if (!clave) { textoSeguridad.textContent = ""; }
      else if (!todas) { textoSeguridad.textContent = "Seguridad: débil"; textoSeguridad.style.color = "#c62828"; }
      else if (clave.length >= 12) { textoSeguridad.textContent = "Seguridad: muy segura"; textoSeguridad.style.color = "#2e7d32"; }
      else { textoSeguridad.textContent = "Seguridad: buena"; textoSeguridad.style.color = "#2e7d32"; }
    }
    return resultado;
  }

  ["regpass", "name", "lastname", "regemail"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", () => pintarReglas());
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    console.log("¡Botón presionado! Iniciando validación..."); // 👈 Mensaje para saber si llega aquí
    
    const nombre1 = document.getElementById("name")?.value.trim() || "";
    const nombre2 = document.getElementById("lastname")?.value.trim() || "";
    const nombreCompleto = `${nombre1} ${nombre2}`.trim();
    
    const correo = document.getElementById("regemail")?.value.trim().toLowerCase();
    const clave = document.getElementById("regpass")?.value;
    const confirmar = document.getElementById("confirm")?.value;

    // Contraseña segura: se revisan todas las reglas antes de enviar
    const resultadoClave = pintarReglas(true);
    const faltan = Object.keys(resultadoClave).filter(regla => !resultadoClave[regla]);
    if (faltan.length) {
      PetLove.showMessage(message, `La contraseña no es lo bastante segura. Debe tener: ${faltan.map(regla => TEXTO_REGLAS[regla]).join("; ")}.`, true);
      campoClave?.focus();
      return;
    }

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