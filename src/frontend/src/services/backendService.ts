import { backend } from "../../../declarations/backend";
import { llmConfigManager, type LlmProvider } from "../config/llmConfig";

/**
 * Service for handling all backend canister API calls
 */
export const backendService = {
  /**
   * Sends a greeting to the backend and returns the response
   * @param name Name to greet
   * @returns Promise with the greeting response
   */
  async greet(name: string): Promise<string> {
    return await backend.greet(name || "World");
  },

  /**
   * Fetches the current counter value
   * @returns Promise with the current count
   */
  async getCount(): Promise<bigint> {
    return await backend.get_count();
  },

  /**
   * Increments the counter on the backend
   * @returns Promise with the new count
   */
  async incrementCounter(): Promise<bigint> {
    return await backend.increment();
  },

  /**
   * Sends a prompt to the LLM backend (Ollama via Motoko)
   * @param prompt The user's prompt text
   * @returns Promise with the LLM response
   */
  async sendLlmPrompt(prompt: string): Promise<string> {
    return await backend.prompt(prompt);
  },

  /**
   * Sends a prompt to the API server with context awareness
   * @param prompt The user's prompt text
   * @returns Promise with the LLM response from API server
   */
  async sendLlmPromptWithContext(prompt: string): Promise<string> {
    const config = llmConfigManager.getConfig();
    const apiKey = llmConfigManager.getApiKey();
    const timeout = llmConfigManager.getTimeout('api-server');

    // Check if ICP-Coder is available
    if (!llmConfigManager.isIcpCoderAvailable()) {
      throw new Error('ICP-Coder is not available - no API key configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${config.apiServerUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: 'gemini-2.5-flash'
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your API server configuration.');
        }
        if (response.status === 404) {
          throw new Error('API server endpoint not found. Please ensure the API server is running.');
        }
        throw new Error(`API Server error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from API server');
      }

      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - API server is taking too long to respond');
        }
        if (error.message.includes('fetch')) {
          throw new Error('Context service unavailable - check if API server is running');
        }
        throw error;
      }
      
      throw new Error('Unknown error occurred while contacting API server');
    }
  },

  /**
   * Sends a prompt using the specified LLM provider
   * @param prompt The user's prompt text
   * @param provider The LLM provider to use
   * @returns Promise with the LLM response
   */
  async sendPromptWithProvider(prompt: string, provider: LlmProvider): Promise<string> {
    if (provider === 'api-server') {
      return this.sendLlmPromptWithContext(prompt);
    } else {
      return this.sendLlmPrompt(prompt);
    }
  },
};