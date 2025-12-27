export function downloadBase64File(filename: string, base64: string, mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
  const input = String(base64 || '').trim();
  const dataIdx = input.indexOf(',');
  const raw = input.startsWith('data:') && dataIdx > -1 ? input.slice(dataIdx + 1) : input;
  let b64 = raw.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  try {
    const binaryString = atob(b64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    // Edge/IE 兼容
    const navAny = navigator as any;
    if (navAny && typeof navAny.msSaveOrOpenBlob === 'function') {
      navAny.msSaveOrOpenBlob(blob, filename);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setTimeout(() => a.remove(), 10000);
  } catch {
    const a = document.createElement('a');
    a.href = `data:${mime};base64,${b64}`;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 10000);
  }
}

export function downloadBinaryFile(filename: string, buffer: ArrayBuffer, mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
  if (!buffer) return;
  const blob = new Blob([buffer], { type: mime });
  const navAny = navigator as any;
  if (navAny && typeof navAny.msSaveOrOpenBlob === 'function') {
    navAny.msSaveOrOpenBlob(blob, filename);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  setTimeout(() => a.remove(), 10000);
}
