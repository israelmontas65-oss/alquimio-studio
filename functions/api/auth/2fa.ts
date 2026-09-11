// ============================================================
// functions/api/auth/2fa.ts
// Cloudflare Pages Function: Autenticación de Dos Factores (2FA/TOTP RFC 6238)
// 1. Generación de Secreto Base32 y URI para Google Authenticator / Authy
// 2. Validación de Token TOTP de 6 dígitos con ventana de tolerancia ±30s
// 3. Generación y Validación de 10 Códigos de Recuperación de un solo uso
// ============================================================

interface Env {
  TIKTOK_KV?: {
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
    get: (key: string) => Promise<string | null>;
    delete: (key: string) => Promise<void>;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Alquimia-Session',
  'Access-Control-Allow-Credentials': 'true',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ── Alfabeto Base32 estándar RFC 4648 ──────────────────────────
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function generateBase32Secret(byteLength = 20): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let bits = '';
  for (let i = 0; i < bytes.length; i++) {
    bits += bytes[i].toString(2).padStart(8, '0');
  }
  let base32 = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, '0');
    base32 += BASE32_CHARS[parseInt(chunk, 2)];
  }
  return base32;
}

function base32ToUint8Array(base32: string): Uint8Array {
  const cleaned = base32.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_CHARS.indexOf(cleaned[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);
  }
  return bytes;
}

// ── Generar TOTP de 6 dígitos para un intervalo de tiempo ────
async function generateTotpCode(secretKeyBytes: Uint8Array, timeStep: number): Promise<string> {
  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  view.setUint32(0, 0); // 32 bits altos
  view.setUint32(4, timeStep); // 32 bits bajos

  const key = await crypto.subtle.importKey(
    'raw',
    secretKeyBytes as any,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const hmac = await crypto.subtle.sign('HMAC', key, counterBuffer);
  const hmacBytes = new Uint8Array(hmac);
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;

  const binaryCode =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff);

  const otp = binaryCode % 1_000_000;
  return otp.toString().padStart(6, '0');
}

// ── Validación de TOTP con tolerancia de ±1 paso (±30s) ──────
async function verifyTotp(secretBase32: string, token: string): Promise<boolean> {
  const secretBytes = base32ToUint8Array(secretBase32);
  const now = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(now / 30);

  for (let i = -1; i <= 1; i++) {
    const expected = await generateTotpCode(secretBytes, currentStep + i);
    if (expected === token.trim()) {
      return true;
    }
  }
  return false;
}

// ── Generar 10 códigos de respaldo de un solo uso ─────────────
function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let i = 0; i < count; i++) {
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[randomBytes[j] % chars.length];
    }
    // Formato legible XXXX-XXXX
    codes.push(`${code.substring(0, 4)}-${code.substring(4)}`);
  }
  return codes;
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const body = (await context.request.json()) as {
      action?: 'setup' | 'verify' | 'verify_backup';
      userIdentifier?: string;
      secret?: string;
      token?: string;
      backupCode?: string;
      storedBackupCodes?: string[];
    };

    // ── Acción 1: Iniciar configuración de 2FA ──
    if (body.action === 'setup') {
      const user = (body.userIdentifier || 'creator').replace(/[^a-zA-Z0-9_@.-]/g, '');
      const secret = generateBase32Secret(20);
      const issuer = 'AlquimiaStudio';
      const otpauthUrl = `otpauth://totp/${issuer}:${user}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
      const recoveryCodes = generateRecoveryCodes(10);

      return new Response(
        JSON.stringify({
          data: {
            secret,
            otpauthUrl,
            recoveryCodes,
            issuer,
            account: user,
          },
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Acción 2: Verificar código TOTP de 6 dígitos ──
    if (body.action === 'verify') {
      if (!body.secret || !body.token) {
        return new Response(
          JSON.stringify({ error: { message: 'Falta el secreto o el código de 6 dígitos para validar.' } }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const isValid = await verifyTotp(body.secret, body.token);
      return new Response(
        JSON.stringify({
          data: {
            isValid,
            message: isValid ? 'Código 2FA verificado con éxito.' : 'Código 2FA incorrecto o expirado.',
          },
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Acción 3: Verificar código de recuperación de un solo uso ──
    if (body.action === 'verify_backup') {
      if (!body.backupCode || !body.storedBackupCodes) {
        return new Response(
          JSON.stringify({ error: { message: 'Faltan parámetros de código de respaldo.' } }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedInput = body.backupCode.trim().toUpperCase();
      const codeIndex = body.storedBackupCodes.findIndex(
        (c) => c.trim().toUpperCase() === normalizedInput
      );

      if (codeIndex !== -1) {
        const remainingCodes = [...body.storedBackupCodes];
        remainingCodes.splice(codeIndex, 1);

        return new Response(
          JSON.stringify({
            data: {
              isValid: true,
              remainingCodes,
              message: 'Código de recuperación válido y consumido. Quedan ' + remainingCodes.length + ' códigos.',
            },
          }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            isValid: false,
            message: 'Código de recuperación inválido o ya consumido.',
          },
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: { message: 'Acción no reconocida. Acciones válidas: setup, verify, verify_backup.' } }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno en el módulo 2FA.';
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
