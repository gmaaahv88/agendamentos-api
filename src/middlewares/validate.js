// Middleware "de fábrica": recebe um schema do Zod e devolve um middleware
// pronto pra validar o req.body contra aquele schema.
//
// Por que validar assim, e não checar "if (!name) ..." dentro do controller?
// Porque centraliza a regra num lugar só, os erros ficam padronizados,
// e o controller fica limpo, só cuidando da lógica de negócio.
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // .flatten() transforma o erro do Zod num formato fácil de ler no front
      return res.status(400).json({
        error: 'Dados inválidos.',
        details: result.error.flatten().fieldErrors,
      });
    }

    // Substitui o body pelos dados já validados/tipados
    req.body = result.data;
    next();
  };
}

module.exports = validate;
