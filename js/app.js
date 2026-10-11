// ========================================================
// Sifat Market - Asosiy JavaScript Mantig'i (App Logic)
// ========================================================

// 1. STATE & STORAGE INIZIALIZATSIYASI
let state = {
  banners: JSON.parse(localStorage.getItem('sifat_banners')) || [...DEFAULT_BANNERS],
  products: JSON.parse(localStorage.getItem('sifat_products')) || [...DEFAULT_PRODUCTS],
  cart: JSON.parse(localStorage.getItem('sifat_cart')) || [],
  orders: JSON.parse(localStorage.getItem('sifat_orders')) || [
    {
      id: "ORD-9421",
      customerName: "Ismoiljon",
      customerPhone: "+998 90 123 45 67",
      items: [
        { id: 1, name: "Toshkent Shirin Olmasi (1 kg)", price: 16000, count: 2, image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80" },
        { id: 4, name: "Tandir Issiq Noni (1 dona)", price: 5000, count: 3, image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80" }
      ],
      total: 47000,
      location: { lat: 41.311081, lng: 69.240562 },
      status: "in_delivery", // in_delivery, completed, canceled
      date: new Date().toLocaleDateString()
    }
  ],
  messages: JSON.parse(localStorage.getItem('sifat_messages')) || [
    {
      id: 1,
      customerName: "Ismoiljon",
      customerPhone: "+998 90 123 45 67",
      text: "Assalomu alaykum! Yetkazib berish qancha vaqt oladi?",
      fromAdmin: false,
      timestamp: "14:20",
      read: false
    },
    {
      id: 2,
      customerName: "Ismoiljon",
      customerPhone: "+998 90 123 45 67",
      text: "Va alaykum assalom! Sifat Market kuryerlari 30-40 daqiqa ichida yetkazib berishadi.",
      fromAdmin: true,
      timestamp: "14:22",
      read: true
    }
  ],
  currentUser: JSON.parse(localStorage.getItem('sifat_user')) || {
    name: "Ismoiljon",
    phone: "+998 90 123 45 67",
    isLoggedIn: false
  },
  isAdmin: JSON.parse(localStorage.getItem('sifat_is_admin')) || false,
  currentLang: localStorage.getItem('sifat_lang') || 'uz',
  
  // Koordinatalar
  userOrderCoords: [41.311081, 69.240562], // Standart Toshkent
  courierCoords: [41.311400, 69.240800],   // Kuryer nuqtasi (yaqin joyda)
  
  // Carousel holati
  currentSlideIndex: 0,
  carouselTimer: null,
  
  // Faol ko'rinish
  currentView: 'viewHome',
  currentAdminView: 'viewAdminHome',
  
  // Chatda tanlangan mijoz telefoni
  activeAdminChatPhone: "+998 90 123 45 67",
  
  // Temporary yangi mahsulot rasmi (Base64 yoki URL)
  newProductImageTemp: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"
};

// Leaflet Xaritalari obyektlari
let userOrderMap = null;
let userOrderMarker = null;
let routeMap = null;
let routePolyline = null;
let courierMarker = null;
let targetMarker = null;
let activeOrderForRoute = null;

// ========================================================
// 2. TILLARNI BOSHQARISH (MULTILINGUAL SYSTEM)
// ========================================================
function t(key) {
  const langData = TRANSLATIONS[state.currentLang] || TRANSLATIONS['uz'];
  return langData[key] || key;
}

function applyLanguage(lang) {
  if (!TRANSLATIONS[lang]) lang = 'uz';
  state.currentLang = lang;
  localStorage.setItem('sifat_lang', lang);

  // Barcha data-i18n elementlarini yangilash
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key && TRANSLATIONS[lang][key]) {
      el.textContent = TRANSLATIONS[lang][key];
    }
  });

  // Barcha data-i18n-attr (placeholder va hk) elementlarini yangilash
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const attrRule = el.getAttribute('data-i18n-attr');
    const [attrName, key] = attrRule.split(':');
    if (attrName && key && TRANSLATIONS[lang][key]) {
      el.setAttribute(attrName, TRANSLATIONS[lang][key]);
    }
  });

  // Tugmalarning active holati
  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  renderBanners();
  renderProducts();
  renderSearchResults();
  renderCart();
  renderUserOrders();
  renderAdminOrders();
  updateHeaderAuthState();
}

// ========================================================
// 3. KARUSEL (BANNER SLIDER) MANTIG'I
// ========================================================
function initCarousel() {
  renderBanners();
  startCarouselAutoPlay();

  const prevBtn = document.getElementById('carouselPrevBtn');
  const nextBtn = document.getElementById('carouselNextBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      showPrevSlide();
      restartCarouselTimer();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      showNextSlide();
      restartCarouselTimer();
    });
  }
}

function renderBanners() {
  const slidesBox = document.getElementById('carouselSlidesBox');
  const dotsBox = document.getElementById('carouselDotsBox');
  if (!slidesBox || !dotsBox) return;

  slidesBox.innerHTML = '';
  dotsBox.innerHTML = '';

  const activeBanners = state.banners.filter(b => b && b.image);
  if (activeBanners.length === 0) {
    slidesBox.innerHTML = `
      <div class="carousel-slide active" style="background:#4b5563;display:flex;align-items:center;justify-content:center;color:#fff;">
        <h3>Sifat Market - Katta chegirmalar</h3>
      </div>
    `;
    return;
  }

  activeBanners.forEach((banner, idx) => {
    // Slayd
    const slide = document.createElement('div');
    slide.className = `carousel-slide ${idx === state.currentSlideIndex ? 'active' : ''}`;
    slide.innerHTML = `
      <img src="${banner.image}" alt="${banner.title || 'Sifat Market Banner'}" loading="lazy" />
      <div class="carousel-overlay">
        ${banner.badge ? `<span class="carousel-badge">${banner.badge}</span>` : ''}
        <h2 class="carousel-title">${banner.title || ''}</h2>
        <p class="carousel-subtitle">${banner.subtitle || ''}</p>
      </div>
    `;
    slidesBox.appendChild(slide);

    // Nuqta (Dot)
    const dot = document.createElement('div');
    dot.className = `carousel-dot ${idx === state.currentSlideIndex ? 'active' : ''}`;
    dot.addEventListener('click', () => {
      goToSlide(idx);
      restartCarouselTimer();
    });
    dotsBox.appendChild(dot);
  });
}

