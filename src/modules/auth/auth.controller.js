const authService = require('./auth.service');

// Controllers ficam "finos" de propósito: recebem a requisição, chamam o
// service (onde mora a regra de negócio de verdade) e devolvem a resposta.
// Isso facilita muito testar o service sozinho, sem precisar simular requisições HTTP.

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err); // manda pro errorHandler central, não trata o erro aqui
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh };
