// ============================================================
// src/services/adapters/BaseAdapter.ts
// Interfaz base del patrón Adapter para publicación
// ============================================================

import type { MediaFile } from '../../types/media.types';
import type { PlatformPublishResult } from '../../types/platform.types';
import type { PublishPayload } from '../../types/publish.types';

/**
 * Callback de progreso: recibe un número entre 0 y 100.
 */
export type ProgressCallback = (progress: number) => void;

/**
 * Interfaz que todos los adaptadores deben implementar.
 * Sigue el patrón Adapter para desacoplar la lógica de publicación
 * del orquestador central (publisherService.ts).
 */
export interface IPublishAdapter {
  /**
   * Sube el archivo multimedia al servidor de la plataforma.
   * @returns URI o ID del recurso subido en la plataforma.
   */
  upload(
    media: MediaFile,
    token: string,
    onProgress?: ProgressCallback,
    options?: { caption?: string; title?: string }
  ): Promise<string>;

  /**
   * Publica el contenido usando el recurso ya subido.
   * @returns ID del post/reel/video creado en la plataforma.
   */
  publish(
    payload: PublishPayload,
    uploadedId: string,
    token: string
  ): Promise<string>;

  /**
   * Consulta el estado de procesamiento de un post (para APIs asíncronas).
   * @returns PlatformPublishResult actualizado con estado y URL.
   */
  getStatus(
    postId: string,
    token: string
  ): Promise<Pick<PlatformPublishResult, 'status' | 'postUrl' | 'errorMessage'>>;

  pollStatus?(
    postId: string,
    token: string,
    intervalMs?: number,
    maxAttempts?: number
  ): Promise<Pick<PlatformPublishResult, 'status' | 'postUrl' | 'errorMessage'>>;
}

/**
 * Clase abstracta con utilidades compartidas.
 */
export abstract class BaseAdapter implements IPublishAdapter {
  abstract upload(
    media: MediaFile,
    token: string,
    onProgress?: ProgressCallback,
    options?: { caption?: string; title?: string }
  ): Promise<string>;

  abstract publish(
    payload: PublishPayload,
    uploadedId: string,
    token: string
  ): Promise<string>;

  abstract getStatus(
    postId: string,
    token: string
  ): Promise<Pick<PlatformPublishResult, 'status' | 'postUrl' | 'errorMessage'>>;

  /**
   * Pausa la ejecución el número de milisegundos indicado.
   * Útil para polling de APIs asíncronas.
   */
  public sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Polling genérico: reintenta getStatus hasta que el estado sea terminal.
   */
  public async pollStatus(
    postId: string,
    token: string,
    intervalMs = 3000,
    maxAttempts = 20
  ): Promise<Pick<PlatformPublishResult, 'status' | 'postUrl' | 'errorMessage'>> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.getStatus(postId, token);
      if (result.status === 'success' || result.status === 'error') {
        return result;
      }
      await this.sleep(intervalMs);
    }
    return {
      status: 'error',
      errorMessage: 'Tiempo de espera agotado en el procesamiento.',
    };
  }
}
