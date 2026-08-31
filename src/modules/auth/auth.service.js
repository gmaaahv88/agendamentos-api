const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');

// --- Por que ACCESS token + REFRESH token, e não só um token? ---
// O access token dura pouco (15min) e é o que vai em cada requisição —
// se vazar, o estrago é limitado no tempo.
// O refresh token dura mais (7 dias) e serve só pra pedir um access token
// novo, sem o usuário ter que logar de novo toda hora.
// É o padrão que qualquer empresa grande vai esperar ver.

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

async function register({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Erro customizado simples. O errorHandler central (middlewares/errorHandler.js)
    // sabe ler o "statusCode" e devolver a resposta HTTP certa.
    const error = new Error('Já existe um usuário com esse e-mail.');
    error.statusCode = 409; // 409 Conflict é o código HTTP correto pra "já existe"
    throw error;
  }

  // NUNCA salvar senha em texto puro. bcrypt "hasheia" de um jeito que não dá
  // pra reverter — só dá pra comparar se uma senha bate com o hash salvo.
  // O "10" é o custo do hash (mais alto = mais seguro e mais lento).
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Propositalmente uso a MESMA mensagem de erro pra "email não existe" e
  // "senha errada". Se a mensagem fosse diferente, um atacante conseguiria
  // descobrir quais e-mails estão cadastrados só tentando login. Isso é
  // um detalhe pequeno que mostra atenção a segurança.
  const invalidCredentialsError = () => {
    const error = new Error('E-mail ou senha inválidos.');
    error.statusCode = 401;
    return error;
  };

  if (!user) throw invalidCredentialsError();

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) throw invalidCredentialsError();

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    const error = new Error('Refresh token inválido ou expirado.');
    error.statusCode = 401;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    const error = new Error('Usuário não encontrado.');
    error.statusCode = 401;
    throw error;
  }

  // Gera só um access token novo — o refresh token continua o mesmo até expirar.
  return { accessToken: generateAccessToken(user) };
}

module.exports = { register, login, refresh, generateAccessToken, generateRefreshToken };