function showNextSlide() {
  const activeBanners = state.banners.filter(b => b && b.image);
  if (activeBanners.length <= 1) return;
  state.currentSlideIndex = (state.currentSlideIndex + 1) % activeBanners.length;
  updateSlideClasses();
}

function showPrevSlide() {
  const activeBanners = state.banners.filter(b => b && b.image);
  if (activeBanners.length <= 1) return;
  state.currentSlideIndex = (state.currentSlideIndex - 1 + activeBanners.length) % activeBanners.length;
  updateSlideClasses();
}

function goToSlide(index) {
  state.currentSlideIndex = index;
  updateSlideClasses();
}

function updateSlideClasses() {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.carousel-dot');

  slides.forEach((s, idx) => {
    s.classList.toggle('active', idx === state.currentSlideIndex);
  });

  dots.forEach((d, idx) => {
    d.classList.toggle('active', idx === state.currentSlideIndex);
  });
}

function startCarouselAutoPlay() {
  clearInterval(state.carouselTimer);
  state.carouselTimer = setInterval(() => {
    showNextSlide();
  }, 4000); // Har 4 soniyada aylanadi
}

function restartCarouselTimer() {
  clearInterval(state.carouselTimer);
  startCarouselAutoPlay();
}

// ========================================================
// 4. MAHSULOTLARNI CHIQARISH (RENDER PRODUCTS)
// ========================================================
function renderProducts() {
  const popularGrid = document.getElementById('popularProductGrid');
  const discountGrid = document.getElementById('discountProductGrid');

  if (popularGrid) {
    const populars = state.products.filter(p => p.category === 'popular');
    popularGrid.innerHTML = populars.map(createProductCardHtml).join('');
  }

  if (discountGrid) {
    const discounts = state.products.filter(p => p.category === 'discount');
    discountGrid.innerHTML = discounts.map(createProductCardHtml).join('');
  }
}

function createProductCardHtml(product) {
  const inCartItem = state.cart.find(item => item.id === product.id);
  const isAdded = inCartItem !== undefined;
  const currency = t('currency');

  return `
    <div class="product-card" data-product-id="${product.id}">
      <div class="product-img-box">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        ${product.discount ? `<div class="product-badge-discount">-${product.discount}%</div>` : ''}
        ${product.category === 'popular' && !product.discount ? `<div class="product-badge-popular">Top</div>` : ''}
      </div>

      <div class="product-info">
        <div class="product-name" title="${product.name}">${product.name}</div>
        
        <div class="product-meta">
          <div class="product-rating">
            <i class="fa-solid fa-star"></i>
            <span>${product.rating || '4.9'}</span>
          </div>
          <span>•</span>
          <span>${product.soldCount || 100} ${t('sold')}</span>
        </div>

        <div class="product-prices">
          ${product.oldPrice ? `<div class="product-old-price">${product.oldPrice.toLocaleString()} ${currency}</div>` : ''}
          <div class="product-current-price">${product.price.toLocaleString()} ${currency}</div>
        </div>

        <button 
          type="button" 
          class="btn-add-cart ${isAdded ? 'added' : ''}" 
          onclick="handleAddToCart(${product.id})"
        >
          <i class="fa-solid ${isAdded ? 'fa-check' : 'fa-cart-shopping'}"></i>
          <span>${isAdded ? t('inCart') : t('addToCart')}</span>
        </button>
      </div>
    </div>
  `;
}

// ========================================================
// 5. JONLI QIDIRUV (LIVE SEARCH)
// ========================================================
function initSearch() {
  const searchInput = document.getElementById('globalSearchInput');
  const clearBtn = document.getElementById('searchClearBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

      if (query.length > 0) {
        // Agar boshqa bo'limda bo'lsa, qidiruv sahifasiga o'tkazish
        if (state.currentView !== 'viewSearch') {
          switchView('viewSearch');
        }
      }
      renderSearchResults(query);
    });

    searchInput.addEventListener('focus', () => {
      if (state.currentView !== 'viewSearch' && searchInput.value.trim()) {
        switchView('viewSearch');
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        renderSearchResults('');
      }
    });
  }
}

function renderSearchResults(query = '') {
  const grid = document.getElementById('searchResultsGrid');
  const noFound = document.getElementById('noSearchFound');
  const header = document.getElementById('searchResultHeader');
  if (!grid) return;

  const searchInput = document.getElementById('globalSearchInput');
  const currentQuery = query || (searchInput ? searchInput.value.trim().toLowerCase() : '');

  let filtered = state.products;
  if (currentQuery) {
    filtered = state.products.filter(p => 
      p.name.toLowerCase().includes(currentQuery) ||
      (p.description && p.description.toLowerCase().includes(currentQuery))
    );
    if (header) {
      header.textContent = `"${currentQuery}" bo'yicha natijalar (${filtered.length} ta)`;
    }
  } else {
    if (header) {
      header.textContent = t('searchTitle');
    }
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (noFound) noFound.style.display = 'block';
  } else {
    if (noFound) noFound.style.display = 'none';
    grid.innerHTML = filtered.map(createProductCardHtml).join('');
  }
}

// ========================================================
// 6. SAVAT (CART) & BUYURTMA BERISH
// ========================================================
function handleAddToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const existing = state.cart.find(i => i.id === productId);
  if (existing) {
    existing.count += 1;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      count: 1
    });
  }

  saveCart();
  renderProducts();
  renderSearchResults();
  renderCart();
  updateCartBadge();
}

