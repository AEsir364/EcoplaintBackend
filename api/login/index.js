const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

const secretKey = process.env.SECRET_KEY;

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

app.post('/', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).send('E-mail e senha são obrigatórios.');
  }

  const query = 'SELECT * FROM usuarios WHERE usua_email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) {
      return res.status(500).send('Erro no servidor');
    }

    if (results.length === 0) {
      return res.status(401).send('E-mail ou senha incorretos.');
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(senha, user.usua_senha);

    if (!isPasswordValid) {
      return res.status(401).send('E-mail ou senha incorretos.');
    }

    const token = jwt.sign({ usua_id_usuario: user.usua_id_usuario }, secretKey, { expiresIn: '1h' });
    res.status(200).json({ message: 'Login bem-sucedido!', token });
  });
});

module.exports = app;
