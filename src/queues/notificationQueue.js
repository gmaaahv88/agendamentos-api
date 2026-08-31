const { Queue } = require('bullmq');
const connection = require('../config/redis');

// Uma "fila" é uma lista de tarefas pra serem processadas depois, em segundo
// plano. Por que não simplesmente enviar a notificação na hora, dentro do
// próprio request de criar agendamento?
//
// Porque enviar e-mail/WhatsApp pode ser lento ou falhar (a API de terceiro
// pode estar fora do ar). Se isso acontecesse DENTRO da requisição, o usuário
// ficaria esperando, e um erro no envio quebraria a criação do agendamento
// inteira — mesmo o agendamento em si tendo sido salvo com sucesso.
//
// Com fila: a API responde rápido ("agendamento criado!") e a notificação
// é processada por um worker separado, que pode até tentar de novo se falhar.
const notificationQueue = new Queue('notifications', { connection });

module.exports = notificationQueue;