function changeCartCount(productId, delta) {
  const item = state.cart.find(i => i.id === productId);
  if (!item) return;

  item.count += delta;
  if (item.count <= 0) {
    state.cart = state.cart.filter(i => i.id !== productId);
  }

  saveCart();
  renderProducts();
  renderSearchResults();
  renderCart();
  updateCartBadge();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(i => i.id !== productId);
  saveCart();
  renderProducts();
  renderSearchResults();
  renderCart();
  updateCartBadge();
}

function saveCart() {
  localStorage.setItem('sifat_cart', JSON.stringify(state.cart));
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadgeCount');
  if (!badge) return;

  const totalItems = state.cart.reduce((sum, item) => sum + item.count, 0);
  if (totalItems > 0) {
    badge.style.display = 'flex';
    badge.textContent = totalItems;
  } else {
    badge.style.display = 'none';
  }
}

function renderCart() {
  const container = document.getElementById('cartItemsContainer');
  const emptyMsg = document.getElementById('emptyCartMessage');
  const checkoutArea = document.getElementById('cartCheckoutArea');
  const totalPriceEl = document.getElementById('cartTotalPrice');
  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
    if (checkoutArea) checkoutArea.style.display = 'none';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';
  if (checkoutArea) checkoutArea.style.display = 'block';

  let totalSum = 0;
  const currency = t('currency');

  container.innerHTML = state.cart.map(item => {
    const itemTotal = item.price * item.count;
    totalSum += itemTotal;

    return `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.image}" alt="${item.name}" />
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">${item.price.toLocaleString()} ${currency}</div>
        </div>

        <div class="cart-counter">
          <button class="btn-counter" onclick="changeCartCount(${item.id}, -1)">-</button>
          <span class="counter-value">${item.count}</span>
          <button class="btn-counter" onclick="changeCartCount(${item.id}, 1)">+</button>
        </div>

        <button class="cart-remove-btn" onclick="removeFromCart(${item.id})" title="O'chirish">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
  }).join('');

  if (totalPriceEl) {
    totalPriceEl.textContent = `${totalSum.toLocaleString()} ${currency}`;
  }
}

// Savatdagi Leaflet xaritasini boshlash
function initUserOrderMap() {
  const mapEl = document.getElementById('userOrderMap');
  if (!mapEl || userOrderMap) return;

  userOrderMap = L.map('userOrderMap').setView(state.userOrderCoords, 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(userOrderMap);

  userOrderMarker = L.marker(state.userOrderCoords, { draggable: true }).addTo(userOrderMap);

  userOrderMarker.on('dragend', function (e) {
    const pos = e.target.getLatLng();
    updateSelectedUserCoords(pos.lat, pos.lng);
  });

  userOrderMap.on('click', function (e) {
    userOrderMarker.setLatLng(e.latlng);
    updateSelectedUserCoords(e.latlng.lat, e.latlng.lng);
  });

  // GPS "Mening joylashuvim" tugmasi
  const geolocateBtn = document.getElementById('btnGeolocateUser');
  if (geolocateBtn) {
    geolocateBtn.addEventListener('click', () => {
      if (navigator.geolocation) {
        geolocateBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Aniqlanmoqda...`;
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            userOrderMap.setView([lat, lng], 16);
            userOrderMarker.setLatLng([lat, lng]);
            updateSelectedUserCoords(lat, lng);
            geolocateBtn.innerHTML = `<i class="fa-solid fa-crosshairs"></i> ${t('useMyLocation')}`;
          },
          (err) => {
            alert("Joylashuvni aniqlashga ruxsat berilmadi yoki xatolik yuz berdi. Xaritadan belgilang.");
            geolocateBtn.innerHTML = `<i class="fa-solid fa-crosshairs"></i> ${t('useMyLocation')}`;
          }
        );
      } else {
        alert("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi.");
      }
    });
  }

  // Buyurtmani tasdiqlash tugmasi
  const confirmBtn = document.getElementById('btnConfirmOrder');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', handleConfirmOrder);
  }
}

