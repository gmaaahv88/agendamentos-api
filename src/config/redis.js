const IORedis = require('ioredis');

// BullMQ precisa de uma conexão Redis "crua" (não é o Redis que guarda dados
// de negócio, é só a estrutura de fila: quem está pendente, quem já rodou etc).
//
// maxRetriesPerRequest: null é uma exigência específica do BullMQ — sem isso,
// a lib pode derrubar a conexão sozinha em cenários de retry. É chato de
// descobrir sozinho, então já deixo certo aqui.
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

module.exports = connection;
