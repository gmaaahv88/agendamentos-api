const service = require('./appointments.service');

async function create(req, res, next) {
  try {
    const appointment = await service.create(req.user.id, req.body);
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { page, pageSize, from, to } = req.query;
    const result = await service.list(req.user.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      from,
      to,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const appointment = await service.getById(req.user.id, req.params.id);
    res.status(200).json(appointment);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const appointment = await service.update(req.user.id, req.params.id, req.body);
    res.status(200).json(appointment);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.user.id, req.params.id);
    res.status(204).send(); // 204 = sucesso, sem corpo de resposta (padrão pra DELETE)
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getById, update, remove };
