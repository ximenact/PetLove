(() => {
  "use strict";

  const catalog = window.PETLOVE_CATALOG || [];
  const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const list = document.querySelector("#product-list");
  const searchInput = document.querySelector("#search-input");
  const resultsStatus = document.querySelector("#results-status");
  const cartPanel = document.querySelector("#cart");
  const cartItems = document.querySelector("#cart-items");
  const cart = new Map();
  let selectedCategory = "todos";
  let searchTerm = "";

  function renderCatalog() {
    const filtered = catalog.filter((item) => {
      const matchesCategory = selectedCategory === "todos" || item.category === selectedCategory;
      const text = `${item.name} ${item.description} ${item.category}`.toLocaleLowerCase("es");
      return matchesCategory && text.includes(searchTerm);
    });
    list.replaceChildren();
    resultsStatus.textContent = `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`;
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.textContent = "No encontramos resultados. Prueba con otra búsqueda.";
      list.append(empty);
      return;
    }
    filtered.forEach((item) => {
      const article = document.createElement("article");
      const title = document.createElement("h3");
      title.textContent = `${item.emoji} ${item.name}`;
      const description = document.createElement("p");
      description.textContent = item.description;
      const price = document.createElement("p");
      price.textContent = `${money.format(item.price)} · ${item.unit}`;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.category === "servicio" ? "Agregar cita" : "Agregar al carrito";
      button.addEventListener("click", () => addToCart(item.id));
      article.append(title, description, price, button);
      list.append(article);
    });
  }

  function renderCart() {
    cartItems.replaceChildren();
    let total = 0;
    let count = 0;
    cart.forEach((quantity, id) => {
      const item = catalog.find((product) => product.id === id);
      if (!item) return;
      count += quantity;
      total += item.price * quantity;
      const row = document.createElement("section");
      const title = document.createElement("h3");
      title.textContent = `${item.name} — ${money.format(item.price * quantity)}`;
      const quantityText = document.createElement("p");
      quantityText.textContent = `Cantidad: ${quantity}`;
      const decrease = document.createElement("button");
      decrease.type = "button";
      decrease.textContent = "−";
      decrease.setAttribute("aria-label", `Quitar una unidad de ${item.name}`);
      decrease.addEventListener("click", () => changeQuantity(id, -1));
      const increase = document.createElement("button");
      increase.type = "button";
      increase.textContent = "+";
      increase.setAttribute("aria-label", `Agregar una unidad de ${item.name}`);
      increase.addEventListener("click", () => changeQuantity(id, 1));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Eliminar";
      remove.addEventListener("click", () => { cart.delete(id); renderCart(); });
      row.append(title, quantityText, decrease, increase, remove);
      cartItems.append(row);
    });
    if (!count) {
      const empty = document.createElement("p");
      empty.textContent = "Tu carrito está vacío.";
      cartItems.append(empty);
    }
    document.querySelector("#cart-count").textContent = count;
    document.querySelector("#cart-total").textContent = money.format(total);
  }

  function addToCart(id) {
    cart.set(id, (cart.get(id) || 0) + 1);
    renderCart();
  }

  function changeQuantity(id, amount) {
    const next = (cart.get(id) || 0) + amount;
    if (next <= 0) cart.delete(id);
    else cart.set(id, next);
    renderCart();
  }

  document.querySelector("#search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    searchTerm = searchInput.value.trim().toLocaleLowerCase("es");
    renderCatalog();
  });
  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value.trim().toLocaleLowerCase("es");
    renderCatalog();
  });
  document.querySelector("#clear-search").addEventListener("click", () => {
    searchInput.value = "";
    searchTerm = "";
    renderCatalog();
    searchInput.focus();
  });
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.filter;
      document.querySelectorAll(".filter-button").forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
      renderCatalog();
    });
  });

  const toggleCart = (open) => {
    cartPanel.hidden = !open;
    document.querySelector("#cart-toggle").setAttribute("aria-expanded", String(open));
  };
  document.querySelector("#cart-toggle").addEventListener("click", () => toggleCart(cartPanel.hidden));
  document.querySelector("#close-cart").addEventListener("click", () => toggleCart(false));
  document.querySelector("#empty-cart").addEventListener("click", () => { cart.clear(); renderCart(); });
  document.querySelector("#checkout-button").addEventListener("click", () => {
    if (!cart.size) {
      window.alert("Agrega algún producto o servicio antes de finalizar el pedido.");
      return;
    }
    const summary = [...cart].map(([id, quantity]) => {
      const item = catalog.find((product) => product.id === id);
      return `${quantity} × ${item.name}`;
    }).join("\n");
    window.alert(`¡Gracias por elegir PetLove!\n\nPedido:\n${summary}\n\nTotal: ${document.querySelector("#cart-total").textContent}\n\nEste sitio es una demostración: contáctanos para coordinar el pago y la entrega.`);
  });

  document.querySelector("#year").textContent = new Date().getFullYear();
  renderCatalog();
  renderCart();
})();
