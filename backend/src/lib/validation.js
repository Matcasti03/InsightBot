import { z } from 'zod';

export const birthDateSchema = z.iso.date('Data de nascimento invalida.')
  .refine(value => value <= new Date().toISOString().slice(0, 10), 'Data de nascimento nao pode ser futura.')
  .nullable().optional();
export const scheduledAtSchema = z.iso.datetime({ offset: true, message: 'Informe uma data e horario validos com fuso horario.' }).nullable().optional();

export function hasImageSignature(buffer, mime) {
  if (mime === 'image/png') return buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.toString('ascii', 12, 16) === 'IHDR';
  if (mime === 'image/jpeg') return buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && buffer.at(-2) === 255 && buffer.at(-1) === 217;
  if (mime === 'image/webp') return buffer.length >= 16 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' && buffer.readUInt32LE(4) === buffer.length - 8;
  return false;
}
