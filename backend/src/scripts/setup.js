import { copyFile, chmod } from 'node:fs/promises';
import { constants } from 'node:fs';

for (const folder of ['backend', 'frontend']) {
  const source = new URL(`../../../${folder}/.env.example`, import.meta.url);
  // Scripts live in backend/src/scripts; project root is three levels up.
  const destination = new URL(`../../../${folder}/.env`, import.meta.url);
  try {
    await copyFile(source, destination, constants.COPYFILE_EXCL);
    await chmod(destination, 0o600);
    console.log(`${folder}/.env criado. Preencha as credenciais reais do Supabase.`);
  } catch (error) {
    if (error.code === 'EEXIST') console.log(`${folder}/.env ja existe; preservado.`);
    else throw error;
  }
}
console.log('Depois de configurar: npm run doctor');
