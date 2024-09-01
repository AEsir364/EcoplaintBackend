const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const app = express();

const secretKey = process.env.SECRET_KEY;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

const authenticateJWT = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(403).send('Acesso negado.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).send('Token inválido.');
  }
};

app.post('/', authenticateJWT, upload.array('imagens', 4), async (req, res) => {
  const connection = db;
  connection.beginTransaction(err => {
    if (err) {
      return res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }

    try {
      const { opcaoSelecionada, localizacao, manterAnonimo } = req.body;
      const imagensParaSalvar = req.files.map(file => file.buffer);

      if (!opcaoSelecionada || !localizacao || imagensParaSalvar.length === 0) {
        return res.status(400).json({ message: 'Dados faltando', data: req.body });
      }

      const userId = manterAnonimo === 'true' || manterAnonimo === true ? null : req.user.usua_id_usuario;

      const denunciaQuery = `
        INSERT INTO denuncias (denu_id_usuario, denu_imagem, denu_categoria, denu_localizacao, denu_manter_anonimo, denu_dt_denuncia)
        VALUES (?, ?, ?, ?, ?, NOW())`;

      connection.query(denunciaQuery, [userId, imagensParaSalvar[0], opcaoSelecionada, localizacao, manterAnonimo ? 1 : 0], (err, results) => {
        if (err) {
          return connection.rollback(() => {
            res.status(500).json({ message: 'Erro ao registrar denúncia', error: err.message });
          });
        }

        const denunciaId = results.insertId;

        const notiQuery = `
          INSERT INTO notificacoes (noti_id_usuario, noti_tipo_notificacao, noti_mensagem, noti_lida, noti_dt_envio)
          VALUES (?, ?, ?, ?, NOW())`;

        const mensagemNotificacao = `Denúncia enviada: ${opcaoSelecionada} em ${localizacao}`;

        connection.query(notiQuery, [userId, 'Push Notification', mensagemNotificacao, false], (err, result) => {
          if (err) {
            return connection.rollback(() => {
              res.status(500).json({ message: 'Erro ao registrar notificação', error: err.message });
            });
          }

          connection.commit(err => {
            if (err) {
              return connection.rollback(() => {
                res.status(500).json({ message: 'Erro ao confirmar a transação', error: err.message });
              });
            }

            res.status(200).json({ message: 'Denúncia enviada e notificação registrada com sucesso' });
          });
        });
      });

    } catch (error) {
      return connection.rollback(() => {
        res.status(500).json({ message: 'Erro no servidor', error: error.message });
      });
    }
  });
});

module.exports = app;
