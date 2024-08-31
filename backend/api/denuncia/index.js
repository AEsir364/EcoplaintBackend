const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const app = express();

const secretKey = process.env.SECRET_KEY || 'secreta';

// Configuração do multer para upload de arquivos em memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.json());

// Conexão com o banco de dados MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'ecoplaint',
  port: process.env.DB_PORT || 3306
});

db.connect(err => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conectado ao banco de dados MySQL');
});

// Middleware de autenticação para verificar JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    console.log('Token não fornecido.');
    return res.status(403).send('Acesso negado.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('Erro ao verificar o token:', error.message);
    res.status(401).send('Token inválido.');
  }
};

// Endpoint para envio de denúncia com múltiplas imagens
app.post('/api/denuncia', authenticateJWT, upload.array('imagens', 4), async (req, res) => {
  const connection = db;  // Usa a conexão do MySQL existente
  connection.beginTransaction(err => {
    if (err) {
      console.error('Erro ao iniciar a transação:', err);
      return res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }

    try {
      const { opcaoSelecionada, localizacao, manterAnonimo } = req.body;
      const imagensParaSalvar = req.files.map(file => file.buffer);

      if (!opcaoSelecionada || !localizacao || imagensParaSalvar.length === 0) {
        return res.status(400).json({ message: 'Dados faltando', data: req.body });
      }

      const userId = manterAnonimo === 'true' || manterAnonimo === true ? null : req.user.usua_id_usuario;

      console.log('Dados da denúncia:', { userId, opcaoSelecionada, localizacao, manterAnonimo });

      const denunciaQuery = `
        INSERT INTO denuncias (denu_id_usuario, denu_imagem, denu_categoria, denu_localizacao, denu_manter_anonimo, denu_dt_denuncia)
        VALUES (?, ?, ?, ?, ?, NOW())`;

      connection.query(denunciaQuery, [userId, imagensParaSalvar[0], opcaoSelecionada, localizacao, manterAnonimo ? 1 : 0], (err, results) => {
        if (err) {
          console.error('Erro ao registrar denúncia:', err);
          return connection.rollback(() => {
            res.status(500).json({ message: 'Erro ao registrar denúncia', error: err.message });
          });
        }

        const denunciaId = results.insertId;
        console.log('Denúncia registrada com ID:', denunciaId);

        const notiQuery = `
          INSERT INTO notificacoes (noti_id_usuario, noti_tipo_notificacao, noti_mensagem, noti_lida, noti_dt_envio)
          VALUES (?, ?, ?, ?, NOW())`;

        const mensagemNotificacao = `Denúncia enviada: ${opcaoSelecionada} em ${localizacao}`;
        console.log('Tentando inserir notificação com a mensagem:', mensagemNotificacao);

        connection.query(notiQuery, [userId, 'Push Notification', mensagemNotificacao, false], (err, result) => {
          if (err) {
            console.error('Erro ao registrar notificação:', err);
            return connection.rollback(() => {
              res.status(500).json({ message: 'Erro ao registrar notificação', error: err.message });
            });
          }

          connection.commit(err => {
            if (err) {
              console.error('Erro ao confirmar a transação:', err);
              return connection.rollback(() => {
                res.status(500).json({ message: 'Erro ao confirmar a transação', error: err.message });
              });
            }

            res.status(200).json({ message: 'Denúncia enviada e notificação registrada com sucesso' });
          });
        });
      });

    } catch (error) {
      console.error('Erro ao processar a denúncia:', error);
      return connection.rollback(() => {
        res.status(500).json({ message: 'Erro no servidor', error: error.message });
      });
    }
  });
});

module.exports = app;
