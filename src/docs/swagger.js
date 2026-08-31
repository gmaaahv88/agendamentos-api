const swaggerJsdoc = require('swagger-jsdoc');

// swagger-jsdoc lê os comentários "/** @openapi ... */" espalhados nos
// arquivos de rotas (auth.routes.js, appointments.routes.js) e monta a
// especificação OpenAPI automaticamente. Assim a documentação nunca fica
// desatualizada em relação ao código — ela É o código.
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Agendamentos',
      version: '1.0.0',
      description:
        'API com autenticação JWT, prevenção de conflito de horário e notificações assíncronas via fila (BullMQ).',
    },
    servers: [{ url: '/', description: 'Servidor atual' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.js'],
};

module.exports = swaggerJsdoc(options);
