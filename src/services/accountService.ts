/**
 * ALQUIMIO - Account & OAuth Service
 */
import type { PlatformId } from '../types/platform.types';

export class AccountService {
  /**
   * Simulates OAuth link flow for a platform (Demo / Beta Tester mode).
   * In a real app, this would open WebBrowser.openAuthSessionAsync(...)
   */
  static async linkPlatformDemo(platformId: PlatformId): Promise<boolean> {
    console.log(`[AccountService] Iniciando vinculación OAuth para: ${platformId}...`);
    
    // Simulate network delay and OAuth redirect
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log(`[AccountService] ✅ ${platformId} vinculada con éxito (Modo Demo).`);
    // Here we would typically save the access token securely
    // e.g., await SecureStore.setItemAsync(`${platformId}_token`, mockToken);
    
    return true;
  }
}
