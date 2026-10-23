window.PetLove = (() => {
  const keys = { cart: "petlove_cart", profile: "petlove_profile", user: "petlove_user", users: "petlove_users", orders: "petlove_orders", session: "petlove_session" };
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  function allUsers() { const users = read(keys.users, {}), legacy = read(keys.user, null); if (legacy?.email && !users[legacy.email]) users[legacy.email] = legacy; return users; }
  function currentUser() { const email = localStorage.getItem(keys.session); return email ? allUsers()[email] || null : null; }
  function accountKey(base, email = localStorage.getItem(keys.session)) { return email ? `${base}:${encodeURIComponent(email)}` : `${base}:guest`; }
  const money = value => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const products = [
    ["alimento-cachorros", "Alimento para cachorros", "Alimentos", 58900, "alimento cachorros.jpg", "Nutrición completa para acompañar el crecimiento de tu cachorro."],
    ["hill-nutrition", "Hill's Pet Nutrition", "Alimentos", 74900, "Hill's Pet Nutrition.jpg", "Alimento nutritivo para cuidar la salud y vitalidad de tu mascota."],
    ["gatos-adultos", "Alimento para gatos adultos", "Alimentos", 46900, "gatos adultos.jpg", "Receta balanceada para la alimentación diaria de gatos adultos."],
    ["comida-humeda", "Comida húmeda", "Alimentos", 8900, "comida humeda.jpg", "Una porción deliciosa para complementar sus comidas."],
    ["snacks", "Snacks para consentir", "Alimentos", 12900, "snacks.png", "Premios ideales para sus momentos de juego y aprendizaje."],
    ["cama-perro", "Cama acogedora para perro", "Camas", 89900, "cama perro.jpg", "Un espacio cómodo para descansar y soñar."],
    ["cama-gato", "Cama suave para gato", "Camas", 69900, "cama gato.jpg", "Un rincón cálido y suave para las siestas de tu gato."],
    ["cama-gyp", "Cama para perros y gatos", "Camas", 79900, "cama GyP.png", "Comodidad para mascotas de todos los tamaños."],
    ["juguetes-perro", "Set de juguetes para perro", "Juguetes", 24900, "juguetes perro.jpg", "Juguetes para estimular el movimiento y la diversión."],
    ["juguetes-gato", "Juguete para gato", "Juguetes", 18900, "juguetes gato.png", "Diversión y actividad para despertar su instinto juguetón."],
    ["pluma-gato", "Varita con plumas", "Juguetes", 9900, "pluma gato.jpg", "Una divertida varita para compartir tiempo de juego."],
    ["rascador", "Rascador para gato", "Accesorios", 65900, "rascador.jpg", "Un lugar propio para afilar sus uñas y estirarse."],
    ["arnes-perro", "Arnés para perro", "Accesorios", 32900, "arnes perro.jpg", "Un arnés cómodo para acompañarlo en cada paseo."],
    ["arnes-gato", "Arnés para gato", "Accesorios", 29900, "arnes gato.jpg", "Un arnés ligero para explorar de forma cómoda."],
    ["collares", "Collar para mascota", "Accesorios", 19900, "collares.jpg", "Un collar práctico para sus aventuras."],
    ["panolleta", "Pañoleta", "Accesorios", 14900, "pañoleta.jpg", "Un detalle colorido para que luzca genial."],
    ["guacal", "Guacal de viaje", "Accesorios", 119900, "guacal.png", "Un espacio seguro para llevarlo contigo."],
    ["plato-perro", "Plato para perro", "Accesorios", 22900, "plato perro.8yvb00MYJ9K", "Plato resistente para servir sus comidas favoritas."],
    ["plato-gato", "Plato para gato", "Accesorios", 18900, "plato gato.jpg", "Un plato práctico para la hora de comer."],
    ["plato-lento", "Plato de alimentación lenta", "Accesorios", 27900, "plato lento.jpg", "Ayuda a que disfrute sus comidas con más calma."],
    ["fuente", "Fuente de agua", "Accesorios", 99900, "fuente.jpg", "Agua en movimiento para animarlo a hidratarse."],
    ["dispensador", "Dispensador portátil", "Accesorios", 25900, "dispensador.jpg", "Lleva agua o snacks de forma cómoda en los paseos."],
    ["impermeable", "Impermeable para mascotas", "Accesorios", 39900, "impermeable.jpg", "Una capa ligera para salir en días lluviosos."],
    ["cepillo", "Cepillo de cuidado", "Higiene", 16900, "cepillo.jpg", "Ayuda a mantener su pelaje limpio y cuidado."],
    ["arena", "Arena para gato", "Higiene", 22900, "arena.jpg", "Arena práctica para mantener limpio su espacio."],
    ["toallitas", "Toallitas húmedas", "Higiene", 12900, "toallitas.jpg", "Limpieza rápida para sus patas y pelaje."],
    ["dental", "Cuidado dental", "Higiene", 21900, "dental.png", "Un complemento para su rutina de higiene oral."],
    ["piel-sensible", "Cuidado para piel sensible", "Higiene", 28900, "piel sensible.webp", "Cuidado delicado para mascotas con piel sensible."],
    ["bolsitas", "Bolsitas para paseo", "Higiene", 7900, "bolsitas.png", "Un básico práctico para mantener limpios los espacios."]
  ].map(([id, name, category, price, image, description]) => ({ id, name, category, price, image: `img/${image}`, description }));
  function toast(message) {
    let node = document.querySelector(".toast");
    if (!node) { node = document.createElement("div"); node.className = "toast"; node.setAttribute("role", "status"); document.body.append(node); }
    node.textContent = message; clearTimeout(toast.timer); toast.timer = setTimeout(() => node.remove(), 2600);
  }
  function updateCartCount() {
    const count = read(accountKey(keys.cart), []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    document.querySelectorAll("[data-count]").forEach(node => node.textContent = count);
  }
  function addToCart(id, quantity = 1) {
    if (!isLoggedIn()) { toast("Inicia sesión para agregar productos al carrito."); return false; }
    const product = products.find(item => item.id === id); if (!product) return false;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      toast("La cantidad debe ser un número entero entre 1 y 99."); return false;
    }
    const cartKey = accountKey(keys.cart), cart = read(cartKey, []), existing = cart.find(item => item.id === id);
    if (existing && existing.quantity + quantity > 99) {
      toast("No puedes agregar más de 99 unidades del mismo producto."); return false;
    }
    existing ? existing.quantity += quantity : cart.push({ id, quantity });
    write(cartKey, cart); updateCartCount(); toast(`${product.name} se agregó al carrito.`); return true;
  }
  function showMessage(node, message, error = false) {
    if (!node) return; node.textContent = message; node.classList.remove("hidden");
    node.style.background = error ? "#fff0f0" : "#e8faf2"; node.style.color = error ? "#9f1239" : "#065f46";
  }
  function isLoggedIn() {
    return Boolean(currentUser());
  }
  function updateAccountMenu() {
    const loggedIn = isLoggedIn();
    document.querySelectorAll(".links").forEach(nav => {
      let profileLink = nav.querySelector('a[href="perfil.html"]');
      nav.querySelectorAll("[data-role-link]").forEach(link => link.remove());
      if (loggedIn && !profileLink) {
        profileLink = document.createElement("a"); profileLink.href = "perfil.html"; profileLink.textContent = "Mi perfil"; nav.append(profileLink);
      }
      if (profileLink) profileLink.classList.toggle("hidden", !loggedIn);
      if (loggedIn && currentUser().role === "empleado") { const link = document.createElement("a"); link.href = "empleado.html"; link.textContent = "Panel empleado"; link.dataset.roleLink = ""; nav.append(link); }
      nav.querySelectorAll("[data-account-link]").forEach(link => link.remove());
      if (!loggedIn) {
        const login = document.createElement("a"); login.href = "login.html"; login.textContent = "Iniciar sesión"; login.dataset.accountLink = "";
        const register = document.createElement("a"); register.href = "registro.html"; register.textContent = "Registrarse"; register.dataset.accountLink = "";
        nav.append(login, register);
      }
    });
  }
  return { keys, read, write, money, escape, products, toast, updateCartCount, addToCart, showMessage, isLoggedIn, updateAccountMenu, allUsers, currentUser, accountKey };
})();
document.addEventListener("DOMContentLoaded", () => {
  PetLove.updateCartCount();
  PetLove.updateAccountMenu();
  if (location.pathname.toLowerCase().endsWith("/perfil.html") && !PetLove.isLoggedIn()) location.replace("login.html");
  if (location.pathname.toLowerCase().endsWith("/empleado.html") && (!PetLove.isLoggedIn() || PetLove.currentUser().role !== "empleado")) location.replace("login.html");
});
