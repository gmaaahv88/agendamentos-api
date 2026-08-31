const jwt = require('jsonwebtoken');

// Esse middleware "protege" uma rota. Ele roda ANTES do controller e decide
// se a requisição pode continuar ou não.
//
// Uso nas rotas assim: router.get('/appointments', authenticate, controller.list)
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization; // formato esperado: "Bearer <token>"

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acesso não enviado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    // Anexa os dados do usuário na própria requisição, pra qualquer
    // controller depois poder usar "req.user.id" sem consultar o banco de novo.
    req.user = { id: payload.sub, role: payload.role };
    next(); // libera a passagem pro próximo middleware/controller
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

// Middleware extra pra rotas só de admin (não uso muito neste projeto,
// mas deixo pronto porque é comum pedirem isso em entrevista técnica).
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
