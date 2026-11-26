const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

// ================= «База данных» =================
let usersDB = [];
const ordersDB = [];

// stock — количество мест/часов, доступных для брони
const productsDB = [
    { id: 1, name: "PC Standart (Место 12)", category: "standart", price: 120, image: "/img/1.jpg", stock: 5, addedDate: "2024-10-25", year: 2023, country: "Тайвань", model: "Cyber-S1 (i5/RTX3060)" },
    { id: 2, name: "VIP PC (Место 3)", category: "vip", price: 200, image: "/img/2.webp", stock: 2, addedDate: "2024-10-20", year: 2024, country: "США", model: "Alienware Aurora R15" },
    { id: 3, name: "BootCamp Зал", category: "bootcamp", price: 800, image: "/img/3.webp", stock: 1, addedDate: "2024-09-15", year: 2024, country: "Тайвань", model: "Asus ROG Custom" },
    { id: 4, name: "PC Standart (Место 15)", category: "standart", price: 120, image: "/img/3.webp", stock: 0, addedDate: "2024-10-22", year: 2022, country: "Китай", model: "Cyber-S1" },
    { id: 5, name: "Console Lounge (PS5)", category: "console", price: 300, image: "/img/4.jpg", stock: 3, addedDate: "2024-08-10", year: 2021, country: "Япония", model: "PlayStation 5" }
];

// Клиенту отдаём вычисляемое поле inStock
const serializeProduct = (product) => ({ ...product, inStock: product.stock > 0 });

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

// ================= Страницы =================
app.get('/', (req, res) => res.render('index'));
app.get('/catalog', (req, res) => res.render('catalog'));
app.get('/contacts', (req, res) => res.render('contacts'));
app.get('/cart', (req, res) => res.render('cart'));

app.get('/product/:id', (req, res) => {
    const product = productsDB.find(p => p.id == req.params.id);
    if (!product || product.stock <= 0) {
        return res.status(404).send('Место не найдено или в данный момент занято');
    }
    res.render('product', { product: serializeProduct(product) });
});

app.get('/api/products', (req, res) => res.json(productsDB.map(serializeProduct)));

// ================= Авторизация =================
app.get('/api/me', (req, res) => res.json({ user: req.session.user }));

app.post('/api/register', (req, res) => {
    const { login, email, password } = req.body || {};

    if (!login || !email || !password) {
        return res.status(400).json({ success: false, message: 'Заполните все поля.' });
    }
    if (usersDB.find(u => u.login === login || u.email === email)) {
        return res.status(400).json({ success: false, message: 'Логин или email уже занят.' });
    }

    usersDB.push({ login, email, password });
    res.json({ success: true, message: 'Регистрация прошла успешно!' });
});

app.post('/api/login', (req, res) => {
    const { login, password } = req.body || {};
    const user = usersDB.find(u => u.login === login && u.password === password);

    if (!user) {
        return res.status(400).json({ success: false, message: 'Неверный логин или пароль.' });
    }

    req.session.user = { login: user.login };
    res.json({ success: true, message: 'Успешная авторизация!', user: req.session.user });
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
        id: ordersDB.length + 1,
        number: 1001 + ordersDB.length,
        login: user.login,
        items: cart.items,
        total: cart.total,
        createdAt: new Date().toISOString()
    };
    ordersDB.push(order);
    req.session.cart = {};

    res.json({
        success: true,
        message: `Заказ №${order.number} успешно сформирован!`,
        order,
        cart: buildCart(req.session)
    });
});

app.get('/api/orders', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Требуется авторизация.' });
    }
    res.json(ordersDB.filter(order => order.login === req.session.user.login));
});

app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));
