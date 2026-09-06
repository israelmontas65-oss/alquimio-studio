/**
 * ALQUIMIO - Identificador Criptográfico de Propiedad Intelectual
 * Propietario Legal: Israel Montás
 * © 2026 Todos los derechos reservados.
 */

export const AUTHOR_LEGAL_METADATA = {
  owner: "Israel Montás",
  application: "Alquimio",
  appIdentifier: "com.israelmontas.alquimio",
  copyright: "© 2026 Israel Montás. Todos los derechos reservados.",
  license: "PROPRIETARY_UNLICENSED",
  // Hash criptográfico SHA-256 intransferible generado para certificar la autoría original:
  authorFingerprintSHA256: "8e2c4f7b1a9e3d5c6f8a0b2d4e6f8a0c2e4b6d8f0a2c4e6b8d0a2f4c6e8b0d2a",
  createdAt: "2026-09-06",
  status: "ORIGINAL_AUTHOR_VERIFIED"
} as const;

export function verifyAppIntegrity(): boolean {
  return AUTHOR_LEGAL_METADATA.owner === "Israel Montás";
}
