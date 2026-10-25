document.addEventListener("DOMContentLoaded", () => {
  const body = document.querySelector("[data-items]");
  if (!body) return;

  const { products, money, escape, updateCartCount, cartKey, currentUser, isLoggedIn, toast } = PetLove;
  const empty = document.querySelector("[data-empty]");
  const layout = document.querySelector("[data-cart-layout]");
  const checkoutButton = document.querySelector("[data-checkout-button]");
  const loginRequired = document.querySelector("[data-login-required]");

  function leerCarrito() {
    return PetLove.read(cartKey(), []).filter(item => products.some(p => p.id === item.id));
  }
  function guardarCarrito(items) {
    PetLove.write(cartKey(), items);
  }

  function draw() {
    const loggedIn = isLoggedIn();
    if (checkoutButton) checkoutButton.disabled = !loggedIn;
    loginRequired?.classList.toggle("hidden", loggedIn);

    const items = leerCarrito();
    if (!items.length) {
      empty?.classList.remove("hidden");
      layout?.classList.add("hidden");
      body.innerHTML = "";
      return;
    }
    empty?.classList.add("hidden");
    layout?.classList.remove("hidden");
    body.innerHTML = items.map(item => {
      const p = products.find(x => x.id === item.id);
      return `<tr>
        <td><a href="detalle-producto.html?id=${encodeURIComponent(p.id)}">${escape(p.name)}</a></td>
        <td>${money(p.price)}</td>
        <td><div class="qty">
          <button type="button" data-qty="${p.id}" data-delta="-1">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-qty="${p.id}" data-delta="1">+</button>
        </div></td>
        <td>${money(p.price * item.quantity)}</td>
        <td><button type="button" class="btn outline" data-remove="${p.id}">Quitar</button></td>
      </tr>`;
    }).join("");

    const subtotal = items.reduce((s, it) => s + products.find(p => p.id === it.id).price * it.quantity, 0);
    const shipping = subtotal >= 100000 ? 0 : 8000;
    document.querySelector("[data-subtotal]").textContent = money(subtotal);
    document.querySelector("[data-shipping]").textContent = shipping ? money(shipping) : "Gratis";
    document.querySelector("[data-total]").textContent = money(subtotal + shipping);
  }

  body.addEventListener("click", event => {
    const qty = event.target.closest("[data-qty]");
    const remove = event.target.closest("[data-remove]");
    if (!qty && !remove) return;
    let items = leerCarrito();
    if (qty) {
      const item = items.find(e => e.id === qty.dataset.qty);
      if (item) item.quantity = Math.max(1, Math.min(99, item.quantity + Number(qty.dataset.delta)));
    }
    if (remove) items = items.filter(e => e.id !== remove.dataset.remove);
    guardarCarrito(items);
    updateCartCount();
    draw();
  });

  // ---------- Checkout REAL contra Neon ----------
  document.querySelector("[data-checkout]")?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!isLoggedIn()) { toast("Inicia sesión para finalizar tu compra."); return; }

    const items = leerCarrito();
    if (!items.length) return;

    // Verificar que TODOS tengan el ID de la base de datos
    const erroresSincronizacion = [];
    items.forEach(it => {
      const p = products.find(x => x.id === it.id);
      if (!p || !p.idProductosBD) {
        erroresSincronizacion.push(p ? p.name : "Producto desconocido");
      }
    });

    if (erroresSincronizacion.length) {
      toast(`Error: El producto "${erroresSincronizacion[0]}" no está en la base de datos de Neon o los nombres no coinciden.`);
      return;
    }

    const payload = {
      items: items.map(it => {
        const p = products.find(x => x.id === it.id);
        return { id_productos: p.idProductosBD, cantidad: it.quantity };
      })
    };

    const btn = event.submitter || document.querySelector('[data-checkout] button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      const pedido = await PetLove.api("/api/pedidos", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      guardarCarrito([]);
      updateCartCount();
      const user = currentUser();
      alert(`¡Gracias${user?.nombre ? `, ${user.nombre.split(" ")[0]}` : ""}! Pedido #${pedido.id_pedidos} registrado por ${money(pedido.total)}.`);
      location.href = "mis-pedidos.html";
    } catch (error) {
      toast(error.message);
      alert(error.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Los productos nuevos (creados desde el panel de administrador) vienen de Neon y tardan
  // un instante en cargar. Si se dibuja el carrito antes, esos productos no se encuentran
  // y el carrito aparece vacío. Por eso se espera a que termine la carga.
  empty?.classList.add("hidden");
  PetLove.cargarProductosDesdeBD().then(draw);
});