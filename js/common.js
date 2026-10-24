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
  [
    "alimento-cachorros",
    "Alimento para cachorros",
    "Alimentos",
    58900,
    "alimento cachorros.jpg",
    "Fórmula rica en nutrientes esenciales diseñada para acompañar y fortalecer la etapa de crecimiento de tu cachorro."
  ],
  [
    "hill-nutrition",
    "Hill's Pet Nutrition",
    "Alimentos",
    74900,
    "Hill's Pet Nutrition.jpg",
    "Nutrición completa y equilibrada formulada específicamente para perros adultos, aportando la energía y vitalidad que necesitan a diario."
  ],
  [
    "gatos-adultos",
    "Alimento para gatos adultos",
    "Alimentos",
    46900,
    "gatos adultos.jpg",
    "Alimento seco balanceado para la nutrición diaria de felinos adultos, cuidando su salud general."
  ],
  [
    "comida-humeda",
    "Comida húmeda",
    "Alimentos",
    8900,
    "comida humeda.jpg",
    "Deliciosa porción individual de alimento húmedo, ideal para consentir a tu michi y mantenerlo hidratado."
  ],
  [
    "snacks",
    "Snacks para consentir",
    "Alimentos",
    12900,
    "snacks.png",
    "Deliciosos premios pequeños diseñados para reforzar conductas positivas en perros y gatos durante su entrenamiento.."
  ],
  [ 
    "smallbreed",
    "Alimento razas pequeñas",
    "Alimentos",
    27000,
    "razas pequenas.jpg",
    "Croquetas con un tamaño adaptado a la mandíbula de los perros de raza pequeña, facilitando su masticación."
  ],
  [
    "cama-perro",
    "Cama acogedora para perro",
    "Camas",
    89900,
    "cama perro.jpg",
    "Espacio suave, mullido y confortable para brindar un descanso óptimo a tu perro o cachorro."
  ],
  [
    "cama-gato",
    "Cama suave para gato",
    "Camas",
    69900,
    "cama gato.jpg",
    "Cama versátil y suave, adaptada especialmente para el descanso de gatos o perros de raza pequeña."
  ],
  [
    "cama-gyp",
    "Cama para perros y gatos",
    "Camas",
    79900,
    "cama GyP.png",
    "Comodidad para mascotas de todos los tamaños."
  ],
  [
    "juguetes-perro",
    "Set de juguetes para perro",
    "Juguetes",
    24900,
    "juguetes perro.jpg",
    "Variedad de juguetes resistentes pensados para morder, lanzar y evitar el aburrimiento de tu perro."
  ],
  [
    "juguetes-gato",
    "Set de Juguetes para gato",
    "Juguetes",
    18900,
    "juguetes gato.png",
    "Set variado de juguetes interactivos para despertar el instinto cazador y mantener a tu gato activo y entretenido."
  ],
  [
    "pluma-gato",
    "Varita con plumas",
    "Juguetes",
    9900,
    "pluma gato.jpg",
    "Juguete clásico con plumas para estimular la curiosidad, agilidad y el juego compartido con tu gato."
  ],
  [
    "snack-dental",
    "Snack Dental",
    "Alimentos",
    12500,
    "dental.png",
    "Botanas comestibles diseñadas para complementar la higiene bucal, reduciendo el sarro y manteniendo un aliento fresco."
  ],
  [
    "arnes-perro",
    "Arnés para perro",
    "Accesorios",
    32900,
    "arnes perro.jpg",
    "Arnés ergonómico y resistente que brinda máxima comodidad y control seguro durante los paseos diarios de tu perro.."
  ],
  [
    "arnes-gato",
    "Arnés para gato",
    "Accesorios",
    29900,
    "arnes gato.jpg",
    "Arnés ligero y seguro adaptado a la anatomía felina para pasear al aire libre con total tranquilidad."
  ],
  [
    "collares",
    "Collar para mascota",
    "Accesorios",
    19900,
    "collares.jpg",
    "Set de collares cómodos y duraderos para la identificación y estilo diario de tu mascota."
  ],
  [
    "panolleta",
    "Pañoleta",
    "Accesorios",
    14900,
    "pañoleta.jpg",
    "Accesorio textil moderno y encantador para darle un toque diferente y lindo a tu perro o gato."
  ],
  [
    "guacal",
    "Guacal de viaje",
    "Accesorios",
    119900,
    "guacal.png",
    "Transportadora segura y bien ventilada, esencial para viajes y visitas al veterinario."
  ],
  [
    "plato-perro",
    "Plato para perro",
    "Alimentos",
    22900,
    "plato perro.8yvb00MYJ9K",
    "Comedero doble resistente para agua y alimento, perfecto para el uso diario de tu perro."
  ],
  [
    "plato-gato",
    "Plato elevado para gato",
    "Alimentos",
    18900,
    "plato gato.jpg",
    "Kit de dos recipientes elevados (para agua y comida) que favorece una postura cómoda y ergonómica durante las comidas de tu gato."
  ],
  [
    "plato-lento",
    "Plato de alimentación lenta",
    "Alimentos",
    27900,
    "plato lento.jpg",
    "Plato interactivo diseñado para reducir la velocidad a la que come tu mascota, previniendo asfixias y mejorando la digestión."
  ],
  [
    "fuente",
    "Fuente de agua",
    "Accesorios",
    99900,
    "fuente.jpg",
    "Fuente con flujo constante de agua fresca que motiva a tu gato a beber más e hidratarse mejor.."
  ],
  [
    "dispensador",
    "Dispensador portátil",
    "Accesorios",
    25900,
    "dispensador.jpg",
    "Dispensador automático práctico que facilita la dosificación y la rutina de alimentación de tu mascota."
  ],
  [
    "impermeable",
    "Impermeable para mascotas",
    "Accesorios",
    39900,
    "impermeable.jpg",
    "Capa protectora ligera y resistente al agua para mantener a tu perro seco en los días de lluvia."
  ],
  [
    "cepillo",
    "Cepillo de cuidado",
    "Higiene",
    16900,
    "cepillo.jpg",
    "Cepillo diseñado para retirar el pelo muerto, evitar nudos y mantener el pelaje brillante y tu casa más limpia."
  ],
  [
    "arena",
    "Arena para gato",
    "Higiene",
    22900,
    "arena.jpg",
    "Arena ecológica a base de maíz, neutra en olores, altamente absorbente y totalmente biodegradable."
  ],
  [
    "toallitas",
    "Toallitas húmedas",
    "Higiene",
    12900,
    "toallitas.jpg",
    "Toallitas suaves e hipoalergénicas ideales para la limpieza rápida de patas, pelaje y zonas sensibles sin irritar la piel."
  ],
  [
    "rascador",
    "Rascador para gato",
    "Accesorios",
    65900,
    "rascador.jpg",
    "Estructura para rascar que protege tus muebles y ayuda a tu gato a afilar sus uñas y liberar estrés."
  ],
  [
    "piel-sensible",
    "Cuidado para piel sensible",
    "Alimentos",
    28900,
    "piel sensible.webp",
    "Nutrición especializada de alta digestibilidad, recomendada para perros con sensibilidad cutánea o digestiva."
  ],
  [
    "bolsitas",
    "Bolsitas para paseo",
    "Higiene",
    7900,
    "bolsitas.png",
    "Rollos de bolsas resistentes para la recolección responsable de desechos durante las caminatas."
  ]
]

.map(([id, name, category, price, image, description]) => ({ id, name, category, price, image: `img/${image}`, description }));
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
