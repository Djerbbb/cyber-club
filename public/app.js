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
        <div class="zone-item" onclick="window.location.href='/product/${item.id}'" style="cursor:pointer; display: flex; flex-direction: column;">
          <img src="${item.image}" alt="${item.name}" style="height: 200px; object-fit: cover;">
          <div class="zone-info" style="flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <h3>${item.name}</h3>
            <div class="zone-bottom" style="margin-top: 15px;">
              <span class="zone-price">${item.price} руб.</span>
              <button class="btn btn-login">Выбрать</button>
            </div>
          </div>
        </div>
      `).join('');
    }

    filterCategory.addEventListener('change', renderProducts);
    sortProducts.addEventListener('change', renderProducts);
  }