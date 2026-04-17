let token = localStorage.getItem('token') || '';
let favorites = [];

// Запасные фильмы (на случай отсутствия интернета)
const fallbackMovies = [
  {
    id: 435,
    title: "Зеленая миля",
    vote_average: 9.1,
    year: 1999,
    poster_path: "https://kinopoiskapiunofficial.tech/images/posters/kp_small/435.jpg",
    overview: "Пол Эджкомб — начальник блока смертников в тюрьме «Холодная гора»..."
  },
  {
    id: 326,
    title: "Побег из Шоушенка",
    vote_average: 9.1,
    year: 1994,
    poster_path: "https://kinopoiskapiunofficial.tech/images/posters/kp_small/326.jpg",
    overview: "Бухгалтер Энди Дюфрейн обвинён в убийстве собственной жены и её любовника..."
  },
  {
    id: 535341,
    title: "1+1",
    vote_average: 8.9,
    year: 2011,
    poster_path: "https://kinopoiskapiunofficial.tech/images/posters/kp_small/535341.jpg",
    overview: "Пострадавший аристократ нанимает в сиделки молодого парня из предместья..."
  },
  {
    id: 448,
    title: "Форрест Гамп",
    vote_average: 8.9,
    year: 1994,
    poster_path: "https://kinopoiskapiunofficial.tech/images/posters/kp_small/448.jpg",
    overview: "Сидя на автобусной остановке, Форрест Гамп рассказывает историю своей жизни..."
  },
  {
    id: 258687,
    title: "Интерстеллар",
    vote_average: 8.7,
    year: 2014,
    poster_path: "https://kinopoiskapiunofficial.tech/images/posters/kp_small/258687.jpg",
    overview: "Группа исследователей отправляется через червоточину в поисках новой родины..."
  },
  {
    id: 447301,
    title: "Начало",
    vote_average: 8.6,
    year: 2010,
    poster_path: "https://kinopoiskapiunofficial.tech/images/posters/kp_small/447301.jpg",
    overview: "Кобб — вор, который крадёт секреты из глубин подсознания во время сна..."
  },
  {
    id: 279,
    title: "Криминальное чтиво",
    vote_average: 8.5,
    year: 1994,
    poster_path: "https://kinopoiskapiunofficial.tech/images/posters/kp_small/279.jpg",
    overview: "Двое бандитов проводят время в философских беседах между разборками..."
  },
  {
    id: 361,
    title: "Бойцовский клуб",
    vote_average: 8.4,
    year: 1999,
    poster_path: "https://kinopoiskapiunofficial.tech/images/posters/kp_small/361.jpg",
    overview: "Сотрудник страховой компании встречает харизматичного торговца мылом..."
  }
];

