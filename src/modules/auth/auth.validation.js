const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2, 'Nome precisa ter pelo menos 2 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'Senha precisa ter pelo menos 6 caracteres.'),
});

const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'Senha é obrigatória.'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken é obrigatório.'),
});

module.exports = { registerSchema, loginSchema, refreshSchema };
