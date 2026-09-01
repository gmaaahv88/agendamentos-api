const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

describe('Appointments - condição de corrida (dois agendamentos simultâneos)', () => {
  const testEmail = `race-teste-${Date.now()}@exemplo.com`;
  let accessToken;

  beforeAll(async () => {
    const response = await request(app).post('/auth/register').send({
      name: 'Usuária Race Condition',
      email: testEmail,
      password: 'senha123',
    });
    accessToken = response.body.accessToken;
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    if (user) {
      await prisma.appointment.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
  });

  it('não deve permitir dois agendamentos sobrepostos disparados em paralelo', async () => {
    const payload = {
      title: 'Consulta simultânea',
      startsAt: '2026-11-01T10:00:00.000Z',
      endsAt: '2026-11-01T11:00:00.000Z',
    };

    // O pulo do gato: as duas requisições saem "ao mesmo tempo" via
    // Promise.all, então as duas podem passar pela checagem do
    // hasConflict antes de qualquer uma delas terminar o INSERT.
    // É exatamente o cenário que o Carlos descreveu no comentário do
    // LinkedIn — um teste sequencial (um await por vez) nunca pegaria isso.
    const [responseA, responseB] = await Promise.all([
      request(app)
        .post('/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...payload, title: 'Consulta simultânea A' }),
      request(app)
        .post('/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...payload, title: 'Consulta simultânea B' }),
    ]);

    const statuses = [responseA.status, responseB.status].sort();

    // Uma tem que ter sido criada (201) e a outra rejeitada (409) —
    // nunca as duas com 201, que seria o bug que o Carlos apontou.
    expect(statuses).toEqual([201, 409]);

    // Confirma no banco: só existe 1 agendamento nesse horário, não 2.
    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    const count = await prisma.appointment.count({
      where: {
        userId: user.id,
        startsAt: new Date(payload.startsAt),
        endsAt: new Date(payload.endsAt),
      },
    });
    expect(count).toBe(1);
  });
});