function updateSelectedUserCoords(lat, lng) {
  state.userOrderCoords = [lat, lng];
  const coordText = document.getElementById('userSelectedCoordText');
  if (coordText) {
    coordText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

function handleConfirmOrder() {
  if (state.cart.length === 0) {
    alert("Savatingiz bo'sh!");
    return;
  }

  const nameInput = document.getElementById('orderCustomerName');
  const phoneInput = document.getElementById('orderCustomerPhone');

  const name = (nameInput && nameInput.value.trim()) || state.currentUser.name || "Mijoz";
  const phone = (phoneInput && phoneInput.value.trim()) || state.currentUser.phone || "+998 90 123 45 67";

  const totalSum = state.cart.reduce((sum, item) => sum + (item.price * item.count), 0);

  const newOrder = {
    id: "ORD-" + Math.floor(1000 + Math.random() * 9000),
    customerName: name,
    customerPhone: phone,
    items: [...state.cart],
    total: totalSum,
    location: {
      lat: state.userOrderCoords[0],
      lng: state.userOrderCoords[1]
    },
    status: "in_delivery", // "in_delivery" = Yo'lda (Kuryerda)
    date: new Date().toLocaleDateString()
  };

  state.orders.unshift(newOrder);
  localStorage.setItem('sifat_orders', JSON.stringify(state.orders));

  // Savatni tozalash
  state.cart = [];
  saveCart();
  renderCart();
  renderProducts();
  renderSearchResults();
  updateCartBadge();

  // Buyurtmalar bo'limini yangilash
  renderUserOrders();
  renderAdminOrders();

  alert(`Buyurtmangiz qabul qilindi! Buyurtma raqami: #${newOrder.id}. Kuryer yo'lga chiqdi.`);
  
  // Profil bo'limidagi buyurtmalarni ochish
  switchView('viewProfile');
  const ordersBox = document.getElementById('userOrdersListContainer');
  if (ordersBox) ordersBox.style.display = 'block';
}

// ========================================================
// 7. FOYDALANUVCHI BUYURTMALARI & BEKOR QILISH
// ========================================================
function renderUserOrders() {
  const container = document.getElementById('userOrdersCards');
  const badge = document.getElementById('activeOrdersCountBadge');
  if (!container) return;

  const userPhone = state.currentUser.phone;
  // Barcha yoki shu foydalanuvchiga tegishli buyurtmalar
  const myOrders = state.orders;

  const activeCount = myOrders.filter(o => o.status === 'in_delivery').length;
  if (badge) {
    if (activeCount > 0) {
      badge.style.display = 'inline-flex';
      badge.textContent = activeCount;
    } else {
      badge.style.display = 'none';
    }
  }

  if (myOrders.length === 0) {
    container.innerHTML = `<p style="color:#94a3b8; font-size:0.9rem; padding:10px 0;">Hozircha buyurtmalaringiz yo'q.</p>`;
    return;
  }

  container.innerHTML = myOrders.map(order => {
    let statusClass = "status-in-delivery";
    let statusText = t('orderInDelivery');

    if (order.status === 'completed') {
      statusClass = "status-completed";
      statusText = t('orderCompleted');
    } else if (order.status === 'canceled') {
      statusClass = "status-canceled";
      statusText = t('orderCanceled');
    }

    const itemsSummary = order.items.map(i => `${i.name} (x${i.count})`).join(', ');

    return `
      <div class="order-card" id="userOrderCard-${order.id}">
        <div class="order-header-row">
          <span class="order-id-tag">#${order.id} • ${order.date}</span>
          <span class="order-status-badge ${statusClass}">${statusText}</span>
        </div>

        <div class="order-products-summary">
          <strong>Mahsulotlar:</strong> ${itemsSummary}
        </div>

        <div style="font-size: 0.95rem; font-weight: 700; color: var(--primary); margin-bottom: 8px;">
          Jami: ${order.total.toLocaleString()} ${t('currency')}
        </div>

        <div class="order-actions-row">
          ${order.status === 'in_delivery' ? `
            <button class="btn-cancel-order" onclick="cancelOrder('${order.id}')">
              <i class="fa-solid fa-ban"></i> ${t('cancelOrder')}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function cancelOrder(orderId) {
  if (!confirm("Haqiqatan ham buyurtmani bekor qilmoqchimisiz?")) return;

  const order = state.orders.find(o => o.id === orderId);
  if (order) {
    order.status = 'canceled';
    localStorage.setItem('sifat_orders', JSON.stringify(state.orders));
    renderUserOrders();
    renderAdminOrders();
    alert("Buyurtma bekor qilindi. Admin paneldan ham bekor qilindi.");
  }
}

// ========================================================
// 8. AUTENTIFIKATSIYA VA ADMIN LOGIN
// ========================================================
function initAuth() {
  const headerAuthBtn = document.getElementById('headerAuthBtn');
  const profileAuthActionBtn = document.getElementById('profileAuthActionBtn');
  const modalAuthType = document.getElementById('modalAuthType');
  const btnSelectAdmin = document.getElementById('btnSelectAdmin');
  const btnSelectUser = document.getElementById('btnSelectUser');
  const modalAdminLogin = document.getElementById('modalAdminLogin');
  const modalUserAuth = document.getElementById('modalUserAuth');
  const formAdminLogin = document.getElementById('formAdminLogin');
  const formUserAuth = document.getElementById('formUserAuth');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');

  // Modal ochish
  const openAuthChooser = () => {
    if (state.isAdmin) {
      // Agar admin bo'lsa, admin paneliga olib borish
      switchAdminView('viewAdminHome');
    } else {
      openModal('modalAuthType');
    }
  };

  if (headerAuthBtn) headerAuthBtn.addEventListener('click', openAuthChooser);
  if (profileAuthActionBtn) profileAuthActionBtn.addEventListener('click', openAuthChooser);

  // Admin tanlansa
  if (btnSelectAdmin) {
    btnSelectAdmin.addEventListener('click', () => {
      closeModal('modalAuthType');
      openModal('modalAdminLogin');
    });
  }

  // Foydalanuvchi tanlansa
  if (btnSelectUser) {
    btnSelectUser.addEventListener('click', () => {
      closeModal('modalAuthType');
      openModal('modalUserAuth');
    });
  }

  // Admin Login yuborilganda
  if (formAdminLogin) {
    formAdminLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = document.getElementById('adminUsernameInput').value.trim();
      const pass = document.getElementById('adminPasswordInput').value.trim();
      const errBox = document.getElementById('adminLoginError');

      // TALABGA BINOAN: Login: sifatmarket , Parol: IsmoiljonXudoshukur09
      if (user === 'sifatmarket' && pass === 'IsmoiljonXudoshukur09') {
        state.isAdmin = true;
        localStorage.setItem('sifat_is_admin', 'true');
        closeModal('modalAdminLogin');
        if (errBox) errBox.style.display = 'none';

        // Admin rejimiga o'tish
        activateAdminMode();
      } else {
        if (errBox) errBox.style.display = 'block';
      }
    });
  }

  // Foydalanuvchi Ro'yxatdan o'tganda
  if (formUserAuth) {
    formUserAuth.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('userAuthName').value.trim();
      const phone = document.getElementById('userAuthPhone').value.trim();

      state.currentUser = { name, phone, isLoggedIn: true };
      localStorage.setItem('sifat_user', JSON.stringify(state.currentUser));

      closeModal('modalUserAuth');
      updateHeaderAuthState();
      alert(`Xush kelibsiz, ${name}!`);
    });
  }

  // Admin Chiqish (Logout) tugmasi -> Oddiy foydalanuvchi rejimiga o'tadi
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
      state.isAdmin = false;
      localStorage.setItem('sifat_is_admin', 'false');
      deactivateAdminMode();
    });
  }
}

function activateAdminMode() {
  const userBottomNav = document.getElementById('userBottomNav');
  const adminBottomNav = document.getElementById('adminBottomNav');

  if (userBottomNav) userBottomNav.style.display = 'none';
  if (adminBottomNav) adminBottomNav.style.display = 'flex';

  updateHeaderAuthState();
  switchAdminView('viewAdminHome');
  renderAdminBanners();
  renderAdminOrders();
  updateAdminMessagesBadge();
}

