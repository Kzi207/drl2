const tokenPattern = /^[a-fA-F0-9]{64}$/;

export const extractQrToken = (rawValue: string): string => {
  const value = String(rawValue || '').trim();
  if (tokenPattern.test(value)) return value.toLowerCase();
  try {
    const url = new URL(value);
    const candidate = url.searchParams.get('qrToken') || url.searchParams.get('token') ||
      url.pathname.split('/').filter(Boolean).pop() || '';
    return tokenPattern.test(candidate) ? candidate.toLowerCase() : '';
  } catch {
    return '';
  }
};
