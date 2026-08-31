require('dotenv').config();

// Esse arquivo é um processo TOTALMENTE separado do server.js.
// Em produção, você rodaria os dois em paralelo (ex: dois processos no PM2,
// ou dois containers no Docker) — o server.js cuida de HTTP, o worker.js
// cuida de processar a fila. Se o worker cair, a API continua respondendo
// (só as notificações ficam acumuladas até o worker voltar).
require('./modules/notifications/notifications.worker');
