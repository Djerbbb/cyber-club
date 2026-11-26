const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

// ================= «База данных» =================
// Администратор создаётся при запуске сервера
let usersDB = [
    {
        login: 'admin',
        email: 'admin@cyberclub.ru',
        password: 'admin123',
        name: 'Администратор',
        surname: '',
        patronymic: '',
        isAdmin: true
    }
];

const ordersDB = [];
let orderSequence = 0;

const categoriesDB = [
    { id: 1, code: 'standart', name: 'Общий зал' },
    { id: 2, code: 'vip', name: 'VIP зал' },
    { id: 3, code: 'bootcamp', name: 'BootCamp' },
    { id: 4, code: 'console', name: 'Консоли' }
];
let categorySequence = 4;

// stock — количество мест/часов, доступных для брони
const productsDB = [
    { id: 1, name: "PC Standart (Место 12)", category: "standart", price: 120, image: "/img/1.jpg", stock: 5, addedDate: "2024-10-25", year: 2023, country: "Тайвань", model: "Cyber-S1 (i5/RTX3060)" },
    { id: 2, name: "VIP PC (Место 3)", category: "vip", price: 200, image: "/img/2.webp", stock: 2, addedDate: "2024-10-20", year: 2024, country: "США", model: "Alienware Aurora R15" },
    { id: 3, name: "BootCamp Зал", category: "bootcamp", price: 800, image: "/img/3.webp", stock: 1, addedDate: "2024-09-15", year: 2024, country: "Тайвань", model: "Asus ROG Custom" },
    { id: 4, name: "PC Standart (Место 15)", category: "standart", price: 120, image: "/img/3.webp", stock: 0, addedDate: "2024-10-22", year: 2022, country: "Китай", model: "Cyber-S1" },
    { id: 5, name: "Console Lounge (PS5)", category: "console", price: 300, image: "/img/4.jpg", stock: 3, addedDate: "2024-08-10", year: 2021, country: "Япония", model: "PlayStation 5" }
];
let productSequence = 5;

const ORDER_STATUS = {
    new: 'Новый',
    confirmed: 'Подтвержден',
    cancelled: 'Отменен'
};

// Клиенту отдаём вычисляемое поле inStock
const serializeProduct = (product) => ({ ...product, inStock: product.stock > 0 });

// ФИО пользователя для заказа
function fullName(user) {
    const parts = [user.surname, user.name, user.patronymic].filter(Boolean);
    return parts.length ? parts.join(' ') : user.login;
}

// ================= Сессии =================
const SESSION_COOKIE = 'cc_sid';
const sessions = new Map();

function parseCookies(header = '') {
    return header.split(';').reduce((acc, chunk) => {
        const index = chunk.indexOf('=');
        if (index === -1) return acc;
        const key = chunk.slice(0, index).trim();
        if (!key) return acc;
        acc[key] = decodeURIComponent(chunk.slice(index + 1).trim());
        return acc;
    }, {});
}

