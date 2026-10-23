document.addEventListener("DOMContentLoaded", () => {
  const detail = document.querySelector("[data-detail]"); if (!detail) return;
  const { products, money, escape, addToCart } = PetLove;
  const params = new URLSearchParams(location.search), product = products.find(item => item.id === params.get("id")) || products[0];
  detail.innerHTML = `<img src="${escape(product.image)}" alt="${escape(product.name)}" onerror="this.src='img/promo.jpg'"><div><span class="badge">${escape(product.category)}</span><h1>${escape(product.name)}</h1><p>${escape(product.description)}</p><h2>${money(product.price)}</h2><label for="detail-quantity">Cantidad</label><input id="detail-quantity" type="number" min="1" max="99" step="1" value="1" required style="display:block;width:90px;padding:10px;margin:8px 0 16px"><button class="btn" type="button" data-add-detail>Agregar al carrito</button><p style="margin-top:15px"><a href="catalogo.html">← Volver al catálogo</a></p></div>`;
  const quantityInput = detail.querySelector("#detail-quantity");
  detail.querySelector("[data-add-detail]").addEventListener("click", () => {
    if (!quantityInput.reportValidity()) return;
    addToCart(product.id, quantityInput.valueAsNumber);
  });
  const grid = document.querySelector("[data-products]");
  if (grid) { grid.innerHTML = products.filter(item => item.id !== product.id).slice(0, 4).map(item => `<article class="card"><a href="detalle-producto.html?id=${encodeURIComponent(item.id)}"><img src="${escape(item.image)}" alt="${escape(item.name)}" loading="lazy"></a><h3>${escape(item.name)}</h3><p>${money(item.price)}</p><button class="btn" type="button" data-related="${item.id}">Agregar</button></article>`).join(""); grid.addEventListener("click", event => { const button = event.target.closest("[data-related]"); if (button) addToCart(button.dataset.related); }); }
});
