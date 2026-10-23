document.addEventListener("DOMContentLoaded", () => {
  const { products, money, escape, addToCart } = PetLove;
  const grids = [...document.querySelectorAll("[data-products]")]; if (!grids.length) return;
  const params = new URLSearchParams(location.search), search = document.querySelector("[data-search]");
  let category = params.get("categoria") || "Todos";
  const draw = () => {
    const term = (search?.value || "").trim().toLocaleLowerCase("es");
    const visible = products.filter(product => (category === "Todos" || product.category.toLowerCase() === category.toLowerCase()) && `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase("es").includes(term));
    grids.forEach(grid => grid.innerHTML = visible.length ? visible.map(product => `<article class="card"><a href="detalle-producto.html?id=${encodeURIComponent(product.id)}"><img src="${escape(product.image)}" alt="${escape(product.name)}" loading="lazy" onerror="this.src='img/promo.jpg'"></a><span class="badge">${escape(product.category)}</span><h3><a href="detalle-producto.html?id=${encodeURIComponent(product.id)}">${escape(product.name)}</a></h3><p>${money(product.price)}</p><div class="actions"><a class="btn outline" href="detalle-producto.html?id=${encodeURIComponent(product.id)}">Ver detalle</a><button class="btn" type="button" data-add="${product.id}">Agregar</button></div></article>`).join("") : `<p class="muted">No encontramos productos con esos criterios.</p>`);
  };
  document.querySelectorAll("[data-filter]").forEach(button => {
    button.classList.toggle("active", button.dataset.filter.toLowerCase() === category.toLowerCase());
    button.addEventListener("click", () => { category = button.dataset.filter; document.querySelectorAll("[data-filter]").forEach(item => item.classList.toggle("active", item === button)); const select = document.querySelector("[data-category]"); if (select) select.value = category; draw(); });
  });
  const select = document.querySelector("[data-category]");
  if (select && [...select.options].some(option => option.value.toLowerCase() === category.toLowerCase())) select.value = category;
  select?.addEventListener("change", () => { category = select.value; draw(); });
  search?.addEventListener("input", draw);
  document.addEventListener("click", event => { const button = event.target.closest("[data-add]"); if (button) addToCart(button.dataset.add); });
  draw();
});