function deactivateAdminMode() {
  const userBottomNav = document.getElementById('userBottomNav');
  const adminBottomNav = document.getElementById('adminBottomNav');

  if (userBottomNav) userBottomNav.style.display = 'flex';
  if (adminBottomNav) adminBottomNav.style.display = 'none';

  updateHeaderAuthState();
  switchView('viewHome');
}

function updateHeaderAuthState() {
  const textEl = document.getElementById('headerAuthText');
  const profileName = document.getElementById('profileDisplayName');
  const profilePhone = document.getElementById('profileDisplayPhone');
  const profileBtn = document.getElementById('profileAuthActionBtn');

  if (state.isAdmin) {
    if (textEl) textEl.textContent = "Admin Panel";
    if (profileBtn) profileBtn.textContent = "Admin";
  } else if (state.currentUser.isLoggedIn) {
    if (textEl) textEl.textContent = state.currentUser.name;
    if (profileName) profileName.textContent = state.currentUser.name;
    if (profilePhone) profilePhone.textContent = state.currentUser.phone;
    if (profileBtn) profileBtn.textContent = "Profilim";
  } else {
    if (textEl) textEl.textContent = t('loginRegister');
    if (profileBtn) profileBtn.textContent = t('loginRegister');
  }
}

// ========================================================
// 9. ADMIN PANEL: REKLAMA BANNERLARINI BOSHQARISH (5-6 TA)
// ========================================================
function renderAdminBanners() {
  const container = document.getElementById('adminBannerSlotsContainer');
  if (!container) return;

  container.innerHTML = '';

  // Jami 6 ta slot
  for (let i = 0; i < 6; i++) {
    const banner = state.banners[i] || null;
    const slotCard = document.createElement('div');
    slotCard.className = `banner-slot-card ${banner && banner.image ? 'has-image' : ''}`;

    if (banner && banner.image) {
      slotCard.innerHTML = `
        <img src="${banner.image}" alt="Slot ${i + 1}" />
        <div class="banner-slot-actions">
          <button class="btn-banner-action btn-banner-edit" onclick="openBannerModal(${i})">
            <i class="fa-solid fa-pen"></i> ${t('changeBanner')}
          </button>
          <button class="btn-banner-action btn-banner-delete" onclick="removeBanner(${i})">
            <i class="fa-solid fa-trash"></i> ${t('removeBanner')}
          </button>
        </div>
      `;
    } else {
      slotCard.innerHTML = `
        <button class="btn-banner-add" onclick="openBannerModal(${i})">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <span>${t('addBanner')} (#${i + 1})</span>
        </button>
      `;
    }

    container.appendChild(slotCard);
  }
}

function openBannerModal(slotIndex) {
  const modal = document.getElementById('modalBannerEdit');
  const slotIdxInput = document.getElementById('bannerSlotIndex');
  const imgUrlInput = document.getElementById('bannerImgUrlInput');
  const titleInput = document.getElementById('bannerTitleInput');
  const modalTitle = document.getElementById('bannerModalTitle');

  if (slotIdxInput) slotIdxInput.value = slotIndex;
  const existing = state.banners[slotIndex];

  if (imgUrlInput) imgUrlInput.value = (existing && existing.image) ? existing.image : '';
  if (titleInput) titleInput.value = (existing && existing.title) ? existing.title : '';
  if (modalTitle) modalTitle.textContent = `${t('bannerManageTitle')} - Slot #${slotIndex + 1}`;

  openModal('modalBannerEdit');
}

function initBannerForm() {
  const form = document.getElementById('formBannerEdit');
  const fileInput = document.getElementById('bannerFileInput');
  const imgUrlInput = document.getElementById('bannerImgUrlInput');

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (imgUrlInput) imgUrlInput.value = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const slotIndex = parseInt(document.getElementById('bannerSlotIndex').value, 10);
      const imgUrl = document.getElementById('bannerImgUrlInput').value.trim();
      const title = document.getElementById('bannerTitleInput').value.trim();

      if (!imgUrl) {
        alert("Rasm URL yoki faylini tanlang!");
        return;
      }

      state.banners[slotIndex] = {
        id: slotIndex + 1,
        image: imgUrl,
        title: title || "Sifat Market Yangi Aksiya",
        subtitle: "Eng sifatli mahsulotlar arzon narxlarda",
        badge: "Yangi"
      };

      localStorage.setItem('sifat_banners', JSON.stringify(state.banners));
      renderAdminBanners();
      renderBanners();
      closeModal('modalBannerEdit');
      alert("Banner muvaffaqiyatli saqlandi!");
    });
  }
}

function removeBanner(slotIndex) {
  if (!confirm("Ushbu reklama rasmini olib tashlamoqchimisiz?")) return;
  state.banners.splice(slotIndex, 1);
  localStorage.setItem('sifat_banners', JSON.stringify(state.banners));
  renderAdminBanners();
  renderBanners();
}

// ========================================================
// 10. ADMIN PANEL: MAHSULOT QO'SHISH CARD
// ========================================================
function initProductUpload() {
  const form = document.getElementById('formAddProduct');
  const cameraInput = document.getElementById('cameraInput');
  const galleryInput = document.getElementById('galleryInput');
  const previewImg = document.getElementById('adminProductImgPreview');
  const promptBox = document.getElementById('imagePickerPrompt');

  const handleFileSelect = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        state.newProductImageTemp = e.target.result;
        if (previewImg) {
          previewImg.src = e.target.result;
          previewImg.style.display = 'block';
        }
        if (promptBox) promptBox.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  };

  if (cameraInput) {
    cameraInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
  }
  if (galleryInput) {
    galleryInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('newProdName').value.trim();
      const price = parseInt(document.getElementById('newProdPrice').value, 10);
      const oldPriceVal = document.getElementById('newProdOldPrice').value;
      const oldPrice = oldPriceVal ? parseInt(oldPriceVal, 10) : null;
      const category = document.getElementById('newProdCategory').value;
      const desc = document.getElementById('newProdDesc').value.trim();

      let discount = null;
      if (oldPrice && oldPrice > price) {
        discount = Math.round(((oldPrice - price) / oldPrice) * 100);
      }

      const newProduct = {
        id: Date.now(),
        name: name,
        category: category,
        price: price,
        oldPrice: oldPrice,
        discount: discount,
        image: state.newProductImageTemp,
        description: desc,
        soldCount: 0,
        rating: 5.0
      };

      state.products.unshift(newProduct);
      localStorage.setItem('sifat_products', JSON.stringify(state.products));

      // Formani tozalash
      form.reset();
      if (previewImg) previewImg.style.display = 'none';
      if (promptBox) promptBox.style.display = 'block';

      renderProducts();
      renderSearchResults();
      alert(`"${name}" mahsuloti muvaffaqiyatli qo'shildi!`);
    });
  }
}

