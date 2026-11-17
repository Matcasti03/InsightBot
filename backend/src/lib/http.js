export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export function ok(res, data, status = 200) {
  return res.status(status).json({ data });
}

export function parseBody(schema, req) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new ApiError(400, firstIssue?.message ?? 'Dados invalidos.', parsed.error.flatten());
  }
  return parsed.data;
}

export function assertSupabase(result, fallbackMessage = 'Falha ao consultar o banco de dados.') {
  if (result.error) {
    throw new ApiError(400, result.error.message ?? fallbackMessage, result.error.details);
  }
  return result.data;
}
