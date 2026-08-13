// ==========================================
// 1. ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================
let currentUser = null; // Guardará el usuario actual
let currentPin = "";
let cart = [];
let isEditMode = false;

// TASA DE CAMBIO SIMULADA (Para dólares)
const EXCHANGE_RATE_USD = 20.00;

// DATOS SIMULADOS (Esto vendrá desde Firebase Realtime Database)
const mockDatabase = {
  categories: [
    { id: "cat1", name: "Sushis", icon: "🍣" },
    { id: "cat2", name: "Entradas", icon: "🍢" },
    { id: "cat3", name: "Bebidas", icon: "🥤" },
    { id: "cat4", name: "Promos", icon: "🔥" }
  ],
  products: [
    { id: "p1", name: "Sushi Roll Especial", price: 230, category: "cat1", img: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300" },
    { id: "p2", name: "Banderillas (2x)", price: 40, category: "cat2", img: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=300" },
    { id: "p3", name: "Té Helado 600ml", price: 35, category: "cat3", img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300" },
    { id: "p4", name: "Combo Ramen + Roll", price: 290, category: "cat4", img: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300" }
  ],
  users: {
    "1234": { name: "Cajera: Wendy", role: "caja" },
    "9999": { name: "Gerente: Carlos", role: "admin" }
  }
};

// ==========================================
// 2. LÓGICA DE TECLADO Y LOGIN POR PIN
// ==========================================
function appendPin(number) {
  if (currentPin.length < 4) {
    currentPin += number;
    updatePinDisplay();
  }
}

function clearPin() {
  currentPin = "";
  updatePinDisplay();
}

function updatePinDisplay() {
  const display = document.getElementById("pin-display");
  display.textContent = "*".repeat(currentPin.length) || "****";
}

function submitPin() {
  const user = mockDatabase.users[currentPin];
  
  if (user) {
    currentUser = user;
    alert(`¡Bienvenido/a ${currentUser.name}!`);
    clearPin();
    initPOS();
  } else {
    alert("❌ PIN Incorrecto. Prueba con 1234 (Caja) o 9999 (Gerente)");
    clearPin();
  }
}

// ==========================================
// 3. INICIALIZACIÓN DE LA PANTALLA POS
// ==========================================
function initPOS() {
  // Cambiar de pantalla
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("pos-screen").classList.remove("hidden");

  // Configurar Header con Datos del Usuario
  document.getElementById("current-user-name").textContent = currentUser.name;
  document.getElementById("current-role-badge").textContent = currentUser.role.toUpperCase();

  // MOSTRAR/OCULTAR HERRAMIENTAS DE GERENTE
  const adminElements = document.querySelectorAll(".admin-only");
  if (currentUser.role === "admin") {
    adminElements.forEach(el => el.classList.remove("hidden"));
  } else {
    adminElements.forEach(el => el.classList.add("hidden"));
  }

  // Cargar Categorías y Menú
  renderCategories();
  renderProducts("all");
}

function logout() {
  currentUser = null;
  cart = [];
  updateCartUI();
  document.getElementById("pos-screen").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
}

// ==========================================
// 4. RENDERIZADO DINÁMICO DEL MENÚ (JSON)
// ==========================================
function renderCategories() {
  const container = document.getElementById("categories-bar");
  container.innerHTML = `
    <button class="cat-card active" onclick="filterCategory('all', this)">
      <span>✨</span> Todos
    </button>
  `;

  mockDatabase.categories.forEach(cat => {
    container.innerHTML += `
      <button class="cat-card" onclick="filterCategory('${cat.id}', this)">
        <span>${cat.icon}</span> ${cat.name}
      </button>
    `;
  });
}

function filterCategory(catId, btnElement) {
  // Cambiar estado activo del botón
  document.querySelectorAll(".cat-card").forEach(btn => btn.classList.remove("active"));
  if(btnElement) btnElement.classList.add("active");

  renderProducts(catId);
}

function renderProducts(categoryId) {
  const grid = document.getElementById("products-grid");
  grid.innerHTML = "";

  const filtered = categoryId === "all" 
    ? mockDatabase.products 
    : mockDatabase.products.filter(p => p.category === categoryId);

  filtered.forEach(prod => {
    const jiggleClass = isEditMode ? "jiggle" : "";
    grid.innerHTML += `
      <div class="product-card ${jiggleClass}" onclick="handleProductClick('${prod.id}')">
        <img src="${prod.img}" alt="${prod.name}">
        <h4>${prod.name}</h4>
        <div class="price">$${prod.price}.00</div>
      </div>
    `;
  });
}

// ==========================================
// 5. ACCIÓN DEL LÁPIZ GERENTE (MODO JIGGLE / IPHONE)
// ==========================================
function toggleEditMode() {
  if (currentUser.role !== "admin") return;
  
  isEditMode = !isEditMode;
  const editBtn = document.getElementById("admin-edit-btn");
  
  if (isEditMode) {
    editBtn.style.background = "var(--accent-orange)";
    alert("✏️ Modo Edición Activado: Toca un producto para modificar datos.");
  } else {
    editBtn.style.background = "var(--panel-bg)";
  }

  // Refrescar tarjetas con/sin la animación jiggle
  renderProducts("all");
}

function handleProductClick(productId) {
  const product = mockDatabase.products.find(p => p.id === productId);

  if (isEditMode) {
    // Si el gerente tiene activo el lápiz, edita el producto
    const newPrice = prompt(`Editar precio para ${product.name}:`, product.price);
    if (newPrice !== null && !isNaN(newPrice)) {
      product.price = parseFloat(newPrice);
      renderProducts("all");
      alert("✅ Precio actualizado en el sistema.");
    }
  } else {
    // Modo Venta Normal: Agregar al carrito
    addToCart(product);
  }
}

// ==========================================
// 6. CARRITO Y COMANDA
// ==========================================
function addToCart(product) {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  updateCartUI();
}

function updateCartUI() {
  const list = document.getElementById("cart-items");
  if (cart.length === 0) {
    list.innerHTML = `<p class="empty-cart-msg">Selecciona un producto del menú...</p>`;
    document.getElementById("total-price").textContent = "$0.00 MXN";
    document.getElementById("total-usd").textContent = "$0.00 USD";
    return;
  }

  list.innerHTML = "";
  let total = 0;

  cart.forEach((item, index) => {
    const subtotal = item.price * item.qty;
    total += subtotal;

    list.innerHTML += `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px; align-items:center;">
        <div>
          <strong>${item.name}</strong> <small>(x${item.qty})</small><br>
          <small style="color:var(--text-muted);">$${item.price} c/u</small>
        </div>
        <div>
          <strong>$${subtotal}</strong>
          <button onclick="removeFromCart(${index})" style="background:none; border:none; color:red; cursor:pointer; margin-left:8px;">🗑️</button>
        </div>
      </div>
    `;
  });

  const totalUSD = (total / EXCHANGE_RATE_USD).toFixed(2);
  document.getElementById("total-price").textContent = `$${total}.00 MXN`;
  document.getElementById("total-usd").textContent = `$${totalUSD} USD`;
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

// ==========================================
// 7. TIPOS DE PEDIDO Y MODALES
// ==========================================
function setOrderType(type) {
  document.querySelectorAll(".type-btn").forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");

  const cancelBtn = document.getElementById("cancel-order-btn");
  if (type === "domicilio") {
    cancelBtn.classList.remove("hidden");
  } else {
    cancelBtn.classList.add("hidden");
  }
}

function togglePlusMenu() {
  document.getElementById("plus-menu-modal").classList.remove("hidden");
}

function closePlusMenu() {
  document.getElementById("plus-menu-modal").classList.add("hidden");
}

function toggleDarkMode() {
  alert("🌓 Cambiando tema de pantalla...");
}