app.use((req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    let sid = cookies[SESSION_COOKIE];

    if (!sid || !sessions.has(sid)) {
        sid = crypto.randomUUID();
        sessions.set(sid, { user: null, cart: {} });
        res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax`);
    }

    req.session = sessions.get(sid);
    next();
});

// ================= Корзина =================
// Корзина хранится в сессии в виде { id товара: количество }
function buildCart(session) {
    const items = [];
    let total = 0;

    for (const id of Object.keys(session.cart)) {
        const product = productsDB.find(p => p.id === Number(id));
        if (!product) {
            delete session.cart[id];
            continue;
        }

        // Количество не может превышать остаток на складе
        const quantity = Math.min(session.cart[id], product.stock);
        if (quantity <= 0) {
            delete session.cart[id];
            continue;
        }

        session.cart[id] = quantity;
        items.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity,
            stock: product.stock,
            sum: product.price * quantity
        });
        total += product.price * quantity;
    }

    return {
        items,
        total,
        count: items.reduce((sum, item) => sum + item.quantity, 0)
    };
}

function sendCart(req, res, extra = {}) {
    res.json({ success: true, cart: buildCart(req.session), user: req.session.user, ...extra });
}

// ================= Проверка прав администратора =================
function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Требуется авторизация.' });
    }

    const user = usersDB.find(u => u.login === req.session.user.login);
    if (!user || !user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Доступ только для администратора.' });
    }

    req.admin = user;
    next();
}

// ================= Страницы =================
app.get('/', (req, res) => res.render('index'));
app.get('/catalog', (req, res) => res.render('catalog', { categories: categoriesDB }));
app.get('/contacts', (req, res) => res.render('contacts'));
app.get('/cart', (req, res) => res.render('cart'));
app.get('/account', (req, res) => res.render('account'));
app.get('/admin', (req, res) => res.render('admin'));

app.get('/product/:id', (req, res) => {
    const product = productsDB.find(p => p.id == req.params.id);
    if (!product || product.stock <= 0) {
        return res.status(404).send('Место не найдено или в данный момент занято');
    }
    res.render('product', { product: serializeProduct(product) });
});

app.get('/api/products', (req, res) => res.json(productsDB.map(serializeProduct)));

// ================= Авторизация =================
app.get('/api/me', (req, res) => {
    if (!req.session.user) {
        return res.json({ user: null });
    }

    const user = usersDB.find(u => u.login === req.session.user.login);
    if (!user) {
        return res.json({ user: null });
    }

    res.json({
        user: {
            login: user.login,
            email: user.email,
            name: user.name || '',
            surname: user.surname || '',
            isAdmin: Boolean(user.isAdmin)
        }
    });
});

app.post('/api/register', (req, res) => {
    const { name, surname, patronymic, login, email, password } = req.body || {};

    if (!login || !email || !password) {
        return res.status(400).json({ success: false, message: 'Заполните все поля.' });
    }
    if (usersDB.find(u => u.login === login || u.email === email)) {
        return res.status(400).json({ success: false, message: 'Логин или email уже занят.' });
    }

    usersDB.push({
        login,
        email,
        password,
        name: String(name || '').trim(),
        surname: String(surname || '').trim(),
        patronymic: String(patronymic || '').trim(),
        isAdmin: false
    });

    res.json({ success: true, message: 'Регистрация прошла успешно!' });
});

app.post('/api/login', (req, res) => {
    const { login, password } = req.body || {};
    const user = usersDB.find(u => u.login === login && u.password === password);

    if (!user) {
        return res.status(400).json({ success: false, message: 'Неверный логин или пароль.' });
    }

    req.session.user = { login: user.login };
    res.json({
        success: true,
        message: 'Успешная авторизация!',
        user: { login: user.login, email: user.email, name: user.name || '', isAdmin: Boolean(user.isAdmin) }
    });
});

app.post('/api/logout', (req, res) => {
    req.session.user = null;
    res.json({ success: true });
});

// ================= API корзины =================
app.get('/api/cart', (req, res) => sendCart(req, res));

app.post('/api/cart/add', (req, res) => {
    const product = productsDB.find(p => p.id === Number((req.body || {}).productId));
    if (!product) {
        return res.status(404).json({ success: false, message: 'Товар не найден.' });
    }
    if (product.stock <= 0) {
        return res.status(400).json({ success: false, message: 'Товара нет в наличии.' });
    }

    const current = req.session.cart[product.id] || 0;
    if (current >= product.stock) {
        return res.status(400).json({ success: false, message: `В наличии только ${product.stock} шт.` });
    }

    req.session.cart[product.id] = current + 1;
    sendCart(req, res, { message: `«${product.name}» добавлен в корзину.` });
});

app.post('/api/cart/change', (req, res) => {
    const { productId, delta } = req.body || {};
    const product = productsDB.find(p => p.id === Number(productId));
    if (!product) {
        return res.status(404).json({ success: false, message: 'Товар не найден.' });
    }

    const step = Number(delta) || 0;
    const quantity = (req.session.cart[product.id] || 0) + step;

    if (quantity > product.stock) {
        return res.status(400).json({ success: false, message: `В наличии только ${product.stock} шт.` });
    }
    if (quantity <= 0) {
        delete req.session.cart[product.id];
        return sendCart(req, res, { message: `«${product.name}» удалён из корзины.` });
    }

    req.session.cart[product.id] = quantity;
    sendCart(req, res);
});

app.post('/api/cart/remove', (req, res) => {
    const product = productsDB.find(p => p.id === Number((req.body || {}).productId));
    if (!product) {
        return res.status(404).json({ success: false, message: 'Товар не найден.' });
    }

    delete req.session.cart[product.id];
    sendCart(req, res, { message: `«${product.name}» удалён из корзины.` });
});

// ================= Оформление заказа =================
app.post('/api/checkout', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Для оформления заказа войдите в аккаунт.' });
    }

    const user = usersDB.find(u => u.login === req.session.user.login);
    if (!user) {
        req.session.user = null;
        return res.status(401).json({ success: false, message: 'Сессия устарела, войдите заново.' });
    }

    const password = String((req.body || {}).password || '');
    if (!password) {
        return res.status(400).json({ success: false, message: 'Введите пароль для подтверждения заказа.' });
    }
    if (user.password !== password) {
        return res.status(400).json({ success: false, message: 'Неверный пароль. Заказ не сформирован.' });
    }

    const cart = buildCart(req.session);
    if (cart.items.length === 0) {
        return res.status(400).json({ success: false, message: 'Корзина пуста.' });
    }

    const unavailable = cart.items.find(item => {
        const product = productsDB.find(p => p.id === item.id);
        return !product || item.quantity > product.stock;
    });
    if (unavailable) {
        return res.status(400).json({ success: false, message: `«${unavailable.name}» нельзя забронировать в таком количестве.` });
    }

    // Списание остатков и формирование заказа
    cart.items.forEach(item => {
        const product = productsDB.find(p => p.id === item.id);
        product.stock -= item.quantity;
    });

    const order = {
        id: orderSequence + 1,
        number: 1000 + orderSequence + 1,
        login: user.login,
        customer: fullName(user),
        items: cart.items,
        total: cart.total,
        status: ORDER_STATUS.new,
        cancelReason: '',
        createdAt: new Date().toISOString()
    };
    orderSequence += 1;
    ordersDB.push(order);
    req.session.cart = {};

    res.json({
        success: true,
        message: `Заказ №${order.number} успешно сформирован!`,
        order,
        cart: buildCart(req.session)
    });
});

// ================= Заказы пользователя =================
app.get('/api/orders', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Требуется авторизация.' });
    }

    // Заказы пользователя, от новых к старым
    const orders = ordersDB
        .filter(order => order.login === req.session.user.login)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, orders });
});

// Удалять можно только новые заказы
app.post('/api/orders/:id/delete', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Требуется авторизация.' });
    }

    const index = ordersDB.findIndex(order => order.id === Number(req.params.id) && order.login === req.session.user.login);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Заказ не найден.' });
    }

    const order = ordersDB[index];
    if (order.status !== ORDER_STATUS.new) {
        return res.status(400).json({ success: false, message: 'Удалить можно только новый заказ.' });
    }

    // Возвращаем забронированные товары на склад
    order.items.forEach(item => {
        const product = productsDB.find(p => p.id === item.id);
        if (product) product.stock += item.quantity;
    });

    ordersDB.splice(index, 1);
    res.json({ success: true, message: `Заказ №${order.number} удалён.` });
});

// ================= Админ-панель: заказы =================
app.get('/api/admin/orders', requireAdmin, (req, res) => {
    const status = ORDER_STATUS[req.query.status] || null;

    const orders = ordersDB
        .filter(order => !status || order.status === status)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, orders, statuses: ORDER_STATUS });
});

app.post('/api/admin/orders/:id/confirm', requireAdmin, (req, res) => {
    const order = ordersDB.find(order => order.id === Number(req.params.id));
    if (!order) {
        return res.status(404).json({ success: false, message: 'Заказ не найден.' });
    }
    if (order.status !== ORDER_STATUS.new) {
        return res.status(400).json({ success: false, message: 'Подтвердить можно только новый заказ.' });
    }

    order.status = ORDER_STATUS.confirmed;
    order.confirmedAt = new Date().toISOString();
    res.json({ success: true, message: `Заказ №${order.number} подтверждён.`, order });
});

app.post('/api/admin/orders/:id/cancel', requireAdmin, (req, res) => {
    const reason = String((req.body || {}).reason || '').trim();
    const order = ordersDB.find(order => order.id === Number(req.params.id));

    if (!order) {
        return res.status(404).json({ success: false, message: 'Заказ не найден.' });
    }
    if (order.status === ORDER_STATUS.cancelled) {
        return res.status(400).json({ success: false, message: 'Заказ уже отменён.' });
    }
    if (!reason) {
        return res.status(400).json({ success: false, message: 'Укажите причину отмены.' });
    }

    order.status = ORDER_STATUS.cancelled;
    order.cancelReason = reason;
    order.cancelledAt = new Date().toISOString();

    // Отменённый заказ возвращает товары на склад
    order.items.forEach(item => {
        const product = productsDB.find(p => p.id === item.id);
        if (product) product.stock += item.quantity;
    });

    res.json({ success: true, message: `Заказ №${order.number} отменён.`, order });
});

// ================= Админ-панель: товары =================
app.get('/api/admin/products', requireAdmin, (req, res) => {
    res.json({ success: true, products: productsDB.map(serializeProduct), categories: categoriesDB });
});

function readProductBody(body = {}) {
    return {
        name: String(body.name || '').trim(),
        category: String(body.category || '').trim(),
        price: Number(body.price),
        stock: Number(body.stock),
        country: String(body.country || '').trim(),
        model: String(body.model || '').trim(),
        year: Number(body.year) || null,
        image: String(body.image || '').trim()
    };
}

function validateProduct(data, res) {
    if (!data.name) {
        res.status(400).json({ success: false, message: 'Укажите название товара.' });
        return false;
    }
    if (!categoriesDB.find(category => category.code === data.category)) {
        res.status(400).json({ success: false, message: 'Выберите существующую категорию.' });
        return false;
    }
    if (!Number.isFinite(data.price) || data.price <= 0) {
        res.status(400).json({ success: false, message: 'Цена должна быть положительным числом.' });
        return false;
    }
    if (!Number.isInteger(data.stock) || data.stock < 0) {
        res.status(400).json({ success: false, message: 'Количество должно быть целым неотрицательным числом.' });
        return false;
    }
    return true;
}

app.post('/api/admin/products', requireAdmin, (req, res) => {
    const data = readProductBody(req.body);
    if (!validateProduct(data, res)) return;

    productSequence += 1;
    const product = {
        id: productSequence,
        name: data.name,
        category: data.category,
        price: data.price,
        image: data.image || '/img/1.jpg',
        stock: data.stock,
        addedDate: new Date().toISOString().slice(0, 10),
        year: data.year || new Date().getFullYear(),
        country: data.country || '—',
        model: data.model || '—'
    };

    productsDB.push(product);
    res.json({ success: true, message: `Товар «${product.name}» опубликован.`, product: serializeProduct(product) });
});

app.post('/api/admin/products/:id', requireAdmin, (req, res) => {
    const product = productsDB.find(item => item.id === Number(req.params.id));
    if (!product) {
        return res.status(404).json({ success: false, message: 'Товар не найден.' });
    }

    const data = readProductBody(req.body);
    if (!validateProduct(data, res)) return;

    product.name = data.name;
    product.category = data.category;
    product.price = data.price;
    product.stock = data.stock;
    product.image = data.image || product.image;
    product.year = data.year || product.year;
    product.country = data.country || product.country;
    product.model = data.model || product.model;

    res.json({ success: true, message: `Товар «${product.name}» сохранён.`, product: serializeProduct(product) });
});

app.post('/api/admin/products/:id/delete', requireAdmin, (req, res) => {
    const index = productsDB.findIndex(item => item.id === Number(req.params.id));
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Товар не найден.' });
    }

    const [product] = productsDB.splice(index, 1);
    res.json({ success: true, message: `Товар «${product.name}» удалён.` });
});

// ================= Админ-панель: категории =================
app.get('/api/admin/categories', requireAdmin, (req, res) => {
    const categories = categoriesDB.map(category => ({
        ...category,
        productsCount: productsDB.filter(product => product.category === category.code).length
    }));
    res.json({ success: true, categories });
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
    const name = String((req.body || {}).name || '').trim();
    if (!name) {
        return res.status(400).json({ success: false, message: 'Укажите название категории.' });
    }
    if (categoriesDB.find(category => category.name.toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Такая категория уже существует.' });
    }

    categorySequence += 1;
    const category = { id: categorySequence, code: 'cat' + categorySequence, name };
    categoriesDB.push(category);
    res.json({ success: true, message: `Категория «${name}» добавлена.`, category });
});

app.post('/api/admin/categories/:id/delete', requireAdmin, (req, res) => {
    const index = categoriesDB.findIndex(category => category.id === Number(req.params.id));
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Категория не найдена.' });
    }

    const category = categoriesDB[index];
    const productsCount = productsDB.filter(product => product.category === category.code).length;
    if (productsCount > 0) {
        return res.status(400).json({
            success: false,
            message: `Нельзя удалить категорию «${category.name}»: в ней ${productsCount} товар(ов).`
        });
    }

    categoriesDB.splice(index, 1);
    res.json({ success: true, message: `Категория «${category.name}» удалена.` });
});

app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));
