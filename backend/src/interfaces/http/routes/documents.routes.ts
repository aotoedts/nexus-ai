import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'node:path';
import fs from 'node:fs/promises';
import { v4 as uuid } from 'uuid';
import { PrismaDocumentRepository } from '../../../core/infrastructure/repositories/PrismaDocumentRepository.js';
import { UploadDocumentUseCase } from '../../../core/application/use-cases/documents/UploadDocumentUseCase.js';
import { QueryDocumentsUseCase } from '../../../core/application/use-cases/documents/QueryDocumentsUseCase.js';
import { IModelAdapter } from '../../../core/infrastructure/ai/IModelAdapter.js';
import { env } from '../../../config/env.js';
import { ValidationError } from '../../../shared/errors/AppError.js';

export async function documentsRoutes(app: FastifyInstance, opts: { model: IModelAdapter }) {
  const repository = new PrismaDocumentRepository();
  const uploadDocument = new UploadDocumentUseCase(repository, opts.model);
  const queryDocuments = new QueryDocumentsUseCase(repository, opts.model);

  app.get('/documents', { onRequest: [app.authenticate] }, async (request) => {
    const documents = await repository.listByUser(request.user.sub);
    return { documents };
  });

  app.post('/documents/upload', { onRequest: [app.authenticate] }, async (request) => {
    const file = await request.file();
    if (!file) throw new ValidationError('Nenhum arquivo enviado');

    await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
    const fileName = `${uuid()}-${file.filename}`;
    const filePath = path.join(env.UPLOAD_DIR, fileName);

    const buffer = await file.toBuffer();
    if (buffer.byteLength > env.MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new ValidationError(`Arquivo excede o limite de ${env.MAX_FILE_SIZE_MB}MB`);
    }
    await fs.writeFile(filePath, buffer);

    const document = await uploadDocument.execute({
      userId: request.user.sub,
      fileName: file.filename,
      filePath,
      mimeType: file.mimetype,
      sizeBytes: buffer.byteLength,
    });

    return { document };
  });

  app.post('/documents/query', { onRequest: [app.authenticate] }, async (request) => {
    const body = z.object({ query: z.string().min(1), topK: z.number().optional() }).parse(request.body);
    const chunks = await queryDocuments.execute(request.user.sub, body.query, body.topK ?? 5);
    return { chunks };
  });
}