const modal = document.getElementById('authModal');
const openBtn = document.getElementById('openAuthBtn');
const closeBtn = document.querySelector('.close-btn');
const toggleLink = document.getElementById('toggleAuth');
const submitBtn = document.getElementById('authSubmit');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const submitText = document.getElementById('submitText');
const switchMessage = document.getElementById('switchMessage');
const favoritesBtn = document.getElementById('favoritesBtn');
const profileBtn = document.getElementById('profileBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Функция выхода из аккаунта
function logout() {
  // Показываем подтверждение
  const confirmLogout = confirm('Вы уверены, что хотите выйти из аккаунта?');
  if (!confirmLogout) return;
  
  token = '';
  favorites = [];
  localStorage.removeItem('token');

  // Обновляем UI
  document.getElementById('authSection').style.display = 'flex';
  favoritesBtn.style.display = 'none';
  profileBtn.style.display = 'none';
  logoutBtn.style.display = 'none'; // Скрываем кнопку выхода

  // Обновляем фильмы
  applyFilters();
  
  // Показываем уведомление
  alert('Вы успешно вышли из аккаунта!');
}

// Назначаем обработчик для кнопки выхода
if (logoutBtn) {
  logoutBtn.onclick = logout;
}


// Функция для показа красивых уведомлений
function showNotification(title, message, type = 'error') {
  // Удаляем предыдущее уведомление, если есть
  const oldModal = document.querySelector('.notification-modal');
  if (oldModal) oldModal.remove();
  
  // Создаем новое уведомление
  const modal = document.createElement('div');
  modal.className = 'notification-modal';
  
  let icon = '';
  if (type === 'error') {
    icon = '❌';
  } else if (type === 'warning') {
    icon = '⚠️';
  } else if (type === 'success') {
    icon = '✅';
  }
  
  modal.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon ${type}">${icon}</div>
      <h3 class="notification-title">${title}</h3>
      <p class="notification-message">${message}</p>
      <button class="notification-button" onclick="this.closest('.notification-modal').remove()">OK</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Автоматически закрыть через 3 секунды
  setTimeout(() => {
    const modalToRemove = document.querySelector('.notification-modal');
    if (modalToRemove) modalToRemove.remove();
  }, 3000);
}

let isLogin = true;

openBtn.onclick = () => { modal.style.display = 'flex'; isLogin = true; updateModal(); };
closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
toggleLink.onclick = () => { isLogin = !isLogin; updateModal(); };

function updateModal() {
  modalTitle.textContent = isLogin ? 'Добро пожаловать!' : 'Создать аккаунт';
  modalSubtitle.textContent = isLogin ? 'Войдите в свой аккаунт' : 'Присоединяйтесь к нам!';
  submitText.textContent = isLogin ? 'Войти' : 'Зарегистрироваться';
  switchMessage.textContent = isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?';
  toggleLink.textContent = isLogin ? 'Зарегистрироваться' : 'Войти';
}

submitBtn.onclick = async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return;

  if (isLogin) {
    // Логин
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) {
          showNotification('Ошибка входа', 'Неверный email или пароль', 'error');
        }
        return;
      }

      token = data.token;
      favorites = data.favorites || [];
      localStorage.setItem('token', token);
      localStorage.setItem('userName', data.name);

      document.getElementById('authSection').style.display = 'none';
      favoritesBtn.style.display = 'inline-flex';
      profileBtn.style.display = 'inline-flex';
      logoutBtn.style.display = 'inline-flex';

      favoritesBtn.onclick = () => location.href = '/favorites';
      favoritesBtn.innerHTML = `Мои избранные (<span id="favCount">${favorites.length}</span>)`;

      modal.style.display = 'none';
      showNotification('Добро пожаловать!', 'Вы успешно вошли в аккаунт', 'success');
      applyFilters();
    } catch (err) {
      console.error('Ошибка:', err);
      showNotification('Ошибка', 'Что-то пошло не так', 'error');
    }
  } else {
    // РЕГИСТРАЦИЯ
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 500 && data.error?.includes('Duplicate')) {
          showNotification('Ошибка регистрации', 'Пользователь с таким email уже существует', 'warning');
        } else {
          throw new Error(data.error || 'Ошибка регистрации');
        }
        return;
      }
      showNotification('Регистрация успешна!', 'Выполняется вход...', 'success');
      
      // Автоматический вход
      const loginRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const loginData = await loginRes.json();
      
      if (loginRes.ok) {
        token = loginData.token;
        favorites = loginData.favorites || [];
        localStorage.setItem('token', token);
        localStorage.setItem('userName', loginData.name);

        document.getElementById('authSection').style.display = 'none';
        favoritesBtn.style.display = 'inline-flex';
        profileBtn.style.display = 'inline-flex';
        logoutBtn.style.display = 'inline-flex';

        favoritesBtn.onclick = () => location.href = '/favorites';
        favoritesBtn.innerHTML = `Мои избранные (<span id="favCount">${favorites.length}</span>)`;

        modal.style.display = 'none';
        showNotification('Добро пожаловать!', 'Аккаунт создан и выполнен вход', 'success');
        applyFilters();
      } else {
        // Если автоматический вход не удался, просто показываем сообщение
        showNotification('Регистрация завершена', 'Теперь вы можете войти в аккаунт', 'success');
        isLogin = true;
        updateModal();
      }
      
    } catch (err) {
      console.error('Ошибка:', err);
      showNotification('Ошибка', 'Что-то пошло не так. Попробуйте позже', 'error');
    }
  }
};

async function toggleFavorite(movieId, button) {
  if (!token) {
    modal.style.display = 'flex';
    return;
  }

  try {
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ movieId })
    });

    if (!res.ok) throw new Error('Ошибка сервера');

    favorites = await res.json();
    button.classList.toggle('active');
    
    // Обновляем счетчик в кнопке избранного
    if (favoritesBtn) {
      favoritesBtn.innerHTML = `Мои избранные (<span id="favCount">${favorites.length}</span>)`;
    }
    
  } catch (err) {
    console.error('Ошибка при обновлении избранного:', err);
  }
}

function showToast(message, type = 'error') {
  // Отключил все всплывающие сообщения
  return;
}

async function loadGenres() {
  try {
    const res = await fetch('/api/genres');
    const genres = await res.json();
    const select = document.getElementById('genreSelect');
    select.innerHTML = '<option value="all">Все жанры</option>';
    genres.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.name.toLowerCase();
      opt.textContent = g.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Ошибка загрузки жанров:', err);
  }
}