// ========================================================
// 11. ADMIN BUYURTMALAR, XARITA, MARSHRUT VA KURYER (50m)
// ========================================================
function renderAdminOrders() {
  const container = document.getElementById('adminOrdersCardsContainer');
  const badge = document.getElementById('adminOrdersTotalBadge');
  const navBadge = document.getElementById('adminOrdersBadge');
  if (!container) return;

  const orders = state.orders;
  const activeOrdersCount = orders.filter(o => o.status === 'in_delivery').length;

  if (badge) badge.textContent = orders.length;
  if (navBadge) {
    if (activeOrdersCount > 0) {
      navBadge.style.display = 'flex';
      navBadge.textContent = activeOrdersCount;
    } else {
      navBadge.style.display = 'none';
    }
  }

  if (orders.length === 0) {
    container.innerHTML = `<p style="color:#94a3b8; font-size:0.9rem;">Hozircha buyurtmalar yo'q.</p>`;
    return;
  }

  container.innerHTML = orders.map(order => {
    let statusClass = "status-in-delivery";
    let statusText = t('orderInDelivery');

    if (order.status === 'completed') {
      statusClass = "status-completed";
      statusText = t('orderCompleted');
    } else if (order.status === 'canceled') {
      statusClass = "status-canceled";
      statusText = t('orderCanceled');
    }

    const itemsSummary = order.items.map(i => `${i.name} (x${i.count})`).join(', ');

    return `
      <div class="order-card" id="adminOrderCard-${order.id}">
        <div class="order-header-row">
          <div>
            <span class="order-id-tag">#${order.id}</span>
            <strong style="margin-left: 8px; font-size: 0.95rem;">${order.customerName}</strong>
            <span style="color: var(--text-muted); font-size: 0.85rem; margin-left: 6px;">(${order.customerPhone})</span>
          </div>
          <span class="order-status-badge ${statusClass}">${statusText}</span>
        </div>

        <div class="order-products-summary">
          <strong>Harid:</strong> ${itemsSummary}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--primary);">
            Jami summa: ${order.total.toLocaleString()} ${t('currency')}
          </div>
          <div style="font-size: 0.8rem; color: #64748b;">
            Sana: ${order.date}
          </div>
        </div>

        <div class="order-actions-row">
          <!-- Joylashuvni ko'rish tugmasi -->
          <button class="btn-view-map" onclick="openAdminRouteModal('${order.id}')">
            <i class="fa-solid fa-map-location-dot"></i>
            ${t('viewLocation')}
          </button>

          <!-- Kuryer belgilangan joyga yetib borganida "Buyurtma yetkazildi" tugmasi -->
          ${order.status === 'in_delivery' ? `
            <button class="btn-delivered" onclick="markOrderDelivered('${order.id}')">
              <i class="fa-solid fa-circle-check"></i>
              ${t('orderDelivered')}
            </button>
            <button class="btn-cancel-order" onclick="cancelOrder('${order.id}')">
              <i class="fa-solid fa-ban"></i> ${t('cancelOrder')}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Xaritada marshrut (Route) ko'rsatish
function openAdminRouteModal(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return;

  activeOrderForRoute = order;
  openModal('modalAdminRouteMap');

  const customerNameEl = document.getElementById('routeCustomerName');
  const customerPhoneEl = document.getElementById('routeCustomerPhone');
  const directDeliveredBtn = document.getElementById('btnAdminOrderDeliveredDirect');
  const googleLink = document.getElementById('btnOpenInGoogleMaps');

  if (customerNameEl) customerNameEl.textContent = order.customerName;
  if (customerPhoneEl) customerPhoneEl.textContent = order.customerPhone;

  // Google Maps yo'nalish havolasi
  if (googleLink && order.location) {
    googleLink.href = `https://www.google.com/maps/dir/?api=1&destination=${order.location.lat},${order.location.lng}`;
  }

  if (directDeliveredBtn) {
    directDeliveredBtn.style.display = (order.status === 'in_delivery') ? 'inline-flex' : 'none';
    directDeliveredBtn.onclick = () => {
      markOrderDelivered(order.id);
      closeModal('modalAdminRouteMap');
    };
  }

  setTimeout(() => {
    initOrUpdateRouteMap(order);
  }, 200);
}

function initOrUpdateRouteMap(order) {
  const mapContainer = document.getElementById('routeMap');
  if (!mapContainer) return;

  const targetCoords = [order.location.lat, order.location.lng];
  
  // Kuryer nuqtasi: mijoz nuqtasidan 40-50 metr yaqinlikda yoki kuryer koordinatasi
  // Kuryer masofasi tekshiruvini qulay ko'rsatish uchun
  const courierCoords = [order.location.lat + 0.00035, order.location.lng + 0.00035];

  if (!routeMap) {
    routeMap = L.map('routeMap').setView(targetCoords, 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(routeMap);
  } else {
    routeMap.setView(targetCoords, 16);
    routeMap.invalidateSize();
  }

  // Tozalash
  if (targetMarker) routeMap.removeLayer(targetMarker);
  if (courierMarker) routeMap.removeLayer(courierMarker);
  if (routePolyline) routeMap.removeLayer(routePolyline);

  // Mijoz nuqtasi (Qizil belgi)
  const customerIcon = L.divIcon({
    className: 'custom-map-pin',
    html: `<div style="background:#ef4444; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.3); border:2px solid #fff;"><i class="fa-solid fa-user"></i></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });

  // Kuryer nuqtasi (Binafsha belgi)
  const courierIcon = L.divIcon({
    className: 'custom-courier-pin',
    html: `<div style="background:#7000ff; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.3); border:2px solid #fff;"><i class="fa-solid fa-motorcycle"></i></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });

  targetMarker = L.marker(targetCoords, { icon: customerIcon })
    .addTo(routeMap)
    .bindPopup(`<b>Mijoz manzili:</b> ${order.customerName}`)
    .openPopup();

  courierMarker = L.marker(courierCoords, { icon: courierIcon })
    .addTo(routeMap)
    .bindPopup(`<b>Kuryer (Sifat Market)</b>`);

  // Marshrut chizig'i (Route)
  routePolyline = L.polyline([courierCoords, targetCoords], {
    color: '#7000ff',
    weight: 5,
    opacity: 0.8,
    dashArray: '8, 8'
  }).addTo(routeMap);

  routeMap.fitBounds([courierCoords, targetCoords], { padding: [50, 50] });

  // Masofa hisoblash (Haversine)
  const distanceInMeters = calculateDistance(
    courierCoords[0], courierCoords[1],
    targetCoords[0], targetCoords[1]
  );

  const infoEl = document.getElementById('routeDistanceInfo');
  if (infoEl) {
    if (distanceInMeters <= 50) {
      infoEl.innerHTML = `
        <span style="color:#10b981; font-weight:700;">
          <i class="fa-solid fa-circle-check"></i> Kuryer manzilga yetib bordi (Masofa: ${Math.round(distanceInMeters)} metr)!
        </span>
      `;
    } else {
      infoEl.innerHTML = `
        <span>Kuryerdan mijozgacha bo'lgan masofa: <strong>${Math.round(distanceInMeters)} metr</strong></span>
      `;
    }
  }
}

// 50 metr masofa hisobi (Haversine formulasi)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Yer radiusi metrlarda
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Metrlarda qaytadi
}

function markOrderDelivered(orderId) {
  const order = state.orders.find(o => o.id === orderId);
  if (order) {
    order.status = 'completed';
    localStorage.setItem('sifat_orders', JSON.stringify(state.orders));
    renderAdminOrders();
    renderUserOrders();
    alert(`Buyurtma #${order.id} muvaffaqiyatli yetkazildi deb belgilandi!`);
  }
}

// ========================================================
// 12. TELEGRAM USLUBIDAGI XABARLAR (SAVOL-JAVOBLAR)
// ========================================================
function initChatSystem() {
  // Foydalanuvchi chati
  const userOpenChatBtn = document.getElementById('btnOpenUserSupportChat');
  const userChatForm = document.getElementById('formUserSendMessage');
  const userChatInput = document.getElementById('userChatInput');

  if (userOpenChatBtn) {
    userOpenChatBtn.addEventListener('click', () => {
      openModal('modalUserChat');
      renderUserChatMessages();
    });
  }

  if (userChatForm) {
    userChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = userChatInput.value.trim();
      if (!text) return;

      const newMsg = {
        id: Date.now(),
        customerName: state.currentUser.name || "Mijoz",
        customerPhone: state.currentUser.phone || "+998 90 123 45 67",
        text: text,
        fromAdmin: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };

      state.messages.push(newMsg);
      localStorage.setItem('sifat_messages', JSON.stringify(state.messages));
      userChatInput.value = '';
      renderUserChatMessages();
      updateAdminMessagesBadge();
    });
  }

  // Admin chati
  const adminOpenChatBtn = document.getElementById('btnAdminOpenMessages');
  const adminChatForm = document.getElementById('formAdminSendMessage');
  const adminChatInput = document.getElementById('adminChatInput');
  const btnBackToList = document.getElementById('btnBackToClientsList');

  if (adminOpenChatBtn) {
    adminOpenChatBtn.addEventListener('click', () => {
      openModal('modalAdminChat');
      showAdminClientsList();
    });
  }

  if (btnBackToList) {
    btnBackToList.addEventListener('click', () => {
      showAdminClientsList();
    });
  }

  if (adminChatForm) {
    adminChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = adminChatInput.value.trim();
      if (!text) return;

      const newMsg = {
        id: Date.now(),
        customerName: "Admin",
        customerPhone: state.activeAdminChatPhone,
        text: text,
        fromAdmin: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true
      };

      state.messages.push(newMsg);
      localStorage.setItem('sifat_messages', JSON.stringify(state.messages));
      adminChatInput.value = '';
      renderAdminSingleChat(state.activeAdminChatPhone);
      renderUserChatMessages();
    });
  }
}

