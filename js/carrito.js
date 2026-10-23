document.addEventListener("DOMContentLoaded", () => {
  const body = document.querySelector("[data-items]"); if (!body) return;
  const { keys, read, write, products, money, escape, updateCartCount, accountKey, currentUser } = PetLove;
  const cartKey = accountKey(keys.cart);
  const empty = document.querySelector("[data-empty]"), layout = document.querySelector("[data-cart-layout]");
  function draw() {
    const items = read(cartKey, []).filter(item => products.some(product => product.id === item.id));
    if (!items.length) { empty?.classList.remove("hidden"); layout?.classList.add("hidden"); body.innerHTML = ""; return; }
    empty?.classList.add("hidden"); layout?.classList.remove("hidden");
    body.innerHTML = items.map(item => { const product = products.find(p => p.id === item.id); return `<tr><td><a href="detalle-producto.html?id=${encodeURIComponent(product.id)}">${escape(product.name)}</a></td><td>${money(product.price)}</td><td><div class="qty"><button type="button" data-qty="${product.id}" data-delta="-1">−</button><span>${item.quantity}</span><button type="button" data-qty="${product.id}" data-delta="1">+</button></div></td><td>${money(product.price * item.quantity)}</td><td><button type="button" class="btn outline" data-remove="${product.id}">Quitar</button></td></tr>`; }).join("");
    const subtotal = items.reduce((sum, item) => sum + products.find(p => p.id === item.id).price * item.quantity, 0), shipping = subtotal >= 100000 ? 0 : 8000;
    document.querySelector("[data-subtotal]").textContent = money(subtotal); document.querySelector("[data-shipping]").textContent = shipping ? money(shipping) : "Gratis"; document.querySelector("[data-total]").textContent = money(subtotal + shipping);
  }
  body.addEventListener("click", event => {
    const qty = event.target.closest("[data-qty]"), remove = event.target.closest("[data-remove]"); if (!qty && !remove) return;
    let items = read(cartKey, []);
    if (qty) { const item = items.find(entry => entry.id === qty.dataset.qty); if (item) item.quantity = Math.max(1, Math.min(99, item.quantity + Number(qty.dataset.delta))); }
    if (remove) items = items.filter(item => item.id !== remove.dataset.remove);
    write(cartKey, items); updateCartCount(); draw();
  });
  document.querySelector("[data-checkout]")?.addEventListener("submit", event => {
    event.preventDefault(); const items = read(cartKey, []); if (!items.length) return;
    const profile = read(keys.profile, {}), subtotal = items.reduce((sum, item) => sum + products.find(p => p.id === item.id).price * item.quantity, 0), total = subtotal + (subtotal >= 100000 ? 0 : 8000);
    const user = currentUser(), orders = read(keys.orders, []), order = { id: `PL-${Date.now().toString().slice(-8)}`, date: new Date().toISOString(), total, status: "Recibido", customerEmail: user?.email || "Invitado", customerName: profile.name || "Invitado", items };
    orders.unshift(order); write(keys.orders, orders); write(cartKey, []); updateCartCount();
    alert(`¡Gracias${profile.name ? `, ${profile.name.split(" ")[0]}` : ""}! Pedido ${order.id} registrado por ${money(total)}.`); location.href = "mis-pedidos.html";
  });
  draw();
});
