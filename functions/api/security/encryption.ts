// ============================================================
// functions/api/security/encryption.ts
// Cloudflare Pages Function: Utilidad Criptográfica de Cifrado en Reposo (AES-256-GCM)
// Cifra y descifra tokens de acceso y datos sensibles de clientes
// ============================================================

interface Env {
  SECURITY_MASTER_KEY?: string;
  TIKTOK_STATE_SECRET?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function getEncryptionKey(masterSecret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterSecret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('alquimia_aes_gcm_salt_2026'),
      iterations: 50_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(plainText: string, masterSecret: string): Promise<string> {
  const enc = new TextEncoder();
  const iv = new Uint8Array(12); // 96-bit IV para GCM
  crypto.getRandomValues(iv);

  const key = await getEncryptionKey(masterSecret);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );

  const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join('');
  const cipherHex = Array.from(new Uint8Array(cipherBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

  return `${ivHex}:${cipherHex}`;
}

export async function decryptData(cipherString: string, masterSecret: string): Promise<string> {
  const [ivHex, cipherHex] = cipherString.split(':');
  if (!ivHex || !cipherHex) throw new Error('Formato de texto cifrado inválido.');

  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || []);
  const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || []);

  const key = await getEncryptionKey(masterSecret);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBytes
  );

  return new TextDecoder().decode(plainBuffer);
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const body = (await context.request.json()) as {
      action?: 'encrypt' | 'decrypt';
      text?: string;
      cipherText?: string;
    };

    const masterSecret =
      context.env.SECURITY_MASTER_KEY ||
      context.env.TIKTOK_STATE_SECRET ||
      'alquimia_default_enterprise_security_secret_2026';

    if (body.action === 'encrypt') {
      if (!body.text) {
        return new Response(JSON.stringify({ error: { message: 'Falta texto para cifrar.' } }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const encrypted = await encryptData(body.text, masterSecret);
      return new Response(
        JSON.stringify({
          data: {
            algorithm: 'AES-256-GCM',
            cipherText: encrypted,
            keyLength: 256,
          },
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'decrypt') {
      if (!body.cipherText) {
        return new Response(JSON.stringify({ error: { message: 'Falta cipherText para descifrar.' } }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const decrypted = await decryptData(body.cipherText, masterSecret);
      return new Response(
        JSON.stringify({
          data: {
            plainText: decrypted,
          },
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: { message: 'Acción no válida.' } }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error en cifrado AES-256-GCM.';
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
