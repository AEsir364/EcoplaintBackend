const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect(err => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conectado ao banco de dados MySQL');
});

app.post('/', async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).send('Dados incompletos.');
  }

  try {
    const hashedPassword = await bcrypt.hash(senha, 10);
    const query = 'INSERT INTO usuarios (usua_nome, usua_email, usua_senha) VALUES (?, ?, ?)';
    db.query(query, [nome, email, hashedPassword], (err, results) => {
      if (err) {
        return res.status(500).send({ error: 'Erro ao cadastrar usuário', details: err.message });
      }
      res.status(200).send('Usuário cadastrado com sucesso!');
    });
  } catch (error) {
    res.status(500).send('Erro no servidor');
  }
});

module.exports = app;
