// Простое управление модальными окнами, слайдером и формой обратной связи
document.addEventListener('DOMContentLoaded', function () {
  // 1. Модальные окна
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

  // 2. Простой слайдер на 3 слайда
  const slides = document.querySelectorAll('.slide');
  const prevBtn = document.querySelector('.slider-btn.prev');
  const nextBtn = document.querySelector('.slider-btn.next');
  const dots = document.querySelectorAll('.dot');
  let currentSlide = 0;

  function showSlide(index) {
    if (slides.length === 0) return;

    if (index >= slides.length) {
      currentSlide = 0;
    } else if (index < 0) {
      currentSlide = slides.length - 1;
    } else {
      currentSlide = index;
    }

    slides.forEach((slide, i) => {
      if (i === currentSlide) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    dots.forEach((dot, i) => {
      if (i === currentSlide) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      showSlide(currentSlide - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      showSlide(currentSlide + 1);
    });
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', function () {
      showSlide(i);
    });
  });

  // 3. Форма обратной связи на странице contacts.html
  const contactForm = document.getElementById('contactForm');
  const alertSuccess = document.getElementById('contactSuccess');
  if (contactForm && alertSuccess) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      alertSuccess.style.display = 'block';
      contactForm.reset();
      setTimeout(function () {
        alertSuccess.style.display = 'none';
      }, 4000);
    });
  }
});