function renderUserChatMessages() {
  const body = document.getElementById('userChatBody');
  if (!body) return;

  const currentPhone = state.currentUser.phone;
  // Faqat shu mijozning xabarlari va unga admin yozgan javoblar
  const userMessages = state.messages.filter(m => m.customerPhone === currentPhone || m.customerName === state.currentUser.name);

  body.innerHTML = userMessages.map(msg => `
    <div class="msg-bubble ${msg.fromAdmin ? 'admin' : 'user'}">
      <div>${msg.text}</div>
      <div class="msg-time">${msg.timestamp}</div>
    </div>
  `).join('');

  body.scrollTop = body.scrollHeight;
}

function updateAdminMessagesBadge() {
  const badge = document.getElementById('adminUnreadMessagesBadge');
  if (!badge) return;

  const unreadCount = state.messages.filter(m => !m.fromAdmin && !m.read).length;
  badge.textContent = unreadCount;
  badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
}

function showAdminClientsList() {
  const listEl = document.getElementById('adminTelegramClientList');
  const chatView = document.getElementById('adminSingleChatView');
  if (!listEl || !chatView) return;

  listEl.style.display = 'block';
  chatView.style.display = 'none';

  // Mijozlarni guruhlash
  const clientsMap = {};
  state.messages.forEach(msg => {
    const phone = msg.customerPhone || "+998 90 123 45 67";
    if (!clientsMap[phone]) {
      clientsMap[phone] = {
        name: msg.customerName || "Mijoz",
        phone: phone,
        lastMessage: msg.text,
        lastTime: msg.timestamp,
        unread: 0
      };
    } else {
      clientsMap[phone].lastMessage = msg.text;
      clientsMap[phone].lastTime = msg.timestamp;
    }

    if (!msg.fromAdmin && !msg.read) {
      clientsMap[phone].unread += 1;
    }
  });

  const clients = Object.values(clientsMap);

  if (clients.length === 0) {
    listEl.innerHTML = `<p style="padding:20px; color:#94a3b8; text-align:center;">Hozircha mijozlardan xabar kelmagan.</p>`;
    return;
  }

  listEl.innerHTML = clients.map(c => `
    <div 
      onclick="openAdminChatWithClient('${c.phone}', '${c.name}')" 
      style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:0.2s;"
      onmouseover="this.style.background='#f8fafc'" 
      onmouseout="this.style.background='#fff'"
    >
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="width:44px; height:44px; border-radius:50%; background:#229ed9; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700;">
          ${c.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h4 style="font-size:0.95rem; font-weight:700; color:#1e293b;">${c.name}</h4>
          <p style="font-size:0.82rem; color:#64748b; max-width:260px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.lastMessage}</p>
        </div>
      </div>

      <div style="text-align:right;">
        <span style="font-size:0.75rem; color:#94a3b8;">${c.lastTime}</span>
        ${c.unread > 0 ? `<div class="badge-telegram-count" style="margin-top:4px;">${c.unread}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function openAdminChatWithClient(phone, name) {
  state.activeAdminChatPhone = phone;
  const listEl = document.getElementById('adminTelegramClientList');
  const chatView = document.getElementById('adminSingleChatView');
  const clientTitle = document.getElementById('adminActiveClientTitle');

  if (listEl) listEl.style.display = 'none';
  if (chatView) chatView.style.display = 'block';
  if (clientTitle) clientTitle.textContent = `${name} (${phone})`;

  // Xabarlarni o'qildi deb belgilash
  state.messages.forEach(m => {
    if (m.customerPhone === phone && !m.fromAdmin) {
      m.read = true;
    }
  });
  localStorage.setItem('sifat_messages', JSON.stringify(state.messages));
  updateAdminMessagesBadge();

  renderAdminSingleChat(phone);
}

function renderAdminSingleChat(phone) {
  const body = document.getElementById('adminSingleChatBody');
  if (!body) return;

  const msgs = state.messages.filter(m => m.customerPhone === phone);

  body.innerHTML = msgs.map(msg => `
    <div class="msg-bubble ${msg.fromAdmin ? 'admin' : 'user'}">
      <div>${msg.text}</div>
      <div class="msg-time">${msg.timestamp}</div>
    </div>
  `).join('');

  body.scrollTop = body.scrollHeight;
}

// ========================================================
// 13. NAVIGATSIYA & VIEW SWITCHER
// ========================================================
function initNavigation() {
  // Foydalanuvchi navbari
  const userNavItems = document.querySelectorAll('#userBottomNav .nav-item');
  userNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.getAttribute('data-view');
      switchView(viewId);
    });
  });

  // Admin navbari
  const adminNavItems = document.querySelectorAll('#adminBottomNav .nav-item');
  adminNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.getAttribute('data-admin-view');
      switchAdminView(viewId);
    });
  });

  // Header Logo bosilganda asosiy menyuga qaytadi
  const logoBtn = document.getElementById('headerLogoBtn');
  if (logoBtn) {
    logoBtn.addEventListener('click', () => {
      if (state.isAdmin) {
        switchAdminView('viewAdminHome');
      } else {
        switchView('viewHome');
      }
    });
  }

  // Profil ichida "Mening zakazlarim" tugmasi
  const openOrdersBtn = document.getElementById('btnOpenUserOrders');
  const userOrdersListContainer = document.getElementById('userOrdersListContainer');
  if (openOrdersBtn && userOrdersListContainer) {
    openOrdersBtn.addEventListener('click', () => {
      const isVisible = userOrdersListContainer.style.display === 'block';
      userOrdersListContainer.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) renderUserOrders();
    });
  }

  // Til tanlash tugmalari
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const lang = e.currentTarget.getAttribute('data-lang');
      applyLanguage(lang);
    });
  });
}

