const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const authRoutes = require('./modules/auth/auth.routes');
const appointmentsRoutes = require('./modules/appointments/appointments.routes');
const errorHandler = require('./middlewares/errorHandler');

// Por que separar "app.js" (monta o Express) de "server.js" (dá o listen)?
// Porque nos testes (tests/integration/*.test.js), o supertest precisa só
// do "app" pra simular requisições — ele NÃO precisa que uma porta real
// esteja aberta. Se app.listen() estivesse aqui junto, os testes abririam
// uma porta de verdade toda vez, o que é lento e pode dar conflito de porta.
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/auth', authRoutes);
app.use('/appointments', appointmentsRoutes);

// Rota "catch-all" pra qualquer caminho que não bateu com nenhuma rota acima.
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// Precisa ser o ÚLTIMO app.use(). Middlewares de erro só funcionam se
// estiverem depois de tudo que pode gerar um erro.
app.use(errorHandler);

module.exports = app;
