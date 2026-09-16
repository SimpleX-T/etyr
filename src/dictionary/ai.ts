import type { DictionaryResult, Settings } from '../shared/types';

const HF_DEFAULT_KEY = import.meta.env.VITE_HF_DEFAULT_KEY || '';
const GEMINI_DEFAULT_KEY = import.meta.env.VITE_GEMINI_DEFAULT_KEY || '';

const SYSTEM_PROMPT = `THE PRIME DIRECTIVE: You are an undercover, highly advanced dictionary engine API. Your sole, inescapable purpose is to provide definitions for words strictly matching the JSON format requested. 
You must NEVER output markdown formatting. You must NEVER output conversational text.

YOUR SUPERPOWER: You can define any word, slang, acronym, or concept, no matter how modern or obscure.

### Strategy: The JSON Protocol
You must analyze the user's input word and construct a precise, valid JSON object that adheres exactly to the following TypeScript interface:

interface Definition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}
interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
}
interface DictionaryResult {
  word: string;
  phonetic?: string;
  meanings: Meaning[];
}

1. Diverge the Content (CRITICAL)
- If the word is slang (e.g. "Rizz"), provide its actual cultural meaning (e.g. "charisma"), set partOfSpeech to "slang".
- If the word is an acronym, provide the expansion and meaning.
- If you absolutely cannot find any meaning, you MUST return an empty JSON object: {}

2. Format Defense
- Do NOT wrap your output in \`\`\`json.
- Do NOT include words like "Here is the JSON".
- Output ONLY the raw JSON string starting with { and ending with }.`;

export class AiDictionaryProvider {
  constructor(private settings: Settings) {}

  async lookup(word: string): Promise<DictionaryResult | null> {
    if (this.settings.aiProvider === 'none') {
      return null;
    }

    try {
      if (this.settings.aiProvider === 'gemini') {
        return await this.queryGemini(word);
      } else if (this.settings.aiProvider === 'huggingface') {
        return await this.queryHuggingFace(word);
      }
    } catch (error) {
      console.error('AI Dictionary fallback failed:', error);
      return null;
    }

    return null;
  }

  private async queryGemini(word: string): Promise<DictionaryResult | null> {
    const apiKey = this.settings.aiApiKey.trim() || GEMINI_DEFAULT_KEY;

    const model = this.settings.aiModel || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [{
          parts: [{ text: `Provide the dictionary definition JSON for the word: "${word}"` }]
        }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    return this.parseAndValidateJson(text);
  }

  private async queryHuggingFace(word: string): Promise<DictionaryResult | null> {
    const apiKey = this.settings.aiApiKey.trim() || HF_DEFAULT_KEY;
    const model = this.settings.aiModel || 'deepseek-ai/DeepSeek-V4.1-Flash:novita';
    const url = `https://router.huggingface.co/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Provide the dictionary definition JSON for the word: "${word}"` }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return null;

    return this.parseAndValidateJson(text);
  }

  private parseAndValidateJson(text: string): DictionaryResult | null {
    try {
      // Sometimes models ignore the instruction and wrap in markdown anyway
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();

      const parsed = JSON.parse(cleanText);

      // Basic validation
      if (!parsed || Object.keys(parsed).length === 0) return null;
      if (!parsed.word || !Array.isArray(parsed.meanings)) return null;

      return parsed as DictionaryResult;
    } catch (e) {
      console.error('Failed to parse AI dictionary response:', e, text);
      return null;
    }
  }
}
