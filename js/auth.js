document.addEventListener("DOMContentLoaded", () => {
  const { keys, read, write, showMessage, updateAccountMenu, allUsers, accountKey } = PetLove;
  document.querySelectorAll("[data-demo-form]").forEach(form => form.addEventListener("submit", event => {
    event.preventDefault();
    const message = form.querySelector("[data-message]");
    if (form.id === "register-form") {
      const nameField = form.querySelector("#name");
      const emailField = form.querySelector("#regemail");
      nameField.value = nameField.value.trim();
      emailField.value = emailField.value.trim().toLowerCase();
      if (nameField.value.length < 2) {
        showMessage(message, "Ingresa un nombre de al menos 2 caracteres.", true);
        nameField.focus();
        return;
      }
    } else if (form.id === "login-form") {
      const emailField = form.querySelector("#email");
      emailField.value = emailField.value.trim().toLowerCase();
    } else {
      const blankRequiredField = [...form.querySelectorAll("[required]")].find(field =>
        field.matches("input, textarea") && !field.value.trim()
      );
      if (blankRequiredField) {
        showMessage(message, "Completa este campo con información válida.", true);
        blankRequiredField.focus();
        return;
      }
    }
    if (!form.reportValidity()) return;
    if (form.id === "register-form") {
      const password = form.querySelector("#regpass").value;
      if (password !== form.querySelector("#confirm").value) { showMessage(message, "Las contraseñas no coinciden.", true); return; }
      const user = { name: form.querySelector("#name").value.trim(), email: form.querySelector("#regemail").value.trim().toLowerCase(), password, role: form.querySelector("#register-role").value };
      const users = allUsers();
      if (users[user.email]) { showMessage(message, "Ya existe una cuenta con ese correo.", true); return; }
      users[user.email] = user; write(keys.users, users); write(accountKey(keys.profile, user.email), { name: user.name, email: user.email, pet: "" });
      localStorage.setItem(keys.user, JSON.stringify(user));
      localStorage.removeItem(keys.session);
      updateAccountMenu();
      showMessage(message, "Cuenta creada en este navegador. Ya puedes iniciar sesión."); form.reset(); return;
    }
    if (form.id === "login-form") {
      const email = form.querySelector("#email").value.trim().toLowerCase(), password = form.querySelector("#pass").value, user = allUsers()[email];
      if (user && user.email === email && user.password === password) {
        localStorage.setItem(keys.session, user.email);
        localStorage.setItem(keys.user, JSON.stringify(user));
        updateAccountMenu();
        showMessage(message, `¡Hola, ${user.name}! Sesión iniciada.`);
        setTimeout(() => location.href = user.role === "empleado" ? "empleado.html" : "inicio.html", 800);
      }
      else showMessage(message, user ? "Correo o contraseña incorrectos." : "Primero crea una cuenta desde Registro.", true);
      return;
    }
    showMessage(message, form.dataset.message || "Mensaje validado correctamente."); form.reset();
  }));
});
