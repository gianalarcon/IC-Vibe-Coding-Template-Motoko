import { ChangeEvent, useState, useMemo } from "react";
import { Button, Card, TextArea } from "../components";
import { backendService } from "../services/backendService";
import { type LlmProvider } from "../config/llmConfig";

interface LlmPromptViewProps {
  onError: (error: string) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * LlmPromptView component for handling interactions with the LLM
 */
export function LlmPromptView({ onError, setLoading }: LlmPromptViewProps) {
  const [prompt, setPrompt] = useState<string>("");
  const [llmResponses, setLlmResponses] = useState<Record<LlmProvider, string>>({
    ollama: "",
    "api-server": ""
  });
  const [llmLoading, setLlmLoading] = useState(false);
  
  // Check if ICP-Coder API key is available
  const hasIcpCoderApiKey = useMemo(() => {
    return !!import.meta.env.VITE_ICP_CODER_API_KEY;
  }, []);
  
  const [llmProvider, setLlmProvider] = useState<LlmProvider>('ollama');

  const handleChangePrompt = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ): void => {
    if (!event?.target.value && event?.target.value !== "") {
      return;
    }
    setPrompt(event.target.value);
    
    // Clear all responses when prompt is cleared
    if (event.target.value === "") {
      setLlmResponses({
        ollama: "",
        "api-server": ""
      });
    }
  };

  const sendPrompt = async () => {
    if (!prompt.trim()) return;

    try {
      setLlmLoading(true);
      setLoading(true); // Use the setLoading prop to indicate loading state at App level
      const res = await backendService.sendPromptWithProvider(prompt, llmProvider);
      setLlmResponses(prev => ({
        ...prev,
        [llmProvider]: res
      }));
    } catch (err) {
      console.error(err);
      onError(String(err));
    } finally {
      setLlmLoading(false);
      setLoading(false); // Reset loading state
    }
  };

  const getLoadingText = () => {
    if (!llmLoading) return "Send Prompt";
    return llmProvider === 'ollama' ? "Thinking..." : "Searching context...";
  };

  return (
    <Card title="LLM Prompt">
      {/* LLM Provider Selection - only show if there are multiple options */}
      {hasIcpCoderApiKey && (
        <div className="mb-4">
          <div className="flex items-center gap-4">
            <h4 className="text-sm font-medium text-gray-300">LLM Provider:</h4>
            <label className="flex cursor-pointer items-center">
              <input
                type="radio"
                name="llmProvider"
                value="ollama"
                checked={llmProvider === 'ollama'}
                onChange={(e) => setLlmProvider(e.target.value as LlmProvider)}
                className="mr-2 text-blue-400"
              />
              <span className="text-sm">
                <span className="font-medium">Ollama</span> <span className="text-gray-400">(Fast)</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center">
              <input
                type="radio"
                name="llmProvider"
                value="api-server"
                checked={llmProvider === 'api-server'}
                onChange={(e) => setLlmProvider(e.target.value as LlmProvider)}
                className="mr-2 text-blue-400"
              />
              <span className="text-sm">
                <span className="font-medium">ICP-Coder</span>
              </span>
            </label>
          </div>
        </div>
      )}

      <TextArea
        value={prompt}
        onChange={handleChangePrompt}
        placeholder="Ask the LLM something..."
      />
      <Button onClick={sendPrompt} disabled={llmLoading}>
        {getLoadingText()}
      </Button>
      {!!llmResponses[llmProvider] && (
        <div className={`mt-6 rounded bg-gray-800 p-4 text-left`}>
          <h4 className="mt-0 text-blue-400">
            Response {hasIcpCoderApiKey && llmProvider === 'api-server' ? '(ICP-Coder)' : '(Ollama)'}:
          </h4>
          <p className="mb-0 whitespace-pre-wrap">{llmResponses[llmProvider]}</p>
        </div>
      )}
    </Card>
  );
}