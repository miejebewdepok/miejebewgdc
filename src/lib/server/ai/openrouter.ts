export type OpenRouterMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string; name?: string };

export type OpenRouterToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type OpenRouterChoice = {
  index: number;
  finish_reason: string;
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>;
  };
};

export type OpenRouterResponse = {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free";

const FALLBACK_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "google/gemma-2-9b-it:free",
  "openrouter/free"
];

export async function callOpenRouter(input: {
  messages: OpenRouterMessage[];
  tools?: OpenRouterToolDef[];
  toolChoice?: "auto" | "none";
  model?: string;
  temperature?: number;
}): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY belum diatur di environment. Tambahkan key dari https://openrouter.ai untuk mengaktifkan MIE JEBEW GDC AI."
    );
  }

  const initialModel = input.model ?? DEFAULT_MODEL;
  // Create a deduplicated list starting with the requested model, followed by the fallbacks
  const modelsToTry = [
    initialModel,
    ...FALLBACK_MODELS.filter((m) => m !== initialModel)
  ];

  let lastError: Error | null = null;
  let attempts = 0;

  for (const model of modelsToTry) {
    attempts++;
    try {
      console.log(`[OpenRouter] Calling model: ${model} (attempt ${attempts}/${modelsToTry.length})`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "https://warungos.local",
          "X-Title": "MIE JEBEW GDC",
        },
        body: JSON.stringify({
          model: model,
          messages: input.messages,
          tools: input.tools,
          tool_choice: input.tools ? input.toolChoice ?? "auto" : undefined,
          temperature: input.temperature ?? 0.2,
        }),
      });

      const text = await response.text().catch(() => response.statusText);
      
      if (!response.ok) {
        // If the key is completely wrong or unauthorized, throw immediately without retrying
        if (response.status === 401) {
          throw new Error(`OpenRouter 401 Unauthorized: API key invalid. ${text}`);
        }
        throw new Error(`OpenRouter ${response.status}: ${text}`);
      }

      const data = JSON.parse(text) as OpenRouterResponse;
      
      // Sometimes OpenRouter returns a successful HTTP 200 response containing an error payload
      if ((data as any).error) {
        const errMsg = typeof (data as any).error === 'object' 
          ? JSON.stringify((data as any).error) 
          : (data as any).error;
        throw new Error(`OpenRouter inner error: ${errMsg}`);
      }

      console.log(`[OpenRouter] Success with model: ${model}`);
      return data;
    } catch (err: any) {
      lastError = err;
      console.warn(`[OpenRouter] Attempt with model "${model}" failed (attempt ${attempts}): ${err.message || err}`);
      
      if (attempts >= modelsToTry.length) {
        break; // Max attempts reached
      }
      
      // Fast abort on 401 errors so the user gets correct feedback immediately
      if (err.message && err.message.includes("401")) {
        throw err;
      }
      
      console.log(`[OpenRouter] Trying next fallback model...`);
    }
  }

  throw lastError ?? new Error("Terjadi kesalahan yang tidak diketahui saat menghubungi OpenRouter.");
}
