document.addEventListener('DOMContentLoaded', function() {
    const addCarForm = document.getElementById('addCarForm');
    const fetchSpecsBtn = document.getElementById('fetchSpecsBtn');
    const saveCarBtn = document.getElementById('saveCarBtn');
    const carSpecsContainer = document.getElementById('carSpecsContainer');

    // Handle image preview
    const imageInput = document.querySelector('input[type="file"]');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    // You could add an image preview element if desired
                    console.log('Image loaded successfully');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Handle fetching car specifications
    // Update the specs container HTML generation in cars.js
if (fetchSpecsBtn) {
    fetchSpecsBtn.addEventListener('click', async function() {
        const brand = document.getElementById('carBrand').value;
        const model = document.getElementById('carModel').value;
        const year = document.getElementById('carYear').value;

        if (!brand || !model || !year) {
            alert('Пожалуйста, заполните марку, модель и год выпуска');
            return;
        }

        try {
            fetchSpecsBtn.disabled = true;
            fetchSpecsBtn.textContent = 'Загрузка...';

            carSpecsContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label" style="color: black;">Объем двигателя (л)</label>
                        <input type="number" class="form-control" name="engineSize" step="0.1" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label" style="color: black;">Трансмиссия</label>
                        <select class="form-control" name="transmission" required>
                            <option value="">Выберите тип</option>
                            <option value="Автомат">Автомат</option>
                            <option value="Механика">Механика</option>
                            <option value="Робот">Робот</option>
                        </select>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label" style="color: black;">Мощность (л.с.)</label>
                        <input type="number" class="form-control" name="power" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label" style="color: black;">Разгон до 100 км/ч (сек)</label>
                        <input type="number" class="form-control" name="acceleration" step="0.1" required>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label" style="color: black;">Категория</label>
                        <select class="form-control" name="category" required>
                            <option value="">Выберите категорию</option>
                            <option value="Economy">Эконом</option>
                            <option value="Business">Бизнес</option>
                            <option value="Premium">Премиум</option>
                            <option value="SUV">Внедорожник</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label" style="color: black;">Тип топлива</label>
                        <select class="form-control" name="fuelType" required>
                            <option value="">Выберите тип</option>
                            <option value="Бензин">Бензин</option>
                            <option value="Дизель">Дизель</option>
                            <option value="Гибрид">Гибрид</option>
                            <option value="Электро">Электро</option>
                        </select>
                    </div>
                </div>
            `;
            
            carSpecsContainer.classList.remove('d-none');
            saveCarBtn.classList.remove('d-none');
            fetchSpecsBtn.classList.add('d-none');
            
        } catch (error) {
            console.error('Error:', error);
            alert('Ошибка при получении характеристик автомобиля');
        } finally {
            fetchSpecsBtn.disabled = false;
            fetchSpecsBtn.textContent = 'Получить характеристики';
        }
    });
}

    // Handle form submission
    if (addCarForm) {
        addCarForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            try {
                const response = await fetch('/cars/add', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    window.location.href = '/cars';
                } else {
                    const data = await response.json();
                    alert(data.error || 'Ошибка при сохранении автомобиля');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Произошла ошибка при сохранении автомобиля');
            }
        });
    }

    // Handle brand filter
    const brandLinks = document.querySelectorAll('.brand-link');
    brandLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const url = new URL(window.location.href);
            const brand = this.getAttribute('href').split('=')[1];
            
            if (brand) {
                url.searchParams.set('brand', brand);
            } else {
                url.searchParams.delete('brand');
            }
            
            window.location.href = url.toString();
        });
    });

    // Handle sort options
    const sortLinks = document.querySelectorAll('.sort-link');
    sortLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const url = new URL(window.location.href);
            const sort = this.getAttribute('href').split('=')[1].split('&')[0];
            
            url.searchParams.set('sort', sort);
            window.location.href = url.toString();
        });
    });
});