async function applyFilters() {
  const query = document.getElementById('searchInput').value.trim();
  const genre = document.getElementById('genreSelect').value;
  const year = document.getElementById('yearSlider').value;
  const rating = document.getElementById('ratingSlider').value;

  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (genre !== 'all') params.append('genre', genre);
  if (rating > 0) params.append('rating', rating);
  params.append('year', year);

  try {
    const res = await fetch(`/api/discover?${params}`);
    if (!res.ok) throw new Error('Ошибка загрузки');
    const movies = await res.json();
    displayMovies(movies);
  } catch (err) {
    console.log('Нет интернета или ошибка API, показываем локальные фильмы');
    displayMovies(fallbackMovies);
  }
}

function displayMovies(movies) {
  const c = document.getElementById('results');
  if (!c) return;

  if (!movies || movies.length === 0) {
    c.innerHTML = '<p style="grid-column:1/-1;text-align:center;font-size:22px;color:#999;">Ничего не найдено :(</p>';
    return;
  }

  const filteredMovies = movies.filter((_, index) => index !== 1);
  
  c.innerHTML = filteredMovies.map(m => {
    const isFav = token && favorites.includes(m.id);
    
    const poster = m.poster_path
      ? `/proxy-poster?path=${encodeURIComponent(m.poster_path)}`
      : 'https://via.placeholder.com/500x750/f5f5f5/666666?text=Нет+постера';
    
    const year = m.release_date ? m.release_date.substring(0, 4) : m.release_date || '—';
    
    let ratingDisplay = '—';
    if (m.vote_average !== undefined && m.vote_average !== null && parseFloat(m.vote_average) > 0) {
      ratingDisplay = parseFloat(m.vote_average).toFixed(1);
    }

    //передаем рейтинг в URL
    const movieUrl = `/movie/${m.id}?rating=${m.vote_average || 0}`;

    return `
      <div class="movie" onclick="location.href='${movieUrl}'" style="cursor:pointer;position:relative;">
        <img src="${poster}" 
             alt="${m.title || 'Фильм'}" 
             style="width:100%;height:440px;object-fit:cover;"
             onerror="this.src='https://via.placeholder.com/500x750/f5f5f5/666666?text=Ошибка+загрузки'">
        <button class="favorite-btn ${isFav ? 'active' : ''}" 
                onclick="event.stopPropagation(); toggleFavorite(${m.id}, this)">
          <i class="fas fa-heart"></i>
        </button>
        <div class="movie-info">
          <h3>${m.title || 'Без названия'}</h3>
          <div class="rating">★ ${ratingDisplay}</div>
          <p><strong>${year}</strong></p>
        </div>
      </div>`;
  }).join('');
}

document.getElementById('yearSlider').addEventListener('input', e => {
  document.getElementById('yearValue').textContent = e.target.value >= 2025 ? 'Любой' : e.target.value;
});

document.getElementById('ratingSlider').addEventListener('input', e => {
  document.getElementById('ratingValue').textContent = e.target.value;
});


window.onload = () => {
  loadGenres();

  if (token) {
    fetch('/api/favorites', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(f => {
        favorites = f;
        
        // Если пользователь уже авторизован, скрываем "Войти" и показываем кнопки профиля, избранных и ВЫХОДА
        document.getElementById('authSection').style.display = 'none';
        favoritesBtn.style.display = 'inline-flex';
        profileBtn.style.display = 'inline-flex';
        logoutBtn.style.display = 'inline-flex';
        
        favoritesBtn.onclick = () => location.href = '/favorites';
        favoritesBtn.innerHTML = `Мои избранные (<span id="favCount">${f.length}</span>)`;
      })
      .catch(() => {
        token = '';
        localStorage.removeItem('token');
        // Вызываем logout для сброса UI
        document.getElementById('authSection').style.display = 'flex';
        favoritesBtn.style.display = 'none';
        profileBtn.style.display = 'none';
        logoutBtn.style.display = 'none';
      });
  } else {
    // Если не авторизован - гарантируем что кнопка выхода скрыта
    logoutBtn.style.display = 'none';
  }
  
  // Кнопка "Наверх"
  const backToTopButton = document.getElementById('back-to-top');
  if (backToTopButton) {
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 200) {
        backToTopButton.classList.add('visible');
      } else {
        backToTopButton.classList.remove('visible');
      }
    });
    backToTopButton.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  // Отображаем имя пользователя в кнопке профиля
  const userName = localStorage.getItem('userName');
  if (userName && profileBtn) {
    profileBtn.innerHTML = `<i class="fas fa-user"></i> ${userName}`;
  }
  
  applyFilters(); 
};