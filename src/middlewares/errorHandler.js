// Esse middleware tem 4 parâmetros (err, req, res, next) — é assim que o
// Express reconhece que ele é um "error handler" e não um middleware normal.
// Ele precisa ser o ÚLTIMO "app.use()" no app.js, depois de todas as rotas.
//
// Qualquer controller que chame "next(err)" cai direto aqui, num lugar só.
// Isso evita ficar copiando "res.status(500).json(...)" em cada controller.
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  // Erros inesperados (statusCode 500) a gente loga completo no console,
  // pra conseguir debugar depois. Erros "esperados" (400, 404, 409...) não
  // precisam de tanto alarde, já que são parte do fluxo normal da aplicação.
  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: err.message || 'Erro interno do servidor.',
  });
}

module.exports = errorHandler;
