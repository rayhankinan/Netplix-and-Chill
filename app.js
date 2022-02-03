require('dotenv').config()

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const XMLHttpRequest = require('xhr2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const session = require('express-session');

const app = express();
const saltRounds = parseInt(process.env.SALTROUND);
const port = parseInt(process.env.PORT);

app.use(express.static('public'));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.use(cors({
    origin: `http://localhost:${port}`
}));

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true
}));

const connection = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
});

const apiKey = process.env.API_KEY;

const requireLogin = (req, res, next) => {
    jwt.verify(req.session.jwtToken, process.env.JWT_TOKEN, (jwtError, jwtDecoded) => {
        if (jwtError) {
            res.redirect('/login');
        } else {
            req.session.user = jwtDecoded; // GUNAKAN INI UNTUK VALIDASI NAMA DKK
            next();
        }
    });
};

// REGISTRATION
app.get('/', (req, res) => {
    req.session.jwtToken = null;
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login.ejs', {successLogin: true})
})

app.get('/login/fail', (req, res) => {
    res.render('login.ejs', {successLogin: false});
});

app.post('/process_login', (req, res) => {
    connection.query('SELECT password FROM users WHERE username = ?', [req.body.username], (databaseError, databaseResults) => {
        if (databaseResults.length !== 0) {
            bcrypt.compare(req.body.password, databaseResults[0].password, (hashErr, hashRes) => {
                jwt.sign({username: req.body.username, password: databaseResults[0].password}, process.env.JWT_TOKEN, {expiresIn: '20m'}, (jwtError, jwtToken) => {
                    if (hashRes) {
                        req.session.jwtToken = jwtToken;
                        res.redirect('/top');
                    } else {
                        res.redirect('/login/fail');
                    }
                });
            });
        } else {
            res.redirect('/login/fail');
        }
    });
});

app.get('/register', (req, res) => {
    res.render('register.ejs', {successRegister: true});
});

app.get('/register/fail', (req, res) => {
    res.render('register.ejs', {successRegister: false});
});

app.post('/process_register', (req, res) => {
    connection.query('SELECT username FROM users WHERE username = ?', [req.body.username], (databaseError, databaseResults) => {
        if (databaseResults.length === 0) {
            bcrypt.hash(req.body.password, saltRounds, (hashErr, hashRes) => {
                connection.query('INSERT INTO users (username, password) VALUES (?, ?)', [req.body.username, hashRes], (databaseError, databaseResults) => {
                    res.redirect('/login');
                });
            });
        } else {
            res.redirect('/register/fail');
        }
    });
});

// MIDDLEWARE
app.all('/*', requireLogin, (req, res, next) => {
    next();
});

// WATCHLIST
app.get('/top', (req, res) => {
    res.render('top.ejs');
});

app.get('/explore/:id', (req, res) => {
    connection.query('SELECT movies.movie_id FROM movies INNER JOIN users ON movies.user_id = users.id WHERE users.username = ?', [req.params.username], (databaseError, databaseResults) => {
        const requestURL = `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&page=${req.params.id}`;
        const request = new XMLHttpRequest();
        request.open('GET', requestURL);
        request.responseType = 'json';
        request.send();

        request.onload = () => {
            const results = request.response.results;
            const totalPages = request.response.total_pages;
            const totalResults = request.response.total_results;
            res.render('explore.ejs', {pages: req.params.id, movies: results, maxPages: totalPages, maxResults: totalResults, watchList: Object.values(JSON.parse(JSON.stringify(databaseResults)))});
        }
    });
});

app.get('/detail/:page_id/:id', (req, res) => {
    connection.query('SELECT movies.movie_id FROM movies INNER JOIN users ON movies.user_id = users.id WHERE users.username = ?', [req.params.username], (databaseError, databaseResults) => {
        const requestURL = `https://api.themoviedb.org/3/movie/${req.params.id}?api_key=${apiKey}`;
        const request = new XMLHttpRequest();
        request.open('GET', requestURL);
        request.responseType = 'json';
        request.send();
    
        request.onload = () => {
            const results = request.response;
            res.render('detail.ejs', {pages: req.params.page_id, movie: results, watchList: Object.values(JSON.parse(JSON.stringify(databaseResults)))});
        }
    });
});

