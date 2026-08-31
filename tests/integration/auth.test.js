
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

// --- Diferença pra o teste unitário: aqui é um teste de "INTEGRAÇÃO". ---
// Ele bate num banco de dados de teste de verdade (não mockado) e faz
// requisições HTTP reais contra o "app" via supertest. É mais lento que um
// teste unitário, mas prova que as peças (rota + validação + service + banco)
// funcionam juntas de ponta a ponta.
//
// IMPORTANTE: rode isso contra um banco de TESTE, nunca contra produção.
// Configure um DATABASE_URL separado (ex: agendamentos_test_db) antes de rodar.

describe('Auth - fluxo de registro e login', () => {
  const testEmail = `teste-${Date.now()}@exemplo.com`;

  // Limpa o usuário de teste antes de cada teste, pra um teste não
  // "vazar" estado pro próximo (ex: erro de "email já existe" em série).
  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it('registra um novo usuário e retorna tokens', async () => {
    const response = await request(app).post('/auth/register').send({
      name: 'Usuária de Teste',
      email: testEmail,
      password: 'senha123',
    });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.user.email).toBe(testEmail);
    // A senha (hash) NUNCA deve vazar na resposta da API
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('rejeita registro com e-mail duplicado (409)', async () => {
    await request(app).post('/auth/register').send({
      name: 'Primeira',
      email: testEmail,
      password: 'senha123',
    });

    const response = await request(app).post('/auth/register').send({
      name: 'Segunda',
      email: testEmail,
      password: 'outrasenha',
    });

    expect(response.status).toBe(409);
  });

  it('rejeita registro com dados inválidos (400)', async () => {
    const response = await request(app).post('/auth/register').send({
      name: 'A', // muito curto
      email: 'nao-e-um-email',
      password: '123', // muito curta
    });

    expect(response.status).toBe(400);
    expect(response.body.details).toBeDefined();
  });

  it('faz login com credenciais corretas', async () => {
    await request(app).post('/auth/register').send({
      name: 'Usuária de Teste',
      email: testEmail,
      password: 'senha123',
    });

    const response = await request(app).post('/auth/login').send({
      email: testEmail,
      password: 'senha123',
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
  });

  it('rejeita login com senha errada (401)', async () => {
    await request(app).post('/auth/register').send({
      name: 'Usuária de Teste',
      email: testEmail,
      password: 'senha123',
    });

    const response = await request(app).post('/auth/login').send({
      email: testEmail,
      password: 'senhaerrada',
    });

    expect(response.status).toBe(401);
  });
});
