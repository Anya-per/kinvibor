const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'movieapp',
  connectionLimit: 10
});

pool.execute('TRUNCATE TABLE users').catch(() => {});
pool.execute('TRUNCATE TABLE favorites').catch(() => {});

const KINOPOISK_KEY = 'e721b832-cbfb-4bec-9e1a-c08b42ec995e';

app.get('/api/genres', (req, res) => {
  const genres = [
    { id: 1, name: "Боевик" }, { id: 2, name: "Приключения" }, { id: 3, name: "Мультфильм" },
    { id: 6, name: "Комедия" }, { id: 7, name: "Криминал" }, { id: 8, name: "Документальный" },
    { id: 10, name: "Драма" }, { id: 13, name: "Семейный" }, { id: 14, name: "Фэнтези" },
    { id: 17, name: "Ужасы" }, { id: 18, name: "Мелодрама" }, { id: 22, name: "Фантастика" },
    { id: 25, name: "Триллер" }
  ];
  res.json(genres);
});

app.get('/api/discover', async (req, res) => {
  const { query, genre, year, rating } = req.query;
  let films = [];

  try {
    if (query?.trim()) {
      // Поиск — как было
      const r = await axios.get(`https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(query)}&page=1`, {
        headers: { 'X-API-KEY': KINOPOISK_KEY }
      });
      films = r.data.films || r.data.items || [];
    } else {
      // ИСПРАВЛЕННЫЙ БЛОК: загружаем фильмы специально для выбранного года
      const yearNum = year ? parseInt(year) : null;
      
      if (yearNum && yearNum < 2025) {
        // Если выбран конкретный год, загружаем фильмы этого года
        console.log(`Загружаем фильмы ${yearNum} года...`);
        
        try {
          // Загружаем несколько страниц для выбранного года
          const yearRequests = [
            axios.get(`https://kinopoiskapiunofficial.tech/api/v2.2/films?order=RATING&type=FILM&yearFrom=${yearNum}&yearTo=${yearNum}&page=1`, { 
              headers: { 'X-API-KEY': KINOPOISK_KEY } 
            }),
            axios.get(`https://kinopoiskapiunofficial.tech/api/v2.2/films?order=RATING&type=FILM&yearFrom=${yearNum}&yearTo=${yearNum}&page=2`, { 
              headers: { 'X-API-KEY': KINOPOISK_KEY } 
            })
          ];
          
          const yearResponses = await Promise.all(yearRequests);
          yearResponses.forEach(r => {
            if (r.data && r.data.items) {
              films = films.concat(r.data.items);
            }
          });
          
          console.log(`Загружено ${films.length} фильмов за ${yearNum} год`);
        } catch (err) {
          console.error(`Ошибка загрузки фильмов за ${yearNum} год:`, err.message);
        }
        
        // Если фильмов мало, добавляем из топов
        if (films.length < 10) {
          console.log('Добавляем фильмы из топов...');
          const topRequests = [
            axios.get('https://kinopoiskapiunofficial.tech/api/v2.2/films/top?type=TOP_250_BEST_FILMS&page=1', { headers: { 'X-API-KEY': KINOPOISK_KEY } }),
            axios.get('https://kinopoiskapiunofficial.tech/api/v2.2/films/top?type=TOP_250_BEST_FILMS&page=2', { headers: { 'X-API-KEY': KINOPOISK_KEY } }),
            axios.get('https://kinopoiskapiunofficial.tech/api/v2.2/films/top?type=TOP_100_POPULAR_FILMS&page=1', { headers: { 'X-API-KEY': KINOPOISK_KEY } })
          ];
          
          const topResponses = await Promise.all(topRequests);
          topResponses.forEach(r => {
            if (r.data && r.data.films) {
              const yearFilms = r.data.films.filter(f => f.year == yearNum);
              films = films.concat(yearFilms);
            }
          });
        }
      } else {
        // Если год не выбран или выбран 2025, загружаем обычные топы
        const requests = [
          axios.get('https://kinopoiskapiunofficial.tech/api/v2.2/films/top?type=TOP_250_BEST_FILMS&page=1', { headers: { 'X-API-KEY': KINOPOISK_KEY } }),
          axios.get('https://kinopoiskapiunofficial.tech/api/v2.2/films/top?type=TOP_250_BEST_FILMS&page=2', { headers: { 'X-API-KEY': KINOPOISK_KEY } }),
          axios.get('https://kinopoiskapiunofficial.tech/api/v2.2/films/top?type=TOP_100_POPULAR_FILMS&page=1', { headers: { 'X-API-KEY': KINOPOISK_KEY } }),
          axios.get('https://kinopoiskapiunofficial.tech/api/v2.2/films/top?type=TOP_AWAIT_FILMS&page=1', { headers: { 'X-API-KEY': KINOPOISK_KEY } })
        ];

        const responses = await Promise.all(requests);
        responses.forEach(r => {
          if (r.data && r.data.films) {
            films = films.concat(r.data.films);
          }
        });
      }

      // Убираем дубли
      const seen = new Set();
      films = films.filter(f => {
        const id = f.filmId || f.kinopoiskId || f.id;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      
      console.log(`Всего фильмов после удаления дублей: ${films.length}`);
    }

    // ФИЛЬТРАЦИЯ
    console.log(`Параметры фильтрации: год=${year}, жанр=${genre}, рейтинг=${rating}`);
    console.log(`Фильмов до фильтрации: ${films.length}`);
    
    // ФИЛЬТРАЦИЯ ПО ЖАНРУ
    if (genre && genre !== 'all') {
      films = films.filter(f => {
        if (!f.genres) return false;
        // Проверяем разные форматы жанров
        if (Array.isArray(f.genres)) {
          return f.genres.some(g => {
            const genreName = g.genre || g.name || '';
            return genreName.toLowerCase().includes(genre.toLowerCase());
          });
        }
        return false;
      });
      console.log(`После фильтрации по жанру "${genre}": ${films.length}`);
    }
    
    // ФИЛЬТРАЦИЯ ПО ГОДУ
    if (year && year !== '2025') {
      const yearNum = parseInt(year);
      films = films.filter(f => f.year == yearNum);
      console.log(`После фильтрации по году ${year}: ${films.length}`);
      
      // Выводим информацию о найденных фильмах
      if (films.length > 0) {
        console.log('Найденные фильмы:');
        films.slice(0, 10).forEach(f => {
          const title = f.nameRu || f.nameEn || 'Без названия';
          const ratingVal = f.ratingKinopoisk || f.rating || f.ratingImdb || 'нет';
          console.log(`  - "${title}" (${f.year}), рейтинг: ${ratingVal}`);
        });
      } else {
        console.log('Фильмов не найдено!');
      }
    }
    
    // ИСПРАВЛЕННАЯ ФИЛЬТРАЦИЯ ПО РЕЙТИНГУ
    if (rating && rating !== '0') {
      const ratingNum = parseFloat(rating);
      console.log(`Фильтруем по рейтингу >= ${ratingNum}`);
      
      films = films.filter(f => {
        // Получаем рейтинг из всех возможных полей
        let filmRating = 0;
        
        // Пробуем разные форматы рейтинга
        if (f.ratingKinopoisk !== undefined && f.ratingKinopoisk !== null) {
          filmRating = parseFloat(f.ratingKinopoisk) || 0;
        } else if (f.rating !== undefined && f.rating !== null) {
          filmRating = parseFloat(f.rating) || 0;
        } else if (f.ratingImdb !== undefined && f.ratingImdb !== null) {
          filmRating = parseFloat(f.ratingImdb) || 0;
        } else if (f.ratingVoteCount && f.ratingVoteCount > 0) {
          // Иногда рейтинг в другом формате
          filmRating = parseFloat(f.ratingVoteCount) || 0;
        }
        
        // Отладочная информация для первых 5 фильмов
        const title = f.nameRu || f.nameEn || 'Без названия';
        if (films.indexOf(f) < 5) {
          console.log(`  Фильм "${title}": ratingKinopoisk=${f.ratingKinopoisk}, rating=${f.rating}, ratingImdb=${f.ratingImdb}, вычисленный=${filmRating}`);
        }
        
        return filmRating >= ratingNum;
      });
      
      console.log(`После фильтрации по рейтингу >= ${ratingNum}: ${films.length}`);
    }

    // ПРЕОБРАЗОВАНИЕ ДАННЫХ ДЛЯ ОТПРАВКИ КЛИЕНТУ
    const mapped = films.map(f => {
      // Вычисляем рейтинг для отображения
      let displayRating = 0;
      if (f.ratingKinopoisk !== undefined && f.ratingKinopoisk !== null) {
        displayRating = parseFloat(f.ratingKinopoisk) || 0;
      } else if (f.rating !== undefined && f.rating !== null) {
        displayRating = parseFloat(f.rating) || 0;
      } else if (f.ratingImdb !== undefined && f.ratingImdb !== null) {
        displayRating = parseFloat(f.ratingImdb) || 0;
      }
      
      return {
        id: f.filmId || f.kinopoiskId || f.id,
        title: f.nameRu || f.nameEn || 'Без названия',
        poster_path: f.posterUrlPreview || f.posterUrl || f.posterUrlPreview,
        vote_average: displayRating,
        release_date: f.year ? `${f.year}-01-01` : '',
        overview: f.description || f.slogan || 'Описание отсутствует',
        year: f.year
      };
    });

    console.log(`Отправляем ${mapped.length} фильмов клиенту`);
    res.json(mapped);
  } catch (err) {
    console.error('Ошибка в /api/discover:', err);
    res.status(500).json({ error: 'Ошибка загрузки фильмов: ' + err.message });
  }
});

app.get('/api/movie/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const r = await axios.get(`https://kinopoiskapiunofficial.tech/api/v2.2/films/${id}`, {
      headers: { 'X-API-KEY': KINOPOISK_KEY }
    });
    const f = r.data;
    res.json({
      id: f.kinopoiskId,
      title: f.nameRu || f.nameEn || 'Без названия',
      poster_path: f.posterUrlPreview || f.posterUrl,
      vote_average: Number(f.ratingKinopoisk || 0),
      release_date: f.year ? `${f.year}-01-01` : '',
      overview: f.description || 'Описание отсутствует',
      genres: f.genres ? f.genres.map(g => ({ name: g.genre })) : []
    });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: 'Фильм не найден' });
  }
});

