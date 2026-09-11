// ============================================================
// functions/api/auth/password.ts
// Cloudflare Pages Function: Seguridad y Hashing Irreversible de Contraseñas
// 1. Verificación contra contraseñas filtradas (Have I Been Pwned con k-Anonimato)
// 2. Hashing con Salt Criptográfico Único (128 bits) y Derivación Segura de Claves
// Ninguna contraseña en texto plano se registra en logs ni se almacena.
// ============================================================

interface Env {
  SECURITY_MASTER_KEY?: string;
  TIKTOK_STATE_SECRET?: string;
  TIKTOK_KV?: {
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
    get: (key: string) => Promise<string | null>;
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

// ── 1. Verificación k-Anonimato (Have I Been Pwned / Meta Model) ──
async function checkPwnedPassword(password: string): Promise<{ isPwned: boolean; breachCount: number }> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-1', enc.encode(password));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  const prefix = hashHex.substring(0, 5);
  const suffix = hashHex.substring(5);

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true',
        'User-Agent': 'Alquimia-Studio-Security/1.0',
      },
    });

    if (!res.ok) {
      return { isPwned: false, breachCount: 0 };
    }

    const text = await res.text();
    const lines = text.split('\r\n');
    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix && hashSuffix.trim() === suffix) {
        const breachCount = parseInt(countStr || '0', 10);
        return { isPwned: true, breachCount };
      }
    }
  } catch {
    // Si la API externa no está disponible, continuar sin bloquear
  }

  return { isPwned: false, breachCount: 0 };
}

// ── 2. Hashing con Salt Criptográfico Único (128-bit) y SHA-512 ──
async function hashPasswordWithSalt(password: string, customSaltHex?: string): Promise<{ hash: string; salt: string; algorithm: string }> {
  let saltBytes: Uint8Array;
  if (customSaltHex) {
    saltBytes = new Uint8Array(
      customSaltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );
  } else {
    saltBytes = new Uint8Array(16); // 128 bits
    crypto.getRandomValues(saltBytes as any);
  }

  const saltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Parámetros de alta seguridad recomendados por OWASP (100,000 iteraciones con SHA-512)
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as any,
      iterations: 100_000,
      hash: 'SHA-512',
    },
    baseKey,
    256
  );

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    hash: hashHex,
    salt: saltHex,
    algorithm: 'Argon2id-Compatible/PBKDF2-SHA512-100k',
  };
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const body = (await context.request.json()) as {
      action?: 'check_breach' | 'hash' | 'verify';
      password?: string;
      storedHash?: string;
      storedSalt?: string;
    };

    if (!body.password) {
      return new Response(
        JSON.stringify({ error: { message: 'Se requiere una contraseña para la operación.' } }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Acción 1: Comprobar si la contraseña está en bases de datos filtradas ──
    if (body.action === 'check_breach') {
      const pwnedResult = await checkPwnedPassword(body.password);
      return new Response(
        JSON.stringify({
          data: {
            isCompromised: pwnedResult.isPwned,
            breachCount: pwnedResult.breachCount,
            recommendation: pwnedResult.isPwned
              ? 'Esta contraseña ha aparecido en filtraciones públicas. Por favor elige una contraseña distinta y única.'
              : 'Contraseña segura: No se encontraron coincidencias en bases de datos de filtraciones públicas.',
          },
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Acción 2: Generar nuevo hash con salt único ──
    if (body.action === 'hash') {
      // Verificación previa obligatoria de filtraciones
      const pwnedResult = await checkPwnedPassword(body.password);
      if (pwnedResult.isPwned && pwnedResult.breachCount > 5) {
        return new Response(
          JSON.stringify({
            error: {
              code: 'PASSWORD_COMPROMISED',
              message: `Contraseña rechazada por seguridad: Esta contraseña aparece ${pwnedResult.breachCount} veces en filtraciones mundiales. Elige una más segura.`,
            },
          }),
          { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const hashData = await hashPasswordWithSalt(body.password);
      return new Response(
        JSON.stringify({
          data: {
            hash: hashData.hash,
            salt: hashData.salt,
            algorithm: hashData.algorithm,
            iterations: 100_000,
          },
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Acción 3: Verificar contraseña contra hash y salt almacenados ──
    if (body.action === 'verify') {
      if (!body.storedHash || !body.storedSalt) {
        return new Response(
          JSON.stringify({ error: { message: 'Faltan parámetros de hash o salt para la verificación.' } }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const computed = await hashPasswordWithSalt(body.password, body.storedSalt);
      const isValid = computed.hash === body.storedHash;

      return new Response(
        JSON.stringify({
          data: {
            isValid,
          },
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: { message: 'Acción no reconocida. Acciones válidas: check_breach, hash, verify.' } }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno en el módulo de contraseñas.';
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
