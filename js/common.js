window.PetLove = (() => {
  const keys = {
    token: "petlove_token",
    session: "petlove_session",
    user: "petlove_user",
    cart: "petlove_cart",
    profile: "petlove_profile"
  };

  // Detecta si estás en Live Server (5500) o en la nube
  const API_BASE = (location.hostname === "127.0.0.1" || location.hostname === "localhost") 
    ? "http://localhost:3000" 
    : ""; 

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const money = value => new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0
  }).format(value);

  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));

  function getToken() { return localStorage.getItem(keys.token); }
  function setSession(token, usuario) {
    if (token) localStorage.setItem(keys.token, token);
    if (usuario) {
      write(keys.user, usuario);
      if (usuario.correo) localStorage.setItem(keys.session, usuario.correo);
    }
  }
  function clearSession() {
    localStorage.removeItem(keys.token);
    localStorage.removeItem(keys.session);
    localStorage.removeItem(keys.user);
  }
  function currentUser() { return read(keys.user, null); }
  function isLoggedIn() { return Boolean(getToken() && currentUser()); }

  async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(API_BASE + path, { ...options, headers });
    let data = null;
    try { data = await res.json(); } catch { /* sin body */ }
    if (!res.ok) {
      if (res.status === 401) clearSession();
      throw new Error((data && data.error) || `Error ${res.status}`);
    }
    return data;
  }

  // LISTA DE PRODUCTOS ESTÁTICOS (Tu catálogo original)
  const PRODUCTOS_ESTATICOS = [
    ["alimento-cachorros", "Alimento para cachorros", "Alimentos", 58900, "alimento cachorros.jpg", "Fórmula rica en nutrientes esenciales diseñada para acompañar y fortalecer la etapa de crecimiento de tu cachorro."],
    ["hill-nutrition", "Hill's Pet Nutrition", "Alimentos", 74900, "Hill's Pet Nutrition.jpg", "Nutrición completa y equilibrada formulada específicamente para perros adultos, aportando la energía y vitalidad que necesitan a diario."],
    ["gatos-adultos", "Alimento para gatos adultos", "Alimentos", 46900, "gatos adultos.jpg", "Alimento seco balanceado para la nutrición diaria de felinos adultos, cuidando su salud general."],
    ["comida-humeda", "Comida húmeda", "Alimentos", 8900, "comida humeda.jpg", "Deliciosa porción individual de alimento húmedo, ideal para consentir a tu michi y mantenerlo hidratado."],
    ["snacks", "Snacks para consentir", "Alimentos", 12900, "snacks.png", "Deliciosos premios pequeños diseñados para reforzar conductas positivas en perros y gatos durante su entrenamiento."],
    ["smallbreed", "Alimento razas pequeñas", "Alimentos", 27000, "razas pequenas.jpg", "Croquetas con un tamaño adaptado a la mandíbula de los perros de raza pequeña, facilitando su masticación."],
    ["cama-perro", "Cama acogedora para perro", "Camas", 89900, "cama perro.jpg", "Espacio suave, mullido y confortable para brindar un descanso óptimo a tu perro o cachorro."],
    ["cama-gato", "Cama suave para gato", "Camas", 69900, "cama gato.jpg", "Cama versátil y suave, adaptada especialmente para el descanso de gatos o perros de raza pequeña."],
    ["cama-gyp", "Cama para perros y gatos", "Camas", 79900, "cama GyP.png", "Comodidad para mascotas de todos los tamaños."],
    ["juguetes-perro", "Set de juguetes para perro", "Juguetes", 24900, "juguetes perro.jpg", "Variedad de juguetes resistentes pensados para morder, lanzar y evitar el aburrimiento de tu perro."],
    ["juguetes-gato", "Set de Juguetes para gato", "Juguetes", 18900, "juguetes gato.png", "Set variado de juguetes interactivos para despertar el instinto cazador y mantener a tu gato activo y entretenido."],
    ["pluma-gato", "Varita con plumas", "Juguetes", 9900, "pluma gato.jpg", "Juguete clásico con plumas para estimular la curiosidad, agilidad y el juego compartido con tu gato."],
    ["snack-dental", "Snack Dental", "Alimentos", 12500, "dental.png", "Botanas comestibles diseñadas para complementar la higiene bucal, reduciendo el sarro y manteniendo un aliento fresco."],
    ["arnes-perro", "Arnés para perro", "Accesorios", 32900, "arnes perro.jpg", "Arnés ergonómico y resistente que brinda máxima comodidad y control seguro durante los paseos diarios de tu perro."],
    ["arnes-gato", "Arnés para gato", "Accesorios", 29900, "arnes gato.jpg", "Arnés ligero y seguro adaptado a la anatomía felina para pasear al aire libre con total tranquilidad."],
    ["collares", "Collar para mascota", "Accesorios", 19900, "collares.jpg", "Set de collares cómodos y duraderos para la identificación y estilo diario de tu mascota."],
    ["panolleta", "Pañoleta", "Accesorios", 14900, "panoleta.jpg", "Accesorio textil moderno y encantador para darle un toque diferente y lindo a tu perro o gato."],
    ["guacal", "Guacal de viaje", "Accesorios", 119900, "guacal.png", "Transportadora segura y bien ventilada, esencial para viajes y visitas al veterinario."],
    ["plato-perro", "Plato para perro", "Alimentos", 22900, "plato perro.8yvb00MYJ9K", "Comedero doble resistente para agua y alimento, perfecto para el uso diario de tu perro."],
    ["plato-gato", "Plato elevado para gato", "Alimentos", 18900, "plato gato.jpg", "Kit de dos recipientes elevados (para agua y comida) que favorece una postura cómoda y ergonómica durante las comidas de tu gato."],
    ["plato-lento", "Plato de alimentación lenta", "Alimentos", 27900, "plato lento.jpg", "Plato interactivo diseñado para reducir la velocidad a la que come tu mascota, previniendo asfixias y mejorando la digestión."],
    ["fuente", "Fuente de agua", "Accesorios", 99900, "fuente.jpg", "Fuente con flujo constante de agua fresca que motiva a tu gato a beber más e hidratarse mejor."],
    ["dispensador", "Dispensador portátil", "Accesorios", 25900, "dispensador.jpg", "Dispensador automático práctico que facilita la dosificación y la rutina de alimentación de tu mascota."],
    ["impermeable", "Impermeable para mascotas", "Accesorios", 39900, "impermeable.jpg", "Capa protectora ligera y resistente al agua para mantener a tu perro seco en los días de lluvia."],
    ["cepillo", "Cepillo de cuidado", "Higiene", 16900, "cepillo.jpg", "Cepillo diseñado para retirar el pelo muerto, evitar nudos y mantener el pelaje brillante y tu casa más limpia."],
    ["arena", "Arena para gato", "Higiene", 22900, "arena.jpg", "Arena ecológica a base de maíz, neutra en olores, altamente absorbente y totalmente biodegradable."],
    ["toallitas", "Toallitas húmedas", "Higiene", 12900, "toallitas.jpg", "Toallitas suaves e hipoalergénicas ideales para la limpieza rápida de patas, pelaje y zonas sensibles sin irritar la piel."],
    ["rascador", "Rascador para gato", "Accesorios", 65900, "rascador.jpg", "Estructura para rascar que protege tus muebles y ayuda a tu gato a afilar sus uñas y liberar estrés."],
    ["piel-sensible", "Cuidado para piel sensible", "Alimentos", 28900, "piel sensible.webp", "Nutrición especializada de alta digestibilidad, recomendada para perros con sensibilidad cutánea o digestiva."],
    ["bolsitas", "Bolsitas para paseo", "Higiene", 7900, "bolsitas.png", "Rollos de bolsas resistentes para la recolección responsable de desechos durante las caminatas."]
  ];

  const products = PRODUCTOS_ESTATICOS.map(([id, name, category, price, image, description]) => ({
    id, name, category, price, image: `img/${image}`, description
  }));

  // Imagen que se muestra cuando un producto nuevo no tiene imagen_url
  const IMAGEN_POR_DEFECTO = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#f3efff"/>' +
    '<text x="50%" y="50%" font-size="80" text-anchor="middle" dominant-baseline="middle">🐾</text></svg>'
  );

  // 🔥 FUNCIÓN CLAVE: Sincroniza los IDs de Neon con tu catálogo
  let productosCargadosPromise = null;
  function cargarProductosDesdeBD() {
    if (productosCargadosPromise) return productosCargadosPromise;
    productosCargadosPromise = api("/api/productos")
      .then(lista => {
        if (!Array.isArray(lista)) return products;
        lista.forEach(prodBD => {
          // Busca el producto en tu catálogo por nombre
          const prodLocal = products.find(p => p.name.toLowerCase().trim() === prodBD.nombre.toLowerCase().trim());
          if (prodLocal) {
            prodLocal.idProductosBD = Number(prodBD.id_productos); // Le asigna el ID real de Neon
            prodLocal.stockBD = Number(prodBD.stock);
            prodLocal.price = Number(prodBD.precio) || prodLocal.price;
          } else if (!products.some(p => p.idProductosBD === Number(prodBD.id_productos))) {
            // Producto nuevo creado desde el panel de administrador: no está en el catálogo
            // estático, así que lo agregamos para que el cliente también lo vea.
            products.push({
              id: `bd-${Number(prodBD.id_productos)}`,
              name: prodBD.nombre,
              category: prodBD.categoria || "Otros",
              price: Number(prodBD.precio) || 0,
              image: prodBD.imagen_url || IMAGEN_POR_DEFECTO,
              description: prodBD.descripcion || "",
              idProductosBD: Number(prodBD.id_productos),
              stockBD: Number(prodBD.stock)
            });
          }
        });
        return products;
      })
      .catch((err) => {
        console.error("Error al conectar con la tabla productos de Neon:", err);
        return products;
      });
    return productosCargadosPromise;
  }

  function toast(message) {
    let node = document.querySelector(".toast");
    if (!node) {
      node = document.createElement("div");
      node.className = "toast";
      node.setAttribute("role", "status");
      document.body.append(node);
    }
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.remove(), 2600);
  }

  function cartKey() {
    const u = currentUser();
    return u && u.correo ? `${keys.cart}:${encodeURIComponent(u.correo)}` : `${keys.cart}:guest`;
  }
  
  function updateCartCount() {
    const count = read(cartKey(), []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    document.querySelectorAll("[data-count]").forEach(node => node.textContent = count);
  }
  
  function addToCart(id, quantity = 1) {
    if (!isLoggedIn()) { toast("Inicia sesión para agregar productos al carrito."); return false; }
    const user = currentUser();
    if (user.role === "empleado" || user.role === "administrador") { 
      toast("Este tipo de cuenta no puede realizar compras."); return false; 
    }
    const product = products.find(item => item.id === id);
    if (!product) return false;
    const k = cartKey();
    const cart = read(k, []);
    const existing = cart.find(item => item.id === id);
    existing ? existing.quantity += quantity : cart.push({ id, quantity });
    write(k, cart);
    updateCartCount();
    toast(`${product.name} se agregó al carrito.`);
    return true;
  }

  function showMessage(node, message, error = false) {
    if (!node) return;
    node.textContent = `${error ? "⚠ " : "✓ "}${message}`;
    node.classList.remove("hidden");
    node.classList.toggle("formmsg-error", error);
    node.classList.toggle("formmsg-success", !error);
    node.setAttribute("role", error ? "alert" : "status");
  }

  function updateAccountMenu() {
    const loggedIn = isLoggedIn();
    const user = currentUser();
    const role = loggedIn ? user.role : null;
    const isEmployee = role === "empleado";
    document.querySelectorAll('a[href="carrito.html"]').forEach(link => {
      if (link.classList.contains("cart-link")) { link.style.display = ""; link.style.visibility = isEmployee ? "hidden" : ""; }
      else link.style.display = isEmployee ? "none" : "";
    });
    document.querySelectorAll(".links").forEach(nav => {
      let profileLink = nav.querySelector('a[href="perfil.html"]');
      nav.querySelectorAll("[data-role-link]").forEach(link => link.remove());
      if (loggedIn && !profileLink) {
        profileLink = document.createElement("a");
        profileLink.href = "perfil.html";
        profileLink.textContent = "Mi perfil";
        nav.append(profileLink);
      }
      if (profileLink) profileLink.classList.toggle("hidden", !loggedIn);
      if (role === "empleado" || role === "administrador") {
        const link = document.createElement("a");
        link.href = role === "administrador" ? "administrador.html" : "empleado.html";
        link.textContent = role === "administrador" ? "Panel administrador" : "Panel empleado";
        link.dataset.roleLink = "";
        nav.append(link);
      }
      nav.querySelectorAll("[data-account-link]").forEach(link => link.remove());
      if (!loggedIn) {
        const login = document.createElement("button");
        login.type = "button"; login.className = "btn"; login.textContent = "Iniciar sesión";
        login.dataset.accountLink = "";
        login.addEventListener("click", () => { location.href = "login.html"; });
        nav.append(login);
      }
    });
  }

  return {
    keys, read, write, money, escape, products, toast,
    updateCartCount, addToCart, showMessage, isLoggedIn, updateAccountMenu,
    currentUser, cartKey,
    api, getToken, setSession, clearSession, cargarProductosDesdeBD
  };
})();

// Bootstrap común
document.addEventListener("DOMContentLoaded", () => {
  PetLove.updateCartCount();
  PetLove.updateAccountMenu();
  PetLove.cargarProductosDesdeBD().then(() => PetLove.updateCartCount());
  
  const path = location.pathname.toLowerCase();
  const loggedIn = PetLove.isLoggedIn();
  const user = PetLove.currentUser();

  if (path.endsWith("/perfil.html") && !loggedIn) location.replace("login.html");
  if (path.endsWith("/empleado.html") && (!loggedIn || user.role !== "empleado")) location.replace("login.html");
  if (path.endsWith("/administrador.html") && (!loggedIn || user.role !== "administrador")) location.replace("login.html");
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav').forEach((bar) => {
    const links = bar.querySelector('.links');
    if (!links) return;
    let toggle = bar.querySelector('.menu-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'menu-toggle';
      toggle.setAttribute('aria-label', 'Abrir menú');
      toggle.innerHTML = '<span></span><span></span><span></span>';
      bar.insertBefore(toggle, links);
    }
    toggle.addEventListener('click', () => {
      const opened = links.classList.toggle('is-open');
      toggle.classList.toggle('is-open', opened);
    });
  });
});