const express = require('express');
const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => res.render('index'));
app.get('/catalog', (req, res) => res.render('catalog'));
app.get('/contacts', (req, res) => res.render('contacts'));

let usersDB = []; 

app.post('/api/register', (req, res) => {
    const { login, email, password } = req.body;
    
    const userExists = usersDB.find(u => u.login === login || u.email === email);
    if (userExists) {
        return res.status(400).json({ success: false, message: 'Пользователь с таким логином или email уже существует.' });
    }

    usersDB.push({ login, email, password });
    console.log("Зарегистрирован новый пользователь:", login);
    res.json({ success: true, message: 'Регистрация прошла успешно!' });
});

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    const user = usersDB.find(u => u.login === login && u.password === password);
    
    if (user) {
        res.json({ success: true, message: 'Успешная авторизация!' });
    } else {
        res.status(400).json({ success: false, message: 'Неверный логин или пароль.' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});