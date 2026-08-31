const prisma = require('../../config/database');
const notificationQueue = require('../../queues/notificationQueue');

// --- A regra de negócio mais importante do projeto: não deixar dois
// agendamentos do mesmo usuário se sobreporem no tempo. ---
//
// A matemática de "dois intervalos se sobrepõem" é sempre a mesma fórmula:
//   intervaloA.inicio < intervaloB.fim  E  intervaloA.fim > intervaloB.inicio
// Se as duas condições forem verdadeiras ao mesmo tempo, eles se cruzam.
async function hasConflict(userId, startsAt, endsAt, ignoreAppointmentId = null) {
  const conflict = await prisma.appointment.findFirst({
    where: {
      userId,
      status: { not: 'CANCELLED' }, // agendamento cancelado não conta como conflito
      id: ignoreAppointmentId ? { not: ignoreAppointmentId } : undefined,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });

  return Boolean(conflict);
}

async function create(userId, data) {
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);

  if (await hasConflict(userId, startsAt, endsAt)) {
    const error = new Error('Já existe um agendamento seu nesse horário.');
    error.statusCode = 409;
    throw error;
  }

  const appointment = await prisma.appointment.create({
    data: { title: data.title, startsAt, endsAt, userId },
  });

  // Aqui é o pulo do gato do projeto: em vez de enviar a notificação agora
  // (o que deixaria a resposta lenta), só adicionamos um "job" na fila.
  // O worker (src/modules/notifications/notifications.worker.js) que vai
  // processar isso, rodando como um processo separado.
  await notificationQueue.add('appointment-created', {
    appointmentId: appointment.id,
    userId,
  });

  return appointment;
}

async function list(userId, { page = 1, pageSize = 10, from, to } = {}) {
  const where = {
    userId,
    ...(from || to
      ? {
          startsAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  // Paginação: sem isso, um usuário com 5000 agendamentos derrubaria a
  // resposta da API. Empresa grande SEMPRE espera ver paginação numa listagem.
  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

async function getById(userId, id) {
  const appointment = await prisma.appointment.findFirst({ where: { id, userId } });
  if (!appointment) {
    const error = new Error('Agendamento não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  return appointment;
}

async function update(userId, id, data) {
  const existing = await getById(userId, id); // já lança 404 se não existir

  const startsAt = data.startsAt ? new Date(data.startsAt) : existing.startsAt;
  const endsAt = data.endsAt ? new Date(data.endsAt) : existing.endsAt;

  if (data.startsAt || data.endsAt) {
    if (await hasConflict(userId, startsAt, endsAt, id)) {
      const error = new Error('Esse novo horário conflita com outro agendamento seu.');
      error.statusCode = 409;
      throw error;
    }
  }

  return prisma.appointment.update({
    where: { id },
    data: { ...data, startsAt, endsAt },
  });
}

async function remove(userId, id) {
  await getById(userId, id); // garante que existe e pertence ao usuário
  await prisma.appointment.delete({ where: { id } });
}

module.exports = { create, list, getById, update, remove, hasConflict };
