document.addEventListener("DOMContentLoaded", () => {
  const { products, money, escape, addToCart, currentUser } = PetLove;
  const grids = [...document.querySelectorAll("[data-products]")]; if (!grids.length) return;
  const params = new URLSearchParams(location.search), search = document.querySelector("[data-search]");
  let category = params.get("categoria") || "Todos";
  const isHome = document.body.classList.contains("home-page");
  const favoriteIds = ["hill-nutrition", "cama-perro", "juguetes-gato", "arnes-perro"];
  const employee = currentUser()?.role === "empleado";
  const actionsHtml = product => {
    const detail = `detalle-producto.html?id=${encodeURIComponent(product.id)}`;
    return employee
      ? `<div class="actions" style="display:flex;justify-content:center"><a class="btn outline" href="${detail}" style="flex:0 0 auto;min-width:50%;text-align:center">Ver detalle</a></div>`
      : `<div class="actions"><a class="btn outline" href="${detail}">Ver detalle</a><button class="btn" type="button" data-add="${product.id}">Agregar</button></div>`;
  };
  const draw = () => {
    const term = (search?.value || "").trim().toLocaleLowerCase("es");
    const visible = isHome ? favoriteIds.map(id => products.find(product => product.id === id)).filter(Boolean) : products.filter(product => (category === "Todos" || product.category.toLowerCase() === category.toLowerCase()) && `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase("es").includes(term));
    grids.forEach(grid => grid.innerHTML = visible.length ? visible.map(product => `<article class="card"><a href="detalle-producto.html?id=${encodeURIComponent(product.id)}"><img src="${escape(product.image)}" alt="${escape(product.name)}" loading="lazy" onerror="this.src='img/promo.jpg'"></a><span class="badge">${escape(product.category)}</span><h3><a href="detalle-producto.html?id=${encodeURIComponent(product.id)}">${escape(product.name)}</a></h3><p>${money(product.price)}</p>${actionsHtml(product)}</article>`).join("") : `<p class="muted">No encontramos productos con esos criterios.</p>`);
  };
  const bindFilter = button => {
    button.classList.toggle("active", button.dataset.filter.toLowerCase() === category.toLowerCase());
    button.addEventListener("click", () => { category = button.dataset.filter; document.querySelectorAll("[data-filter]").forEach(item => item.classList.toggle("active", item === button)); const select = document.querySelector("[data-category]"); if (select) select.value = category; draw(); });
  };
  document.querySelectorAll("[data-filter]").forEach(bindFilter);
  const select = document.querySelector("[data-category]");
  if (select && [...select.options].some(option => option.value.toLowerCase() === category.toLowerCase())) select.value = category;
  select?.addEventListener("change", () => { category = select.value; draw(); });
  search?.addEventListener("input", draw);
  document.addEventListener("click", event => { const button = event.target.closest("[data-add]"); if (button) addToCart(button.dataset.add); });
  draw();

  // Los productos y las categorías nuevas vienen de Neon. Cuando terminan de cargar,
  // se vuelve a dibujar el catálogo y se agregan los botones de las categorías que falten.
  PetLove.cargarProductosDesdeBD().then(() => draw());
  if (!isHome) {
    PetLove.api("/api/categorias").then(lista => {
      const bar = document.querySelector(".filters");
      if (!bar || !Array.isArray(lista)) return;
      const existentes = [...document.querySelectorAll("[data-filter]")].map(b => b.dataset.filter.toLowerCase());
      lista.forEach(cat => {
        const nombre = String(cat.nombre || "").trim();
        if (!nombre || existentes.includes(nombre.toLowerCase())) return;
        existentes.push(nombre.toLowerCase());
        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter";
        button.dataset.filter = nombre;
        button.textContent = nombre;
        bar.append(button);
        bindFilter(button);
        const sel = document.querySelector("[data-category]");
        if (sel) sel.append(new Option(nombre, nombre));
      });
    }).catch(() => { /* si falla, quedan las categorías fijas */ });
  }
});