
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

describe('Appointments - CRUD e regra de conflito de horário', () => {
  const testEmail = `agenda-teste-${Date.now()}@exemplo.com`;
  let accessToken;

  // beforeAll roda UMA vez antes de todos os testes deste arquivo — usamos
  // pra criar um usuário e já deixar logado, já que toda rota de agendamento
  // exige autenticação.
  beforeAll(async () => {
    const response = await request(app).post('/auth/register').send({
      name: 'Usuária de Agenda',
      email: testEmail,
      password: 'senha123',
    });
    accessToken = response.body.accessToken;
  });

  afterAll(async () => {
    // Limpa tudo que esse teste criou, pra não sujar o banco de teste
    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    if (user) {
      await prisma.appointment.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
  });

  it('bloqueia a rota sem token (401)', async () => {
    const response = await request(app).get('/appointments');
    expect(response.status).toBe(401);
  });

  it('cria um agendamento com sucesso', async () => {
    const response = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Consulta inicial',
        startsAt: '2026-10-01T14:00:00.000Z',
        endsAt: '2026-10-01T15:00:00.000Z',
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('PENDING');
  });

  it('rejeita um segundo agendamento que sobrepõe o horário do primeiro (409)', async () => {
    // Esse horário (14:30-15:30) cruza com o agendamento criado no teste
    // anterior (14:00-15:00) — é exatamente a regra de negócio que queremos provar.
    const response = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Consulta conflitante',
        startsAt: '2026-10-01T14:30:00.000Z',
        endsAt: '2026-10-01T15:30:00.000Z',
      });

    expect(response.status).toBe(409);
  });

  it('permite um agendamento em horário adjacente, sem sobreposição real', async () => {
    // Começa exatamente quando o primeiro termina (15:00) — não deve conflitar.
    const response = await request(app)
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Consulta seguinte',
        startsAt: '2026-10-01T15:00:00.000Z',
        endsAt: '2026-10-01T16:00:00.000Z',
      });

    expect(response.status).toBe(201);
  });

  it('lista os agendamentos do usuário com paginação', async () => {
    const response = await request(app)
      .get('/appointments?page=1&pageSize=10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(2);
  });
});
