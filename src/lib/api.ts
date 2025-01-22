import { createParser } from 'eventsource-parser';

export interface APIConfig {
  apiKey: string;
  model: string;
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private maxTokens: number;
  private refillRate: number;

  constructor(maxTokens: number, refillRate: number) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
  }

  async waitForToken(): Promise<boolean> {
    this.refillTokens();
    if (this.tokens <= 0) {
      const waitTime = (1000 / this.refillRate) * Math.abs(this.tokens);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refillTokens();
    }
    this.tokens--;
    return true;
  }

  private refillTokens() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const newTokens = (timePassed * this.refillRate) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ChatAPI {
  private config: APIConfig;
  private rateLimiter: RateLimiter;
  private cache: Map<string, string>;

  constructor(config: APIConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(60, 1);
    this.cache = new Map();
  }

  private getCacheKey(messages: any[]): string {
    return JSON.stringify(messages);
  }

  private customizeResponse(text: string): string {
    // Replace Gemini's self-references with Krish AI
    text = text.replace(/I am a large language model, trained by Google/g, "I am Krish AI");
    text = text.replace(/I am an AI language model/g, "I am Krish AI");
    text = text.replace(/I do not have a name/g, "My name is Krish");
    text = text.replace(/I'm Gemini/g, "I'm Krish AI");
    return text;
  }

  async streamResponse(messages: any[], onToken: (token: string) => void): Promise<void> {
    await this.rateLimiter.waitForToken();

    const cacheKey = this.getCacheKey(messages);
    if (this.cache.has(cacheKey)) {
      const cachedResponse = this.cache.get(cacheKey)!;
      for (const char of cachedResponse) {
        onToken(char);
        await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 20));
      }
      return;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: messages[messages.length - 1].content
            }]
          }]
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        throw new APIError(
          error.error?.message || error.message || `API request failed with status ${response.status}`,
          response.status,
          error.error?.code
        );
      }

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new APIError('No response content received');
      }

      // Customize the response
      text = this.customizeResponse(text);

      // Simulate streaming by sending characters one by one
      for (const char of text) {
        onToken(char);
        await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 20));
      }

      this.cache.set(cacheKey, text);
    } catch (error) {
      console.error('API Error:', error);
      if (error instanceof APIError) throw error;
      throw new APIError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }
}