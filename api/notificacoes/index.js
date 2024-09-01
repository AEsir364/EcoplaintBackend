const express = require('express');
const mysql = require('mysql2');
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

// Endpoint para buscar todas as notificações
app.get('/', (req, res) => {
  const query = `
    SELECT noti_id_notificacao, noti_tipo_notificacao, noti_mensagem, noti_lida, 
           DATE_FORMAT(noti_dt_envio, '%d/%m/%Y %H:%i:%s') AS noti_dt_envio
    FROM notificacoes
    ORDER BY noti_dt_envio DESC`;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar notificações', error: err.message });
    }

    res.status(200).json(results);
  });
});

module.exports = app;