app.post('/process_search', (req, res) => {
    res.redirect(`/search/${req.body.query}/1`);
});

app.get('/search/:query/:id', (req, res) => {
    connection.query('SELECT movies.movie_id FROM movies INNER JOIN users ON movies.user_id = users.id WHERE users.username = ?', [req.params.username], (databaseError, databaseResults) => {
        const requestURL = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${req.params.query}&page=${req.params.id}`;
        const request = new XMLHttpRequest();
        request.open('GET', requestURL);
        request.responseType = 'json';
        request.send();

        request.onload = () => {
            const results = request.response.results;
            const totalPages = request.response.total_pages;
            const totalResults = request.response.total_results;
            res.render('search.ejs', {pages: req.params.id, movies: results, maxPages: totalPages, maxResults: totalResults, query: req.params.query, watchList: Object.values(JSON.parse(JSON.stringify(databaseResults)))});
        }
    });
});

app.get('/result/:query/:page_id/:id', (req, res) => {
    connection.query('SELECT movies.movie_id FROM movies INNER JOIN users ON movies.user_id = users.id WHERE users.username = ?', [req.params.username], (databaseError, databaseResults) => {
        const requestURL = `https://api.themoviedb.org/3/movie/${req.params.id}?api_key=${apiKey}`;
        const request = new XMLHttpRequest();
        request.open('GET', requestURL);
        request.responseType = 'json';
        request.send();

        request.onload = () => {
            const results = request.response;
            res.render('result.ejs', {pages: req.params.page_id, movie: results, query: req.params.query, watchList: Object.values(JSON.parse(JSON.stringify(databaseResults)))});
        }
    });
});

app.post('/add/:id', (req, res) => {
    const requestURL = `https://api.themoviedb.org/3/movie/${req.params.id}?api_key=${apiKey}`;
    const request = new XMLHttpRequest();
    request.open('GET', requestURL);
    request.responseType = 'json';
    request.send();

    request.onload = () => {
        const results = request.response;
        connection.query(
            'SELECT id FROM users WHERE username = ?',
            [req.params.username],
            (databaseError, databaseResults) => {
                connection.query(
                    'INSERT INTO movies (user_id, movie_id, movie_title, img_link) VALUES (?, ?, ?, ?)',
                    [databaseResults[0].id, req.params.id, results.title, results.poster_path],
                    (databaseError, databaseResults) => {
                        res.redirect(req.body.dir);
                    }
                );
            }
        );
    }
});

app.post('/remove/:id', (req, res) => {
    connection.query(
        'SELECT id FROM users WHERE username = ?',
        [req.params.username],
        (databaseError, databaseResults) => {
            connection.query(
                'DELETE FROM movies WHERE user_id = ? AND movie_id = ?',
                [databaseResults[0].id, req.params.id],
                (databaseError, databaseResults) => {
                    res.redirect(req.body.dir);
                }
            );
        }
    );
});

app.get('/watchlist', (req, res) => {
    connection.query('SELECT movies.movie_id, movies.movie_title, movies.img_link FROM movies INNER JOIN users ON movies.user_id = users.id WHERE users.username = ?', [req.params.username], (databaseError, databaseResults) => {
        res.render('watchlist.ejs', {movies: JSON.parse(JSON.stringify(databaseResults))});
    });
});

app.get('/view/:id', (req, res) => {
    connection.query('SELECT movies.movie_id, movies.movie_title, movies.img_link FROM movies INNER JOIN users ON movies.user_id = users.id WHERE users.username = ?', [req.params.username], (databaseError, databaseResults) => {
        const requestURL = `https://api.themoviedb.org/3/movie/${req.params.id}?api_key=${apiKey}`;
        const request = new XMLHttpRequest();
        request.open('GET', requestURL);
        request.responseType = 'json';
        request.send();
    
        request.onload = () => {
            const results = request.response;
            res.render('view.ejs', {movie: results, watchList: Object.values(JSON.parse(JSON.stringify(databaseResults)))});
        }
    });
});

// ERROR HANDLING
app.get('*', (req, res) => {
    res.send('Invalid URL');
});

// LISTEN PORT
app.listen(port, () => {
    console.log(`App is running on http://localhost:${port}`);
});