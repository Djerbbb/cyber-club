// Простое управление модальными окнами входа и регистрации
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
});
