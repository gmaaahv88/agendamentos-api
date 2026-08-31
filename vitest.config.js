const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 15000, // testes de integração tocam banco/fila, então dou mais tempo
  },
});
