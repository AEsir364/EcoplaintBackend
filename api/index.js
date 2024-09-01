const express = require('express');
const app = express();

// Usar JSON no express
app.use(express.json());

// Importar e usar as rotas das subpastas
const cadastrar = require('./cadastrar');
const denuncia = require('./denuncia');
const login = require('./login');
const notificacoes = require('./notificacoes');

// Rotas
app.use('/api/cadastrar', cadastrar);
app.use('/api/denuncia', denuncia);
app.use('/api/login', login);
app.use('/api/notificacoes', notificacoes);

module.exports = app;
