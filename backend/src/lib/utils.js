export function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

export function maskCpf(cpf) {
  const digits = onlyDigits(cpf ?? '');
  if (digits.length !== 11) return null;
  return `***.***.***-${digits.slice(-2)}`;
}

export function sanitizeSearch(value = '') {
  return String(value).replace(/[%_,()."'\\]/g, ' ').trim();
}

export function generatePassword() {
  const random = Math.random().toString(36).slice(-6);
  return `InSight@${random}`;
}

export function escapePostgrestValue(value = '') {
  return String(value).replace(/["(),]/g, '');
}

export function monthLabel(date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '');
}
