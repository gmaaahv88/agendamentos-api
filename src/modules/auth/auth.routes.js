const { Router } = require('express');
const controller = require('./auth.controller');
const validate = require('../../middlewares/validate');
const { registerSchema, loginSchema, refreshSchema } = require('./auth.validation');

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Cria uma nova conta de usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Marcela Vieira" }
 *               email: { type: string, example: "marcela@exemplo.com" }
 *               password: { type: string, example: "senha123" }
 *     responses:
 *       201: { description: Usuário criado com sucesso }
 *       409: { description: E-mail já cadastrado }
 */
router.post('/register', validate(registerSchema), controller.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Autentica um usuário e retorna os tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login realizado com sucesso }
 *       401: { description: Credenciais inválidas }
 */
router.post('/login', validate(loginSchema), controller.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Gera um novo access token a partir do refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Novo access token gerado }
 *       401: { description: Refresh token inválido ou expirado }
 */
router.post('/refresh', validate(refreshSchema), controller.refresh);

module.exports = router;
