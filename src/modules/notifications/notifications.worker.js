const { Worker } = require('bullmq');
const connection = require('../../config/redis');
const prisma = require('../../config/database');

// Isso simula o envio de uma notificação (e-mail, WhatsApp, SMS...).
// Em um projeto real, aqui entraria a chamada pra API do Twilio, SendGrid etc.
// Deixei simulado de propósito pra você não precisar de conta paga em
// nenhum serviço externo só pra rodar o projeto.
async function sendNotification(appointmentId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { user: true },
  });

  if (!appointment) {
    throw new Error(`Agendamento ${appointmentId} não encontrado (pode ter sido excluído).`);
  }

  // Simula uma chamada de rede lenta, tipo uma API de e-mail de verdade.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  console.log(
    `[notificação simulada] enviando confirmação para ${appointment.user.email} ` +
      `sobre "${appointment.title}" em ${appointment.startsAt.toISOString()}`
  );

  // Depois de "enviar", atualizamos o status pra CONFIRMED.
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CONFIRMED' },
  });
}

// O Worker fica "escutando" a fila 'notifications' o tempo todo.
// Cada vez que um job novo é adicionado (appointments.service.js faz isso),
// essa função roda automaticamente.
const worker = new Worker(
  'notifications',
  async (job) => {
    if (job.name === 'appointment-created') {
      await sendNotification(job.data.appointmentId);
    }
  },
  {
    connection,
    concurrency: 5, // processa até 5 jobs ao mesmo tempo
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} (${job.name}) concluído.`);
});

// Retry automático: por padrão o BullMQ não tenta de novo sozinho a menos
// que a gente configure "attempts" ao adicionar o job. Aqui só logamos a
// falha — em produção, isso é o lugar pra mandar um alerta (Sentry, etc).
worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} falhou:`, err.message);
});

console.log('👷 Worker de notificações rodando e escutando a fila...');

module.exports = worker;