function switchView(viewId) {
  state.currentView = viewId;

  // Barcha view-sectionlarni yashirish
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');

  // Bottom nav aktivligini yangilash
  document.querySelectorAll('#userBottomNav .nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Agar savat bo'lsa xaritani render qilish
  if (viewId === 'viewCart') {
    initUserOrderMap();
    setTimeout(() => {
      if (userOrderMap) userOrderMap.invalidateSize();
    }, 200);
  }

  // Sahifani yuqoriga qaytarish
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchAdminView(viewId) {
  state.currentAdminView = viewId;

  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');

  document.querySelectorAll('#adminBottomNav .nav-item').forEach(item => {
    if (item.getAttribute('data-admin-view') === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  if (viewId === 'viewAdminOrders') {
    renderAdminOrders();
  } else if (viewId === 'viewAdminHome') {
    renderAdminBanners();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================================
// 14. MODAL BOSHQARUVI
// ========================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function initModalClosers() {
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-close-modal');
      closeModal(targetId);
    });
  });

  // Tashqarisiga bosilganda yopish
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

// ========================================================
// 15. DASTURNI ISHGA TUSHIRISH (BOOTSTRAP)
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initModalClosers();
  initCarousel();
  initSearch();
  initAuth();
  initBannerForm();
  initProductUpload();
  initChatSystem();

  // Boshlang'ich renderlar
  applyLanguage(state.currentLang);
  updateCartBadge();
  updateAdminMessagesBadge();

  if (state.isAdmin) {
    activateAdminMode();
  } else {
    deactivateAdminMode();
  }
});