app.get('/api/movie/:id/videos', async (req, res) => {
  res.json({ results: [] });
});

app.get('/api/movie/:id/trailer', async (req, res) => {
  const { id } = req.params;
  console.log(`🎬 Запрос трейлера для фильма ID: ${id}`);
  
  try {
    const movieRes = await axios.get(`https://kinopoiskapiunofficial.tech/api/v2.2/films/${id}`, {
      headers: { 'X-API-KEY': KINOPOISK_KEY },
      timeout: 5000
    });
    
    const movie = movieRes.data;
    const movieTitle = movie.nameRu || movie.nameEn || 'Фильм';
    const movieYear = movie.year || '';
    
    console.log(`📽 Название: "${movieTitle}" (${movieYear})`);
    
    let searchQuery = '';
    if (movieYear) {
      searchQuery = encodeURIComponent(`${movieTitle} ${movieYear} трейлер`);
    } else {
      searchQuery = encodeURIComponent(`${movieTitle} трейлер`);
    }
    
    const embedUrl = `https://www.youtube.com/embed/videoseries?list=${searchQuery}&rel=0&controls=1&modestbranding=1&autoplay=0`;
    
    res.json({
      success: true,
      movieTitle: movieTitle,
      year: movieYear,
      embedUrl: embedUrl,
      youtubeSearchUrl: `https://www.youtube.com/results?search_query=${searchQuery}`,
      fallbackEmbedUrl: 'https://www.youtube.com/embed/videoseries?list=PLHPTxTxtC0ibV_e8WtKOKK2Ee4yULCkIB'
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    
    res.json({
      success: true,
      movieTitle: 'Трейлеры новинок кино',
      embedUrl: 'https://www.youtube.com/embed/videoseries?list=PLHPTxTxtC0ibV_e8WtKOKK2Ee4yULCkIB&rel=0&controls=1',
      youtubeSearchUrl: 'https://www.youtube.com/results?search_query=трейлеры+новинки+кино',
      isFallback: true
    });
  }
});

// ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ О ФИЛЬМЕ
app.get('/api/movie/:id/extra', async (req, res) => {
  const { id } = req.params;
  console.log(`Загружаем дополнительную информацию для фильма ID: ${id}`);
  
  try {
    // Получаем информацию о фильме
    const movieRes = await axios.get(`https://kinopoiskapiunofficial.tech/api/v2.2/films/${id}`, {
      headers: { 'X-API-KEY': KINOPOISK_KEY }
    });
    
    const movie = movieRes.data;
    
    // Возвращаем данные
    res.json({
      success: true,
      isSeries: movie.type && movie.type.toLowerCase().includes('series'),
      genres: movie.genres || [],
      countries: movie.countries || [],
      actors: [], // Теперь всегда пустой массив
      filmLength: movie.filmLength,
      seriesLength: movie.seriesLength,
      totalSeries: movie.totalSeries,
      ageRating: movie.ratingAgeLimits,
      rating: movie.ratingKinopoisk,
      ratingImdb: movie.ratingImdb,
      description: movie.description,
      slogan: movie.slogan
    });
    
  } catch (err) {
    console.error('Ошибка загрузки дополнительной информации:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      genres: [],
      countries: [],
      actors: [] // Всегда возвращаем пустой массив
    });
  }
});

app.get('/proxy-poster', async (req, res) => {
  try {
    const imagePath = req.query.path;
    
    if (!imagePath) {
      return res.status(400).send('Не указан путь к изображению');
    }

    const imageUrl = imagePath.startsWith('http') ? imagePath : imagePath;
    
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.kinopoisk.ru/'
      }
    });

    res.set({
      'Content-Type': response.headers['content-type'] || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400'
    });

    response.data.pipe(res);

    response.data.on('error', (err) => {
      console.error('Ошибка потока изображения:', err.message);
      res.end();
    });

  } catch (err) {
    console.error('Ошибка прокси изображения:', err.message);
    
    const placeholderUrl = 'https://via.placeholder.com/500x750/f5f5f5/666666?text=Нет+постера';
    
    try {
      const placeholderResponse = await axios({
        method: 'GET',
        url: placeholderUrl,
        responseType: 'stream'
      });
      
      res.set('Content-Type', placeholderResponse.headers['content-type']);
      placeholderResponse.data.pipe(res);
    } catch (placeholderErr) {
      res.status(500).send('Ошибка загрузки изображения');
    }
  }
});

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Заполните поля' });
  
  // Имя по умолчанию — часть email до @
  const defaultName = email.split('@')[0];
  const hashed = await bcrypt.hash(password, 10);
  
  try {
    await pool.execute(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)', 
      [email, hashed, defaultName]
    );
    res.json({ message: 'OK' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.execute('SELECT id, email, name, password FROM users WHERE email = ?', [email]);
  if (!rows[0] || !(await bcrypt.compare(password, rows[0].password))) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const user = rows[0];
  const token = jwt.sign({ id: user.id }, 'supersecret2025', { expiresIn: '7d' });
  const [f] = await pool.execute('SELECT movie_id FROM favorites WHERE user_id = ?', [user.id]);
  res.json({ token, favorites: f.map(x => x.movie_id), name: user.name });
});

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  try {
    const payload = jwt.verify(token, 'supersecret2025');
    req.userId = payload.id;
    next();
  } catch { res.status(401).json({ error: 'Плохой токен' }); }
};

