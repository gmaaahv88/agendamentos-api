

// --- O que é um teste "unitário"? ---
// É um teste que verifica UMA função isolada, sem depender de banco de dados
// real, rede, ou qualquer outro serviço externo. Pra isso, "mockamos"
// (simulamos) o Prisma: em vez de bater no Postgres de verdade, a gente
// controla exatamente o que ele "devolve", e testamos só a nossa lógica.
//
// vi.mock precisa vir ANTES do require do módulo que usa o prisma,
// porque o Vitest troca o módulo real pelo mock nesse momento.
// Como database.js e notificationQueue.js usam "module.exports = algumaCoisa"
// (CommonJS puro, sem export default), o mock precisa devolver o objeto
// diretamente — sem envolver em { default: ... }.


const prisma = require('../../src/config/database');
 const notificationQueue = require('../../src/queues/notificationQueue');
const { hasConflict } = require('../../src/modules/appointments/appointments.service');

describe('appointments.service - hasConflict', () => {
  beforeEach(() => {
    prisma.appointment.findFirst = vi.fn(); notificationQueue.add = vi.fn();
  });

  it('retorna true quando o Prisma encontra um agendamento sobreposto', async () => {
    // Arrange: simulamos que o banco "encontrou" um conflito
    prisma.appointment.findFirst.mockResolvedValue({ id: 'algum-id-existente' });

    // Act
    const result = await hasConflict(
      'user-1',
      new Date('2026-09-01T10:00:00Z'),
      new Date('2026-09-01T11:00:00Z')
    );

    // Assert
    expect(result).toBe(true);
  });

  it('retorna false quando não há sobreposição', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);

    const result = await hasConflict(
      'user-1',
      new Date('2026-09-01T10:00:00Z'),
      new Date('2026-09-01T11:00:00Z')
    );

    expect(result).toBe(false);
  });

  it('exclui o próprio agendamento da checagem quando ignoreAppointmentId é passado (caso de update)', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);

    await hasConflict(
      'user-1',
      new Date('2026-09-01T10:00:00Z'),
      new Date('2026-09-01T11:00:00Z'),
      'appointment-sendo-editado'
    );

    // Verificamos que o filtro "id: { not: ... }" foi realmente passado pro Prisma
    const callArgs = prisma.appointment.findFirst.mock.calls[0][0];
    expect(callArgs.where.id).toEqual({ not: 'appointment-sendo-editado' });
  });
});
