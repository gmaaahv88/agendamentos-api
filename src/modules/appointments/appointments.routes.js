const { Router } = require('express');
const controller = require('./appointments.controller');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../auth/auth.middleware');
const { createAppointmentSchema, updateAppointmentSchema } = require('./appointments.validation');

const router = Router();

// router.use aplica o middleware pra TODAS as rotas abaixo dessa linha.
// Ou seja: nenhuma rota de agendamento funciona sem token válido.
router.use(authenticate);

/**
 * @openapi
 * /appointments:
 *   post:
 *     tags: [Appointments]
 *     summary: Cria um novo agendamento
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, startsAt, endsAt]
 *             properties:
 *               title: { type: string, example: "Consulta de retorno" }
 *               startsAt: { type: string, format: date-time }
 *               endsAt: { type: string, format: date-time }
 *     responses:
 *       201: { description: Agendamento criado }
 *       409: { description: Conflito de horário }
 *   get:
 *     tags: [Appointments]
 *     summary: Lista os agendamentos do usuário logado (paginado)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: Lista de agendamentos }
 */
router.post('/', validate(createAppointmentSchema), controller.create);
router.get('/', controller.list);

/**
 * @openapi
 * /appointments/{id}:
 *   get:
 *     tags: [Appointments]
 *     summary: Busca um agendamento por id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Agendamento encontrado }
 *       404: { description: Não encontrado }
 *   patch:
 *     tags: [Appointments]
 *     summary: Atualiza um agendamento
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Agendamento atualizado }
 *   delete:
 *     tags: [Appointments]
 *     summary: Remove um agendamento
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Removido com sucesso }
 */
router.get('/:id', controller.getById);
router.patch('/:id', validate(updateAppointmentSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
