document.addEventListener('DOMContentLoaded', function () {
  // ================= Общие утилиты =================
  const toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);
  let toastTimer = null;

  function showToast(message, type = 'info') {
    if (!message) return;
    toast.textContent = message;
    toast.className = 'toast toast-' + type + ' toast-visible';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('toast-visible'), 3500);
  }

  // Обёртка над fetch: всегда возвращает JSON и не «роняет» страницу
  function apiRequest(url, body) {
    const options = body === undefined ? {} : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    };

    return fetch(url, options).then(async (response) => {
      let data = {};
      try {
        data = await response.json();
      } catch (error) {
        data = {};
      }
      return { ok: response.ok, data };
    });
  }

  function updateCartBadge(count) {
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.classList.toggle('is-empty', !count);
    });
  }

  let currentUser = null;

  function refreshAuthUI(user) {
    document.querySelectorAll('.login-trigger').forEach(btn => {
      btn.style.display = user ? 'none' : '';
    });

    const loginLabel = document.getElementById('userLogin');
    if (loginLabel) loginLabel.textContent = user ? user.login : '';

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = user ? '' : 'none';

    // Ссылка на админ-панель только для администратора
    const adminNav = document.getElementById('adminNav');
    if (adminNav) adminNav.hidden = !(user && user.isAdmin);
  }

  // Показываем форму подтверждения только авторизованному пользователю
  function updateCheckoutAuth() {
    const guest = document.getElementById('checkoutGuest');
    const form = document.getElementById('checkoutForm');
    const userLabel = document.getElementById('checkoutUser');
    if (!guest || !form) return;

    const loggedIn = Boolean(currentUser);
    guest.hidden = loggedIn;
    form.hidden = !loggedIn;
    if (userLabel) userLabel.textContent = loggedIn ? currentUser.login : '—';
  }

  function syncAuth(user) {
    currentUser = user;
    refreshAuthUI(user);
    updateCheckoutAuth();

    // Если открыт личный кабинет — обновляем список заказов
    if (accountPageEl) loadAccount();

    // Если открыта админ-панель — проверяем права и загружаем данные
    if (document.getElementById('adminPage') && window.refreshAdminAccess) {
      window.refreshAdminAccess(user);
    }
  }

  // ================= 1. Модальные окна =================
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');
  const openLoginBtns = document.querySelectorAll('.open-login-btn');
  const openRegisterBtns = document.querySelectorAll('.open-register-btn');
  const closeBtns = document.querySelectorAll('.close-btn');

  function openModal(modal) {
    if (modal) modal.style.display = 'flex';
  }

  function closeModal(modal) {
    if (modal) modal.style.display = 'none';
  }

  openLoginBtns.forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      closeModal(registerModal);
      openModal(loginModal);
    });
  });

  openRegisterBtns.forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      closeModal(loginModal);
      openModal(registerModal);
    });
  });

  closeBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      closeModal(loginModal);
      closeModal(registerModal);
    });
  });

  window.addEventListener('click', function (e) {
    if (e.target === loginModal) closeModal(loginModal);
    if (e.target === registerModal) closeModal(registerModal);
  });

  // ================= 2. Слайдер =================
  const slides = document.querySelectorAll('.slide');
  const prevBtn = document.querySelector('.slider-btn.prev');
  const nextBtn = document.querySelector('.slider-btn.next');
  const dots = document.querySelectorAll('.dot');
  let currentSlide = 0;

  function showSlide(index) {
    if (slides.length === 0) return;
    if (index >= slides.length) currentSlide = 0;
    else if (index < 0) currentSlide = slides.length - 1;
    else currentSlide = index;

    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === currentSlide);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', () => showSlide(currentSlide - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => showSlide(currentSlide + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => showSlide(i)));

  // ================= 3. Форма обратной связи =================
  const contactForm = document.getElementById('contactForm');
  const alertSuccess = document.getElementById('contactSuccess');
  if (contactForm && alertSuccess) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      alertSuccess.style.display = 'block';
      contactForm.reset();
      setTimeout(() => alertSuccess.style.display = 'none', 4000);
    });
  }

  // ================= 4. Регистрация и авторизация =================
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');

  const cyrillicRegex = /^[А-Яа-яЁё\s\-]+$/;
  const latinRegex = /^[A-Za-z0-9\-]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      let isValid = true;

      const name = document.getElementById('regName').value.trim();
      const surname = document.getElementById('regSurname').value.trim();
      const patronymic = document.getElementById('regPatronymic').value.trim();
      const login = document.getElementById('regLogin').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const passwordRepeat = document.getElementById('regPasswordRepeat').value;
      const rules = document.getElementById('regRules').checked;

      document.querySelectorAll('#registerForm .error-msg').forEach(el => el.textContent = '');
      document.getElementById('regGlobalSuccess').style.display = 'none';

      if (!name || !cyrillicRegex.test(name)) { document.getElementById('errRegName').textContent = 'Обязательное поле. Только кириллица.'; isValid = false; }
      if (!surname || !cyrillicRegex.test(surname)) { document.getElementById('errRegSurname').textContent = 'Обязательное поле. Только кириллица.'; isValid = false; }
      if (patronymic && !cyrillicRegex.test(patronymic)) { document.getElementById('errRegPatronymic').textContent = 'Только кириллица.'; isValid = false; }
      if (!login || !latinRegex.test(login)) { document.getElementById('errRegLogin').textContent = 'Обязательное поле. Только латиница/цифры.'; isValid = false; }
      if (!email || !emailRegex.test(email)) { document.getElementById('errRegEmail').textContent = 'Введите корректный email.'; isValid = false; }
      if (!password || password.length < 6) { document.getElementById('errRegPassword').textContent = 'Не менее 6 символов.'; isValid = false; }
      if (!passwordRepeat || password !== passwordRepeat) { document.getElementById('errRegPasswordRepeat').textContent = 'Пароли не совпадают.'; isValid = false; }
      if (!rules) { document.getElementById('errRegRules').textContent = 'Необходимо согласие.'; isValid = false; }

      if (isValid) {
        apiRequest('/api/register', { name, surname, patronymic, login, email, password })
          .then(({ data }) => {
            if (data.success) {
              document.getElementById('regGlobalSuccess').style.display = 'block';
              document.getElementById('regGlobalSuccess').textContent = data.message;
              registerForm.reset();
            } else {
              document.getElementById('errRegLogin').textContent = data.message;
            }
          })
          .catch(error => console.error('Ошибка:', error));
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      let isValid = true;

      const login = document.getElementById('authLogin').value.trim();
      const password = document.getElementById('authPassword').value;

      document.querySelectorAll('#loginForm .error-msg').forEach(el => el.textContent = '');

      if (!login) { document.getElementById('errAuthLogin').textContent = 'Введите логин'; isValid = false; }
      if (!password) { document.getElementById('errAuthPassword').textContent = 'Введите пароль'; isValid = false; }

      if (isValid) {
        apiRequest('/api/login', { login, password })
          .then(({ data }) => {
            if (data.success) {
              loginForm.reset();
              closeModal(loginModal);
              syncAuth(data.user);
              showToast('Вы вошли как ' + data.user.login, 'success');
            } else {
              document.getElementById('authGlobalError').textContent = data.message;
            }
          })
          .catch(error => console.error('Ошибка:', error));
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      apiRequest('/api/logout', {}).then(() => {
        syncAuth(null);
        showToast('Вы вышли из аккаунта.');
      });
    });
  }

  // ================= 5. Каталог =================
  const productsContainer = document.getElementById('productsContainer');

  if (productsContainer) {
    const filterCategory = document.getElementById('filterCategory');
    const sortProducts = document.getElementById('sortProducts');
    let allProducts = [];

    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        allProducts = data.filter(p => p.inStock);
        renderProducts();
      });

    function renderProducts() {
      let filtered = [...allProducts];

      const category = filterCategory.value;
      if (category !== 'all') {
        filtered = filtered.filter(p => p.category === category);
      }

      const sortBy = sortProducts.value;
      if (sortBy === 'newest') {
        filtered.sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));
      } else if (sortBy === 'price_asc') {
        filtered.sort((a, b) => a.price - b.price);
      } else if (sortBy === 'price_desc') {
        filtered.sort((a, b) => b.price - a.price);
      } else if (sortBy === 'year') {
        filtered.sort((a, b) => b.year - a.year);
      } else if (sortBy === 'name') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      }

      productsContainer.innerHTML = filtered.map(item => `
        <div class="zone-item" onclick="window.location.href='/product/${item.id}'">
          <img src="${item.image}" alt="${item.name}">
          <div class="zone-info">
            <div>
              <h3>${item.name}</h3>
              <p class="zone-stock">В наличии: ${item.stock} шт.</p>
            </div>
            <div class="zone-bottom">
              <span class="zone-price">${item.price} руб/час</span>
              <button class="btn btn-register">Выбрать</button>
            </div>
          </div>
        </div>
      `).join('');
    }

    filterCategory.addEventListener('change', renderProducts);
    sortProducts.addEventListener('change', renderProducts);
  }

  // ================= 6. Страница товара =================
  const addToCartBtn = document.getElementById('addToCartBtn');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function () {
      const productId = Number(addToCartBtn.dataset.productId);
      addToCartBtn.disabled = true;

      apiRequest('/api/cart/add', { productId })
        .then(({ ok, data }) => {
          addToCartBtn.disabled = false;
          if (data.cart) updateCartBadge(data.cart.count);
          showToast(data.message || 'Товар добавлен в корзину.', ok ? 'success' : 'error');
        })
        .catch(() => {
          addToCartBtn.disabled = false;
          showToast('Не удалось добавить товар в корзину.', 'error');
        });
    });
  }

  // ================= 7. Корзина =================
  const cartPageEl = document.getElementById('cartPage');
  let cartState = { items: [], total: 0, count: 0 };

  function renderCartItem(item) {
    return `
      <div class="cart-item" data-id="${item.id}">
        <img src="${item.image}" alt="${item.name}">
        <div class="cart-item-info">
          <h3>${item.name}</h3>
          <p class="cart-item-price">${item.price} руб / час</p>
          <p class="cart-item-stock">В наличии: ${item.stock} шт.</p>
          <button type="button" class="cart-remove" data-action="remove">Удалить</button>
        </div>
        <div class="cart-item-qty">
          <button type="button" class="qty-btn" data-action="dec" aria-label="Убрать единицу">−</button>
          <span class="qty-value">${item.quantity}</span>
          <button type="button" class="qty-btn" data-action="inc" aria-label="Добавить единицу">+</button>
        </div>
        <div class="cart-item-sum">${item.sum} руб.</div>
      </div>
    `;
  }

  function renderCart(cart) {
    cartState = cart || { items: [], total: 0, count: 0 };
    updateCartBadge(cartState.count);

    const itemsEl = document.getElementById('cartItems');
    if (!itemsEl) return;

    const emptyEl = document.getElementById('cartEmpty');
    const totalCount = document.getElementById('cartTotalCount');
    const totalSum = document.getElementById('cartTotalSum');
    const submitBtn = document.getElementById('checkoutSubmit');

    itemsEl.innerHTML = cartState.items.map(renderCartItem).join('');
    if (totalCount) totalCount.textContent = cartState.count;
    if (totalSum) totalSum.textContent = cartState.total + ' руб.';

    const isEmpty = cartState.items.length === 0;
    if (emptyEl) emptyEl.hidden = !isEmpty;
    if (cartPageEl) cartPageEl.hidden = isEmpty;
    if (submitBtn) submitBtn.disabled = isEmpty;
  }

  function showCartMessage(text, type = 'info') {
    const messageEl = document.getElementById('cartMessage');
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = 'cart-message cart-message-' + type;
    messageEl.hidden = false;
  }

  if (cartPageEl) {
    const cartItemsEl = document.getElementById('cartItems');

    cartItemsEl.addEventListener('click', function (event) {
      const btn = event.target.closest('[data-action]');
      if (!btn) return;

      const row = btn.closest('.cart-item');
      if (!row) return;

      const productId = Number(row.dataset.id);
      const action = btn.dataset.action;
      const request = action === 'remove'
        ? apiRequest('/api/cart/remove', { productId })
        : apiRequest('/api/cart/change', { productId, delta: action === 'inc' ? 1 : -1 });

      request.then(({ ok, data }) => {
        if (data.cart) renderCart(data.cart);
        if (data.message) showCartMessage(data.message, ok ? 'info' : 'error');
      }).catch(() => showCartMessage('Не удалось обновить корзину.', 'error'));
    });

    document.getElementById('checkoutForm').addEventListener('submit', function (e) {
      e.preventDefault();

      const errorEl = document.getElementById('checkoutError');
      const passwordInput = document.getElementById('checkoutPassword');
      const submitBtn = document.getElementById('checkoutSubmit');
      const orderPanel = document.getElementById('orderSuccess');
      const orderText = document.getElementById('orderSuccessText');

      errorEl.textContent = '';

      if (!passwordInput.value) {
        errorEl.textContent = 'Введите пароль для подтверждения заказа.';
        return;
      }

      submitBtn.disabled = true;
      apiRequest('/api/checkout', { password: passwordInput.value })
        .then(({ data }) => {
          submitBtn.disabled = false;

          if (data.success) {
            passwordInput.value = '';
            const messageEl = document.getElementById('cartMessage');
            if (messageEl) messageEl.hidden = true;
            renderCart(data.cart);
            const emptyEl = document.getElementById('cartEmpty');
            if (emptyEl) emptyEl.hidden = true;
            if (orderText) {
              orderText.textContent = `Заказ №${data.order.number} успешно сформирован. Сумма заказа: ${data.order.total} руб.`;
            }
            if (orderPanel) orderPanel.hidden = false;
          } else {
            errorEl.textContent = data.message;
          }
        })
        .catch(() => {
          submitBtn.disabled = false;
          errorEl.textContent = 'Не удалось связаться с сервером. Попробуйте ещё раз.';
        });
    });
  }

  // ================= 8. Личный кабинет =================
  const accountPageEl = document.getElementById('accountPage');

  function formatOrderDate(iso) {
    const date = new Date(iso);
    return date.toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function renderOrderCard(order) {
    const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const itemsList = order.items.map(item => `
          <li><span>${item.name}</span><span>${item.quantity} шт.</span></li>
    `).join('');

    const statusClasses = {
      'Новый': 'status-new',
      'Подтвержден': 'status-confirmed',
      'Отменен': 'status-cancelled'
    };
    const statusClass = statusClasses[order.status] || 'status-new';
    const isNew = order.status === 'Новый';

    // Удалить пользователь может только новый заказ
    const actions = isNew
      ? '<button type="button" class="btn btn-danger btn-small" data-action="delete">Удалить заказ</button>'
      : '';

    const reason = order.status === 'Отменен' && order.cancelReason
      ? `<p class="order-reason">Причина отмены: ${order.cancelReason}</p>`
      : '';

    return `
      <article class="order-card" data-id="${order.id}">
        <div class="order-head">
          <div>
            <h3>Заказ №${order.number}</h3>
            <span class="order-date">${formatOrderDate(order.createdAt)}</span>
          </div>
          <span class="order-status ${statusClass}">${order.status}</span>
        </div>

        <p class="order-count">Количество товаров: <strong>${itemsCount}</strong></p>
        <ul class="order-items">${itemsList}</ul>
        ${reason}

        <div class="order-foot">
          <span class="order-total">${order.total} руб.</span>
          <div class="order-actions">${actions}</div>
        </div>
      </article>
    `;
  }

  function renderAccount(user, orders) {
    const guest = document.getElementById('accountGuest');
    const content = document.getElementById('accountContent');
    if (!guest || !content) return;

    guest.hidden = Boolean(user);
    content.hidden = !user;
    if (!user) return;

    document.getElementById('profileAvatar').textContent = user.login.charAt(0).toUpperCase();
    document.getElementById('profileLogin').textContent = user.login;
    document.getElementById('profileEmail').textContent = user.email || '—';
    document.getElementById('profileOrdersCount').textContent = orders.length;

    const list = document.getElementById('ordersList');
    const empty = document.getElementById('ordersEmpty');
    list.innerHTML = orders.map(renderOrderCard).join('');
    if (empty) empty.hidden = orders.length > 0;
  }

  function loadAccount() {
    if (!accountPageEl) return Promise.resolve();

    return Promise.all([apiRequest('/api/me'), apiRequest('/api/orders')])
      .then(([me, ordersResponse]) => {
        const user = me.data.user || null;
        const orders = ordersResponse.ok ? (ordersResponse.data.orders || []) : [];
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        renderAccount(user, orders);
      })
      .catch(() => {});
  }

  if (accountPageEl) {
    const ordersList = document.getElementById('ordersList');

    function showAccountMessage(text, type) {
      const messageEl = document.getElementById('accountMessage');
      if (!messageEl) return;
      messageEl.textContent = text;
      messageEl.className = 'notice notice-' + type;
      messageEl.hidden = false;
    }

    ordersList.addEventListener('click', function (event) {
      const btn = event.target.closest('[data-action]');
      if (!btn) return;

      const card = btn.closest('.order-card');
      if (!card) return;

      const orderId = Number(card.dataset.id);

      btn.disabled = true;
      apiRequest('/api/orders/' + orderId + '/delete', {})
        .then(({ ok, data }) => {
          btn.disabled = false;
          if (data.message) showAccountMessage(data.message, ok ? 'success' : 'error');
          loadAccount();
        })
        .catch(() => {
          btn.disabled = false;
          showAccountMessage('Не удалось выполнить действие. Попробуйте ещё раз.', 'error');
        });
    });
  }

  // ================= 10. Админ-панель =================
  const adminPageEl = document.getElementById('adminPage');

  if (adminPageEl) {
    const adminMessage = document.getElementById('adminMessage');
    const adminDenied = document.getElementById('adminDenied');
    const adminContent = document.getElementById('adminContent');
    const ordersBody = document.getElementById('ordersBody');
    const ordersEmpty = document.getElementById('ordersEmpty');
    const productsBody = document.getElementById('productsBody');
    const categoriesBody = document.getElementById('categoriesBody');
    const productModal = document.getElementById('productModal');
    const cancelModal = document.getElementById('cancelModal');
    const productForm = document.getElementById('productForm');
    const categoryForm = document.getElementById('categoryForm');
    const cancelForm = document.getElementById('cancelForm');
    const productCategorySelect = document.getElementById('productCategory');

    let currentStatus = 'new';
    let categories = [];
    let products = [];
    let editingProductId = null;
    let cancelOrderId = null;

    function showAdminMessage(text, type = 'success') {
      if (!text) return;
      adminMessage.textContent = text;
      adminMessage.className = 'notice notice-' + type;
      adminMessage.hidden = false;
    }

    function formatTimestamp(iso) {
      return new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }

    function statusClass(status) {
      if (status === 'Новый') return 'status-new';
      if (status === 'Подтвержден') return 'status-confirmed';
      return 'status-cancelled';
    }

    function categoryName(code) {
      const category = categories.find(item => item.code === code);
      return category ? category.name : '—';
    }

    function renderOrders(orders) {
      ordersEmpty.hidden = orders.length > 0;
      ordersBody.innerHTML = orders.map(order => {
        const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const reason = order.status === 'Отменен' && order.cancelReason
          ? `<div class="table-reason">Причина отказа: ${order.cancelReason}</div>`
          : '';
        const actions = order.status === 'Новый'
          ? `<button type="button" class="btn btn-small btn-outline" data-action="confirm" data-id="${order.id}">Подтвердить</button>
             <button type="button" class="btn btn-small btn-danger" data-action="cancel" data-id="${order.id}" data-number="${order.number}">Отменить</button>`
          : '';

        return `
          <tr>
            <td class="cell-date">${formatTimestamp(order.createdAt)}</td>
            <td><strong>${order.customer}</strong><div class="cell-muted">${order.login}</div>${reason}</td>
            <td>${itemsCount} шт.</td>
            <td>${order.total} руб.</td>
            <td><span class="order-status ${statusClass(order.status)}">${order.status}</span></td>
            <td class="cell-actions">${actions}</td>
          </tr>`;
      }).join('');
    }

    function loadOrders() {
      apiRequest('/api/admin/orders?status=' + currentStatus)
        .then(({ ok, data }) => {
          if (!ok) {
            showAdminMessage(data.message || 'Не удалось загрузить заказы.', 'error');
            return;
          }
          renderOrders(data.orders || []);
        })
        .catch(() => showAdminMessage('Не удалось загрузить заказы.', 'error'));
    }

    function renderProducts() {
      productsBody.innerHTML = products.map(product => `
        <tr>
          <td><strong>${product.name}</strong><div class="cell-muted">${product.country}, ${product.year}</div></td>
          <td>${categoryName(product.category)}</td>
          <td>${product.price} руб.</td>
          <td>${product.stock} шт.</td>
          <td>${product.stock > 0 ? '<span class="order-status status-confirmed">Опубликован</span>' : '<span class="order-status status-cancelled">Нет в наличии</span>'}</td>
          <td class="cell-actions">
            <button type="button" class="btn btn-small btn-outline" data-action="edit" data-id="${product.id}">Изменить</button>
            <button type="button" class="btn btn-small btn-danger" data-action="delete" data-id="${product.id}">Удалить</button>
          </td>
        </tr>`).join('');
    }

    function renderCategories() {
      categoriesBody.innerHTML = categories.map(category => `
        <tr>
          <td><strong>${category.name}</strong></td>
          <td class="cell-muted">${category.code}</td>
          <td>${category.productsCount}</td>
          <td class="cell-actions">
            <button type="button" class="btn btn-small btn-danger" data-action="delete-category" data-id="${category.id}">Удалить</button>
          </td>
        </tr>`).join('');
    }

    function fillCategorySelect(selected) {
      productCategorySelect.innerHTML = categories.map(category =>
        `<option value="${category.code}">${category.name}</option>`).join('');
      if (selected) productCategorySelect.value = selected;
    }

    function loadCatalog() {
      Promise.all([apiRequest('/api/admin/products'), apiRequest('/api/admin/categories')])
        .then(([productsResponse, categoriesResponse]) => {
          if (!productsResponse.ok || !categoriesResponse.ok) {
            showAdminMessage('Не удалось загрузить данные.', 'error');
            return;
          }
          products = productsResponse.data.products || [];
          categories = categoriesResponse.data.categories || [];
          renderProducts();
          renderCategories();
          fillCategorySelect();
        })
        .catch(() => showAdminMessage('Не удалось загрузить данные.', 'error'));
    }

    function switchTab(tab) {
      document.querySelectorAll('.admin-tab').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tab);
      });
      document.getElementById('tab-orders').hidden = tab !== 'orders';
      document.getElementById('tab-products').hidden = tab !== 'products';
      document.getElementById('tab-categories').hidden = tab !== 'categories';

      if (tab === 'orders') loadOrders();
      if (tab === 'products' || tab === 'categories') loadCatalog();
    }

    document.querySelectorAll('.admin-tab').forEach(button => {
      button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    document.querySelectorAll('#orderFilters .filter-btn').forEach(button => {
      button.addEventListener('click', () => {
        currentStatus = button.dataset.status;
        document.querySelectorAll('#orderFilters .filter-btn').forEach(item => {
          item.classList.toggle('active', item === button);
        });
        loadOrders();
      });
    });

    ordersBody.addEventListener('click', function (event) {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      const orderId = button.dataset.id;
      if (button.dataset.action === 'confirm') {
        apiRequest('/api/admin/orders/' + orderId + '/confirm', {})
          .then(({ ok, data }) => {
            showAdminMessage(data.message, ok ? 'success' : 'error');
            if (ok) loadOrders();
          });
      } else if (button.dataset.action === 'cancel') {
        cancelOrderId = orderId;
        document.getElementById('cancelOrderNumber').textContent = '№' + button.dataset.number;
        document.getElementById('cancelReason').value = '';
        document.getElementById('cancelError').textContent = '';
        cancelModal.style.display = 'flex';
      }
    });

    cancelForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const reason = document.getElementById('cancelReason').value.trim();
      if (!reason) {
        document.getElementById('cancelError').textContent = 'Укажите причину отмены.';
        return;
      }

      apiRequest('/api/admin/orders/' + cancelOrderId + '/cancel', { reason })
        .then(({ ok, data }) => {
          if (ok) {
            cancelModal.style.display = 'none';
            showAdminMessage(data.message, 'success');
            loadOrders();
          } else {
            document.getElementById('cancelError').textContent = data.message;
          }
        });
    });

    document.getElementById('cancelModalClose').addEventListener('click', () => {
      cancelModal.style.display = 'none';
    });

    // ---- товары ----
    function openProductModal(product) {
      editingProductId = product ? product.id : null;
      document.getElementById('productModalTitle').textContent = product ? 'Редактирование товара' : 'Новый товар';
      document.getElementById('productName').value = product ? product.name : '';
      document.getElementById('productPrice').value = product ? product.price : '';
      document.getElementById('productStock').value = product ? product.stock : '';
      document.getElementById('productYear').value = product ? product.year : '';
      document.getElementById('productCountry').value = product ? product.country : '';
      document.getElementById('productModel').value = product ? product.model : '';
      document.getElementById('productImage').value = product ? product.image : '';
      document.getElementById('productError').textContent = '';
      fillCategorySelect(product ? product.category : undefined);
      productModal.style.display = 'flex';
    }

    document.getElementById('addProductBtn').addEventListener('click', () => openProductModal(null));
    document.getElementById('productModalClose').addEventListener('click', () => {
      productModal.style.display = 'none';
    });

    productForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const payload = {
        name: document.getElementById('productName').value.trim(),
        category: productCategorySelect.value,
        price: Number(document.getElementById('productPrice').value),
        stock: Number(document.getElementById('productStock').value),
        year: Number(document.getElementById('productYear').value) || null,
        country: document.getElementById('productCountry').value.trim(),
        model: document.getElementById('productModel').value.trim(),
        image: document.getElementById('productImage').value.trim()
      };

      const url = editingProductId
        ? '/api/admin/products/' + editingProductId
        : '/api/admin/products';

      apiRequest(url, payload).then(({ ok, data }) => {
        if (!ok) {
          document.getElementById('productError').textContent = data.message;
          return;
        }
        productModal.style.display = 'none';
        showAdminMessage(data.message, 'success');
        loadCatalog();
      });
    });

    productsBody.addEventListener('click', function (event) {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      const productId = Number(button.dataset.id);
      if (button.dataset.action === 'edit') {
        const product = products.find(item => item.id === productId);
        if (product) openProductModal(product);
      } else if (button.dataset.action === 'delete') {
        apiRequest('/api/admin/products/' + productId + '/delete', {})
          .then(({ ok, data }) => {
            showAdminMessage(data.message, ok ? 'success' : 'error');
            if (ok) loadCatalog();
          });
      }
    });

    // ---- категории ----
    categoryForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const name = document.getElementById('categoryName').value.trim();
      if (!name) return;

      apiRequest('/api/admin/categories', { name }).then(({ ok, data }) => {
        showAdminMessage(data.message, ok ? 'success' : 'error');
        if (ok) {
          document.getElementById('categoryName').value = '';
          loadCatalog();
        }
      });
    });

    categoriesBody.addEventListener('click', function (event) {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      apiRequest('/api/admin/categories/' + button.dataset.id + '/delete', {})
        .then(({ ok, data }) => {
          showAdminMessage(data.message, ok ? 'success' : 'error');
          if (ok) loadCatalog();
        });
    });

    // ---- доступ ----
    function refreshAdminAccess(user) {
      if (!user || !user.isAdmin) {
        adminDenied.hidden = false;
        adminContent.hidden = true;
        return;
      }

      adminDenied.hidden = true;
      adminContent.hidden = false;
      loadOrders();
      loadCatalog();
    }

    window.refreshAdminAccess = refreshAdminAccess;
  }

  // ================= 9. Начальное состояние =================
  Promise.all([apiRequest('/api/me'), apiRequest('/api/cart')])
    .then(([me, cart]) => {
      syncAuth(me.data.user || null);
      if (cartPageEl) {
        renderCart(cart.data.cart);
      } else {
        updateCartBadge(cart.data && cart.data.cart ? cart.data.cart.count : 0);
      }
    })
    .catch(() => {});
});