app.get('/api/favorites', auth, async (req, res) => {
  const [rows] = await pool.execute('SELECT movie_id FROM favorites WHERE user_id = ?', [req.userId]);
  res.json(rows.map(r => r.movie_id));
});

app.post('/api/favorites', auth, async (req, res) => {
  const { movieId } = req.body;
  const [ex] = await pool.execute('SELECT 1 FROM favorites WHERE user_id = ? AND movie_id = ?', [req.userId, movieId]);
  if (ex.length) await pool.execute('DELETE FROM favorites WHERE user_id = ? AND movie_id = ?', [req.userId, movieId]);
  else await pool.execute('INSERT INTO favorites (user_id, movie_id) VALUES (?, ?)', [req.userId, movieId]);
  const [newL] = await pool.execute('SELECT movie_id FROM favorites WHERE user_id = ?', [req.userId]);
  res.json(newL.map(r => r.movie_id));
});

// МАРШРУТЫ ДЛЯ ПРОФИЛЯ
app.get('/api/profile', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, name, created_at FROM users WHERE id = ?', 
      [req.userId]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const [favoritesRows] = await pool.execute(
      'SELECT movie_id FROM favorites WHERE user_id = ?',
      [req.userId]
    );
    
    const user = rows[0];
    
    // Форматируем дату для удобства
    const createdAt = new Date(user.created_at);
    const daysSince = Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24));
    
    // Если имя не задано, используем часть email до @
    const displayName = user.name || user.email.split('@')[0];
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: displayName,
        created_at: user.created_at,
        created_at_formatted: createdAt.toLocaleDateString('ru-RU')
      },
      stats: {
        favorites_count: favoritesRows.length,
        days_member: daysSince,
        last_login: 'Сегодня'
      },
      favorites: favoritesRows.map(r => r.movie_id)
    });
  } catch (err) {
    console.error('Ошибка профиля:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера при загрузке профиля' 
    });
  }
});

app.put('/api/profile/update', auth, async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!email) return res.status(400).json({ success: false, error: 'Email обязателен' });
  
  try {
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.execute(
        'UPDATE users SET email = ?, password = ?, name = ? WHERE id = ?',
        [email, hashedPassword, name, req.userId]
      );
    } else {
      await pool.execute(
        'UPDATE users SET email = ?, name = ? WHERE id = ?',
        [email, name, req.userId]
      );
    }
    res.json({ success: true, message: 'Профиль успешно обновлен' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/profile/delete', auth, async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.userId]);
    res.json({ 
      success: true, 
      message: 'Аккаунт успешно удален' 
    });
  } catch (err) {
    console.error('Ошибка удаления аккаунта:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка удаления аккаунта' 
    });
  }
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/favorites', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favorites.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/movie/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'movie.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${port}`);
  console.log(`📍 Локальный доступ: http://localhost:${port}`);
});