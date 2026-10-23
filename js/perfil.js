document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-profile-form]"); if (!form) return;
  const { keys, read, write, showMessage, updateAccountMenu, accountKey, currentUser } = PetLove, user = currentUser(), profile = read(accountKey(keys.profile), {});
  if (!PetLove.isLoggedIn()) { location.replace("login.html"); return; }
  const name = form.querySelector("#profile-name"), email = form.querySelector("#profile-email"), pet = form.querySelector("#profile-pet"), message = form.querySelector("[data-profile-msg]");
  name.value = profile.name || ""; email.value = profile.email || ""; pet.value = profile.pet || "";
  function paint() {
    document.querySelector("#profile-greeting").textContent = name.value.trim() ? `¡Hola, ${name.value.trim().split(" ")[0]}!` : "¡Hola, amante de las mascotas!";
    document.querySelector("#profile-name-card").textContent = name.value.trim() || "Mi perfil";
    document.querySelector("#profile-email-card").textContent = email.value || "Inicia sesión para ver tus datos";
  }
  paint();
  form.addEventListener("submit", event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    const updated = { name: name.value.trim(), email: email.value.trim().toLowerCase(), pet: pet.value.trim() }; write(keys.profile, updated);
    if (user) { user.name = updated.name; write(keys.users, { ...PetLove.allUsers(), [user.email]: user }); write(keys.user, user); }
    paint(); showMessage(message, "Perfil actualizado correctamente.");
  });
  document.querySelector("#logout-btn")?.addEventListener("click", () => {
    localStorage.removeItem(keys.session); updateAccountMenu();
    location.href = "inicio.html";
  });
});
