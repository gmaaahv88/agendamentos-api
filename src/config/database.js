const { PrismaClient } = require('@prisma/client');

// Por que um "singleton" (uma única instância reaproveitada)?
// Se cada arquivo criasse seu próprio "new PrismaClient()", em desenvolvimento
// (com nodemon reiniciando o processo várias vezes) você acabaria abrindo
// dezenas de conexões com o banco e recebendo erros de "too many connections".
// Criando uma vez aqui e importando esse mesmo objeto em todo lugar, resolve.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
