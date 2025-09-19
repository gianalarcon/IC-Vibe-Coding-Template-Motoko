/**
 * LLM Configuration Management
 * Handles configuration for different LLM providers
 */

export type LlmProvider = 'ollama' | 'api-server';

export interface LlmConfig {
  apiServerUrl: string;
  apiKey: string | null;
  timeouts: {
    ollama: number;
    apiServer: number;
  };
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
  };
}

class LlmConfigManager {
  private static readonly CONFIG_STORAGE_KEY = 'llm-config';
  private static readonly API_KEY_STORAGE_KEY = 'api-server-key';

  private defaultConfig: LlmConfig = {
    apiServerUrl: 'http://localhost:8000',
    apiKey: null,
    timeouts: {
      ollama: 60000, // 60 seconds for Ollama
      apiServer: 30000, // 30 seconds for API server
    },
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000, // 1 second
    },
  };

  /**
   * Gets the current LLM configuration
   */
  getConfig(): LlmConfig {
    try {
      const stored = localStorage.getItem(LlmConfigManager.CONFIG_STORAGE_KEY);
      const apiKey = localStorage.getItem(LlmConfigManager.API_KEY_STORAGE_KEY);
      
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        return {
          ...this.defaultConfig,
          ...parsedConfig,
          apiKey,
        };
      }
      
      return {
        ...this.defaultConfig,
        apiKey,
      };
    } catch (error) {
      console.warn('Failed to load LLM config from localStorage, using defaults:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Updates the LLM configuration
   */
  updateConfig(partialConfig: Partial<Omit<LlmConfig, 'apiKey'>>): void {
    try {
      const currentConfig = this.getConfig();
      const updatedConfig = { ...currentConfig, ...partialConfig };
      
      // Don't store apiKey in the main config
      const { apiKey, ...configToStore } = updatedConfig;
      
      localStorage.setItem(
        LlmConfigManager.CONFIG_STORAGE_KEY,
        JSON.stringify(configToStore)
      );
    } catch (error) {
      console.error('Failed to save LLM config to localStorage:', error);
    }
  }

  /**
   * Sets the API key for the API server
   */
  setApiKey(apiKey: string): void {
    try {
      localStorage.setItem(LlmConfigManager.API_KEY_STORAGE_KEY, apiKey);
    } catch (error) {
      console.error('Failed to save API key to localStorage:', error);
    }
  }

  /**
   * Gets the API key for the API server
   */
  getApiKey(): string {
    // Try environment variable first, then localStorage, then return empty string if not available
    return import.meta.env.VITE_ICP_CODER_API_KEY || 
           localStorage.getItem(LlmConfigManager.API_KEY_STORAGE_KEY) || 
           '';
  }

  /**
   * Checks if ICP-Coder is available (has API key)
   */
  isIcpCoderAvailable(): boolean {
    return !!this.getApiKey();
  }

  /**
   * Removes the API key from storage
   */
  clearApiKey(): void {
    try {
      localStorage.removeItem(LlmConfigManager.API_KEY_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear API key from localStorage:', error);
    }
  }

  /**
   * Gets timeout for specific provider
   */
  getTimeout(provider: LlmProvider): number {
    const config = this.getConfig();
    return provider === 'ollama' ? config.timeouts.ollama : config.timeouts.apiServer;
  }

  /**
   * Gets retry configuration
   */
  getRetryConfig() {
    return this.getConfig().retryConfig;
  }
}

// Export singleton instance
export const llmConfigManager = new LlmConfigManager();

// Export types and utilities
export default llmConfigManager;