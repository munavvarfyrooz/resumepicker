// Abstract embeddings service for future AI integration
// Currently returns mock vectors but can be extended for OpenAI integration

export interface EmbeddingResult {
  vector: number[];
  text: string;
}

export class EmbeddingsService {
  private static useAI = process.env.ENABLE_AI_EMBEDDINGS === 'true';
  private static apiKey = process.env.OPENAI_API_KEY || process.env.API_KEY || 'mock_key';

  static async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (this.useAI && this.apiKey !== 'mock_key') {
      return await this.generateRealEmbedding(text);
    } else {
      return this.generateMockEmbedding(text);
    }
  }

  private static async generateRealEmbedding(text: string): Promise<EmbeddingResult> {
    // Future implementation for OpenAI API calls
    // This would use the actual OpenAI embeddings API
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-ada-002',
        }),
      });

      const data = await response.json();
      return {
        vector: data.data[0].embedding,
        text,
      };
    } catch (error) {
      console.warn('Failed to generate real embedding, falling back to mock:', error);
      return this.generateMockEmbedding(text);
    }
  }

  private static generateMockEmbedding(text: string): EmbeddingResult {
    // Generate a deterministic mock vector based on text content
    const vector: number[] = [];
    const hash = this.simpleHash(text);
    
    for (let i = 0; i < 1536; i++) { // OpenAI embedding dimension
      vector.push((Math.sin(hash + i) + 1) / 2);
    }

    return { vector, text };
  }

  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  static async calculateSimilarity(vector1: number[], vector2: number[]): Promise<number> {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have the same dimension');
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return Math.max(0, Math.min(1, similarity)); // Clamp to [0, 1]
  }
}
