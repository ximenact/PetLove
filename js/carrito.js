document.addEventListener("DOMContentLoaded", () => {
  const body = document.querySelector("[data-items]");
  if (!body) return;

  const {
    products,
    money,
    escape,
    updateCartCount,
    cartKey,
    currentUser,
    isLoggedIn,
    toast
  } = PetLove;

  const empty = document.querySelector("[data-empty]");
  const layout = document.querySelector("[data-cart-layout]");
  const checkoutForm = document.querySelector("[data-checkout]");
  const loginRequired = document.querySelector("[data-login-required]");

  // Elementos del lightbox
  const modal = document.querySelector("[data-checkout-modal]");
  const modalItems = document.querySelector("[data-checkout-items]");
  const modalSubtotal = document.querySelector("[data-modal-subtotal]");
  const modalShipping = document.querySelector("[data-modal-shipping]");
  const modalTotal = document.querySelector("[data-modal-total]");
  const confirmButton = document.querySelector("[data-confirm-checkout]");
  const closeButtons = document.querySelectorAll("[data-close-checkout]");

  if (!modal || !modalItems || !confirmButton) {
    console.error("No se encontró el HTML del lightbox de compra.");
    return;
  }

  let pedidoEnProceso = false;

  // Se puede armar el carrito sin sesión, pero para comprar hay que iniciarla.
  // Después de iniciar sesión se regresa al carrito con los mismos productos.
  function pedirInicioDeSesion() {
    toast("Inicia sesión para finalizar tu compra. Tus productos seguirán en el carrito.");
    setTimeout(() => { location.href = "login.html?volver=carrito.html"; }, 1500);
  }

  function leerCarrito() {
    return PetLove.read(cartKey(), [])
      .filter(item => products.some(p => p.id === item.id));
  }

  function guardarCarrito(items) {
    PetLove.write(cartKey(), items);
  }

  // Calcular los mismos valores en el carrito y en el lightbox.
  function calcularTotales(items) {
    const subtotal = items.reduce((s, item) => {
      const producto = products.find(p => p.id === item.id);
      return s + (producto ? producto.price * item.quantity : 0);
    }, 0);

    const shipping = subtotal >= 100000 ? 0 : 8000;

    return {
      subtotal,
      shipping,
      total: subtotal + shipping
    };
  }

  function actualizarResumen(items) {
    const { subtotal, shipping, total } = calcularTotales(items);

    document.querySelector("[data-subtotal]").textContent =
      money(subtotal);

    document.querySelector("[data-shipping]").textContent =
      shipping ? money(shipping) : "Gratis";

    document.querySelector("[data-total]").textContent =
      money(total);

    return { subtotal, shipping, total };
  }

  // Mostrar los productos reales en la ventana emergente.
  function dibujarDetalleCompra(items) {
    modalItems.innerHTML = items.map(item => {
      const producto = products.find(p => p.id === item.id);

      if (!producto) return "";

      const subtotalProducto = producto.price * item.quantity;

      return `
        <div class="checkout-product">
          <div class="checkout-product-info">
            <span class="checkout-product-name">
              ${escape(producto.name)}
            </span>

            <span class="checkout-product-detail">
              ${item.quantity} x ${money(producto.price)}
            </span>
          </div>

          <span class="checkout-product-price">
            ${money(subtotalProducto)}
          </span>
        </div>
      `;
    }).join("");

    const { subtotal, shipping, total } = calcularTotales(items);

    modalSubtotal.textContent = money(subtotal);
    modalShipping.textContent = shipping ? money(shipping) : "Gratis";
    modalTotal.textContent = money(total);
  }

  function abrirLightbox() {
    if (pedidoEnProceso) return;

    const items = leerCarrito();

    if (!items.length) {
      cerrarLightbox();
      draw();
      toast("Tu carrito está vacío.");
      return;
    }

    if (!isLoggedIn()) {
      pedirInicioDeSesion();
      return;
    }

    dibujarDetalleCompra(items);

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    confirmButton.focus();
  }

  function cerrarLightbox() {
    if (pedidoEnProceso) return;

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function draw() {
    // Aviso para visitantes: pueden armar el carrito, pero deben iniciar sesión para comprar
    loginRequired?.classList.toggle("hidden", isLoggedIn());

    const items = leerCarrito();

    if (!items.length) {
      empty?.classList.remove("hidden");
      layout?.classList.add("hidden");
      body.innerHTML = "";

      actualizarResumen([]);

      if (!modal.classList.contains("hidden")) {
        cerrarLightbox();
      }

      return;
    }

    empty?.classList.add("hidden");
    layout?.classList.remove("hidden");

    body.innerHTML = items.map(item => {
      const p = products.find(x => x.id === item.id);

      return `
        <tr>
          <td>
            <a href="detalle-producto.html?id=${encodeURIComponent(p.id)}">
              ${escape(p.name)}
            </a>
          </td>

          <td>${money(p.price)}</td>

          <td>
            <div class="qty">
              <button
                type="button"
                data-qty="${escape(p.id)}"
                data-delta="-1"
                aria-label="Disminuir cantidad">
                −
              </button>

              <span>${item.quantity}</span>

              <button
                type="button"
                data-qty="${escape(p.id)}"
                data-delta="1"
                aria-label="Aumentar cantidad">
                +
              </button>
            </div>
          </td>

          <td>${money(p.price * item.quantity)}</td>

          <td>
            <button
              type="button"
              class="btn outline"
              data-remove="${escape(p.id)}">
              Quitar
            </button>
          </td>
        </tr>
      `;
    }).join("");

    actualizarResumen(items);
  }

  // Cambiar cantidades o quitar productos.
  body.addEventListener("click", event => {
    const qty = event.target.closest("[data-qty]");
    const remove = event.target.closest("[data-remove]");

    if (!qty && !remove) return;

    if (pedidoEnProceso) return;

    let items = leerCarrito();

    if (qty) {
      const item = items.find(e => e.id === qty.dataset.qty);

      if (item) {
        item.quantity = Math.max(
          1,
          Math.min(99, item.quantity + Number(qty.dataset.delta))
        );
      }
    }

    if (remove) {
      items = items.filter(e => e.id !== remove.dataset.remove);
    }

    guardarCarrito(items);
    updateCartCount();
    draw();
  });

  // Finalizar compra ahora abre el lightbox.
  checkoutForm?.addEventListener("submit", event => {
    event.preventDefault();
    abrirLightbox();
  });

  // Cerrar con la X, el fondo o "Volver al carrito".
  closeButtons.forEach(button => {
    button.addEventListener("click", cerrarLightbox);
  });

  // Cerrar con Escape.
  document.addEventListener("keydown", event => {
    if (
      event.key === "Escape" &&
      !modal.classList.contains("hidden")
    ) {
      cerrarLightbox();
    }
  });

  // Confirmar el pedido y registrarlo realmente en Neon.
  confirmButton.addEventListener("click", async () => {
    if (pedidoEnProceso) return;

    if (!isLoggedIn()) {
      cerrarLightbox();
      pedirInicioDeSesion();
      return;
    }

    const items = leerCarrito();

    if (!items.length) {
      cerrarLightbox();
      draw();
      toast("Tu carrito está vacío.");
      return;
    }

    // Comprobar que todos los productos estén sincronizados con Neon.
    const erroresSincronizacion = [];

    items.forEach(item => {
      const producto = products.find(p => p.id === item.id);

      if (!producto || !producto.idProductosBD) {
        erroresSincronizacion.push(
          producto ? producto.name : "Producto desconocido"
        );
      }
    });

    if (erroresSincronizacion.length) {
      toast(
        `El producto "${erroresSincronizacion[0]}" no está sincronizado con la base de datos.`
      );
      return;
    }

    const payload = {
      items: items.map(item => {
        const producto = products.find(p => p.id === item.id);

        return {
          id_productos: producto.idProductosBD,
          cantidad: item.quantity
        };
      })
    };

    pedidoEnProceso = true;
    confirmButton.disabled = true;
    confirmButton.textContent = "Registrando pedido...";

    closeButtons.forEach(button => {
      button.disabled = true;
    });

    try {
      const pedido = await PetLove.api("/api/pedidos", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      // Vaciar el carrito únicamente si el servidor confirma el pedido.
    
      guardarCarrito([]);
      updateCartCount();

      // Cerrar el lightbox y redirigir sin mostrar alertas.
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";

      location.href = "mis-pedidos.html";


    } catch (error) {
      toast(error.message || "No se pudo registrar el pedido.");

    } finally {
      pedidoEnProceso = false;
      confirmButton.disabled = false;
      confirmButton.textContent = "Confirmar pedido";

      closeButtons.forEach(button => {
        button.disabled = false;
      });
    }
  });

  // Esperar a que los productos de Neon estén cargados.
  empty?.classList.add("hidden");

  PetLove.cargarProductosDesdeBD()
    .then(draw)
    .catch(error => {
      console.error("Error al cargar los productos:", error);
      draw();
    });
});