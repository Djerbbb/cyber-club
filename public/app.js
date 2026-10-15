document.addEventListener('DOMContentLoaded', function () {
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
        fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login, email, password })
        })
        .then(response => response.json())
        .then(data => {
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
        fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login, password })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            alert('Успешная авторизация!');
            loginForm.reset();
            closeModal(loginModal);
          } else {
            document.getElementById('authGlobalError').textContent = data.message;
          }
        })
        .catch(error => console.error('Ошибка:', error));
      }
    });
  }
});