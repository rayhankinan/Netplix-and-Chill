const express = require('express');
const mysql = require('mysql');
const XMLHttpRequest = require('xhr2');

const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'movie_app'
});

const apiKey = 'e594e183732ce702441be69ad41dab9c';

app.get('/', (req, res) => {
    res.render('top.ejs');
});

app.get('/explore/:id', (req, res) => {
    connection.query('SELECT movie_id FROM movies', (databaseError, databaseResults) => {
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
    connection.query('SELECT movie_id FROM movies', (databaseError, databaseResults) => {
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

app.post('/process', (req, res) => {
    res.redirect(`/search/${req.body.query}/1`);
});

app.get('/search/:query/:id', (req, res) => {
    connection.query('SELECT movie_id FROM movies', (databaseError, databaseResults) => {
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
    connection.query('SELECT movie_id FROM movies', (databaseError, databaseResults) => {
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
            'INSERT INTO movies (movie_id, movie_title, img_link) VALUES (?, ?, ?)',
            [req.params.id, results.title, results.poster_path],
            (databaseError, databaseResults) => {
                res.redirect(req.body.dir);
            }
        );
    }
});

app.post('/remove/:id', (req, res) => {
    connection.query(
        'DELETE FROM movies WHERE movie_id = ?',
        [req.params.id],
        (databaseError, databaseResults) => {
            res.redirect(req.body.dir);
        }
    );
});

app.get('/watchlist', (req, res) => {
    connection.query('SELECT * FROM movies', (databaseError, databaseResults) => {
        res.render('watchlist.ejs', {movies: JSON.parse(JSON.stringify(databaseResults))});
    });
});

app.get('/view/:id', (req, res) => {
    connection.query('SELECT * FROM movies', (databaseError, databaseResults) => {
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

app.listen(3000);