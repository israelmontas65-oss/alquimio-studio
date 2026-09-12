// ============================================================
// functions/shared/verificar-firma.ts
// Verificación Criptográfica de Firmas para Webhooks Multi-Plataforma
// Alquimia Studio — Titularidad: Israel Montás
//
// Fuentes oficiales:
// - TikTok for Developers: Webhooks Verification
//   https://developers.tiktok.com/doc/webhooks-verification
// - Meta for Developers: Webhooks Validating Payloads
//   https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validate-payloads
// ============================================================

export const HEADER_FIRMA_TIKTOK = 'TikTok-Signature';
export const HEADER_FIRMA_META = 'X-Hub-Signature-256';

/**
 * Comparación en tiempo constante para mitigar ataques de temporización (timing attacks).
 * Itera sobre la longitud máxima de bytes calculando el XOR bit a bit sin retorno anticipado.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length);

  // Si las longitudes difieren, acumulamos la diferencia en diff
  let diff = aBytes.length ^ bBytes.length;

  for (let i = 0; i < maxLen; i++) {
    const aByte = i < aBytes.length ? aBytes[i] : 0;
    const bByte = i < bBytes.length ? bBytes[i] : 0;
    diff |= aByte ^ bByte;
  }

  return diff === 0;
}

/**
 * Calcula el hash HMAC-SHA256 en formato hexadecimal usando la Web Crypto API nativa.
 * Compatible con Cloudflare Pages Functions, Workers y navegadores modernos.
 */
export async function calcularHmacSha256(secreto: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ResultadoVerificacionFirma {
  valido: boolean;
  error?: string;
  timestamp?: number;
}

/**
 * ────────────────────────────────────────────────────────────
 * Verificación de Firma Meta Graph API (X-Hub-Signature-256)
 * ────────────────────────────────────────────────────────────
 * Especificación oficial de Meta for Developers:
 * 1. Header: X-Hub-Signature-256
 * 2. Formato: sha256=<hex_digest>
 * 3. Payload: El body crudo exacto en formato UTF-8 (sin deserializar)
 * 4. Algoritmo: HMAC con hash SHA-256 y la clave secreta App Secret de la app Meta
 * 5. Comparación: Tiempo constante
 */
export async function verificarFirmaMeta(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): Promise<ResultadoVerificacionFirma> {
  if (!appSecret || typeof appSecret !== 'string' || appSecret.trim() === '') {
    return { valido: false, error: 'META_APP_SECRET no configurado en el entorno de Cloudflare' };
  }

  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return { valido: false, error: 'Falta el encabezado X-Hub-Signature-256 en la solicitud' };
  }

  const trimmedHeader = signatureHeader.trim();
  const prefijo = 'sha256=';

  if (!trimmedHeader.startsWith(prefijo)) {
    return { valido: false, error: 'Formato inválido en X-Hub-Signature-256 (debe iniciar con "sha256=")' };
  }

  const firmaRecibida = trimmedHeader.slice(prefijo.length).toLowerCase();
  if (firmaRecibida.length !== 64) {
    return { valido: false, error: 'Longitud de firma SHA-256 inválida' };
  }

  const firmaCalculada = (await calcularHmacSha256(appSecret, rawBody)).toLowerCase();

  const esValida = timingSafeEqual(firmaRecibida, firmaCalculada);
  if (!esValida) {
    return { valido: false, error: 'Firma criptográfica no coincide' };
  }

  return { valido: true };
}

/**
 * ────────────────────────────────────────────────────────────
 * Verificación de Firma TikTok Webhooks v2 (TikTok-Signature)
 * ────────────────────────────────────────────────────────────
 * Especificación oficial de TikTok for Developers:
 * Doc: https://developers.tiktok.com/doc/webhooks-verification
 * 1. Header: TikTok-Signature
 * 2. Formato: t=<timestamp_segundos>,s=<hex_digest>
 * 3. signed_payload: `${t}.${rawBody}` (concatenación del timestamp, punto y el body crudo)
 * 4. Algoritmo: HMAC-SHA256 usando el client_secret de la aplicación
 * 5. Tolerancia temporal: Comprobación de antigüedad contra replay attacks (defecto 300 segundos = 5 min)
 * 6. Comparación: Tiempo constante
 */
export async function verificarFirmaTikTok(
  rawBody: string,
  signatureHeader: string | null,
  clientSecret: string,
  maxAgeSeconds = 300
): Promise<ResultadoVerificacionFirma> {
  if (!clientSecret || typeof clientSecret !== 'string' || clientSecret.trim() === '') {
    return { valido: false, error: 'TIKTOK_CLIENT_SECRET no configurado en el entorno de Cloudflare' };
  }

  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return { valido: false, error: 'Falta el encabezado TikTok-Signature en la solicitud' };
  }

  // Descomponer pares clave=valor separados por coma: "t=1633174587,s=184947150..."
  const partes = signatureHeader.split(',').reduce<Record<string, string>>((acc, item) => {
    const eqIdx = item.indexOf('=');
    if (eqIdx !== -1) {
      const k = item.substring(0, eqIdx).trim();
      const v = item.substring(eqIdx + 1).trim();
      acc[k] = v;
    }
    return acc;
  }, {});

  const timestampStr = partes['t'];
  const firmaRecibida = partes['s'] ? partes['s'].toLowerCase() : null;

  if (!timestampStr || !firmaRecibida) {
    return { valido: false, error: 'Encabezado TikTok-Signature incompleto (requiere "t=" y "s=")' };
  }

  const timestampNum = parseInt(timestampStr, 10);
  if (isNaN(timestampNum)) {
    return { valido: false, error: 'Timestamp de TikTok-Signature no es un número válido' };
  }

  // Protección anti-replay (ataques de repetición)
  const ahoraSegundos = Math.floor(Date.now() / 1000);
  const diferenciaSegundos = Math.abs(ahoraSegundos - timestampNum);
  if (diferenciaSegundos > maxAgeSeconds) {
    return {
      valido: false,
      error: `Firma TikTok expirada: desfase de ${diferenciaSegundos}s excede la tolerancia de ${maxAgeSeconds}s`,
    };
  }

  // Construir mensaje firmado oficial: `${timestamp}.${rawBody}`
  const signedPayload = `${timestampStr}.${rawBody}`;
  const firmaCalculada = (await calcularHmacSha256(clientSecret, signedPayload)).toLowerCase();

  const esValida = timingSafeEqual(firmaRecibida, firmaCalculada);
  if (!esValida) {
    return { valido: false, error: 'Firma criptográfica TikTok no coincide' };
  }

  return { valido: true, timestamp: timestampNum };
}
