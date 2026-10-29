const express = require('express');
const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

let usersDB = []; 

const productsDB = [
    { id: 1, name: "PC Standart (Место 12)", category: "standart", price: 120, image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80", inStock: true, addedDate: "2024-10-25", year: 2023, country: "Тайвань", model: "Cyber-S1 (i5/RTX3060)" },
    { id: 2, name: "VIP PC (Место 3)", category: "vip", price: 200, image: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=600&q=80", inStock: true, addedDate: "2024-10-20", year: 2024, country: "США", model: "Alienware Aurora R15" },
    { id: 3, name: "BootCamp Зал (На 5 человек)", category: "bootcamp", price: 800, image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80", inStock: true, addedDate: "2024-09-15", year: 2024, country: "Тайвань", model: "Asus ROG Custom" },
    { id: 4, name: "PC Standart (Место 15)", category: "standart", price: 120, image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80", inStock: false, addedDate: "2024-10-22", year: 2022, country: "Китай", model: "Cyber-S1" }, // Занято (inStock: false - не будет отображаться)
    { id: 5, name: "Console Lounge (PS5)", category: "console", price: 300, image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80", inStock: true, addedDate: "2024-08-10", year: 2021, country: "Япония", model: "PlayStation 5" }
];

app.get('/', (req, res) => res.render('index'));
app.get('/catalog', (req, res) => res.render('catalog'));
app.get('/contacts', (req, res) => res.render('contacts'));

app.get('/product/:id', (req, res) => {
    const product = productsDB.find(p => p.id == req.params.id);
    if (!product || !product.inStock) {
        return res.status(404).send('Место не найдено или в данный момент занято');
    }
    res.render('product', { product }); 
});

app.get('/api/products', (req, res) => res.json(productsDB));

app.post('/api/register', (req, res) => {
    const { login, email, password } = req.body;
    if (usersDB.find(u => u.login === login || u.email === email)) {
        return res.status(400).json({ success: false, message: 'Логин или email уже занят.' });
    }
    usersDB.push({ login, email, password });
    res.json({ success: true, message: 'Регистрация прошла успешно!' });
});

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    const user = usersDB.find(u => u.login === login && u.password === password);
    if (user) res.json({ success: true, message: 'Успешная авторизация!' });
    else res.status(400).json({ success: false, message: 'Неверный логин или пароль.' });
});

app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));