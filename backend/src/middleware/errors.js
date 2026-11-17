import multer from 'multer';
import { ApiError } from '../lib/http.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Rota nao encontrada.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON invalido no corpo da requisicao.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Corpo da requisicao excede o tamanho permitido.' });
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'A imagem deve ter no maximo 2 MB.'
        : 'Falha no upload da imagem.';
    return res.status(400).json({ error: message });
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {})
    });
  }

  console.error('[api] erro inesperado', error);
  return res.status(500).json({ error: 'Erro interno do servidor.' });
}
