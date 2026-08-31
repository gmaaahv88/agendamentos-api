const { z } = require('zod');

const createAppointmentSchema = z
  .object({
    title: z.string().min(2, 'Título precisa ter pelo menos 2 caracteres.'),
    startsAt: z.string().datetime({ message: 'startsAt precisa ser uma data ISO válida.' }),
    endsAt: z.string().datetime({ message: 'endsAt precisa ser uma data ISO válida.' }),
  })
  // .refine() permite validar regras que dependem de mais de um campo ao
  // mesmo tempo — aqui, garantir que o horário final é depois do inicial.
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: 'endsAt precisa ser depois de startsAt.',
    path: ['endsAt'],
  });

const updateAppointmentSchema = z.object({
  title: z.string().min(2).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
});

module.exports = { createAppointmentSchema, updateAppointmentSchema };
