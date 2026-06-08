/**
 * Snippet Generator
 * 
 * Generates search result snippets using:
 * - MMR (Maximal Marginal Relevance) extractive summarization
 * - Query term highlighting with positional alignment
 * - Sentence scoring by relevance and diversity
 * - Dynamic snippet length based on query
 */

export class SnippetGenerator {
  private maxSnippetLength: number;
  private minSnippetLength: number;
  private lambda: number; // MMR diversity parameter (0 = max relevance, 1 = max diversity)

  constructor(maxLength: number = 300, minLength: number = 100, lambda: number = 0.7) {
    this.maxSnippetLength = maxLength;
    this.minSnippetLength = minLength;
    this.lambda = lambda;
  }

  /** Generate a snippet for a document given a query */
  generateSnippet(content: string, query: string, title: string): string {
    const queryTerms = this.extractQueryTerms(query);
    const sentences = this.splitSentences(content);

    if (sentences.length === 0) {
      return content.substring(0, this.maxSnippetLength);
    }

    // Score sentences using MMR
    const scoredSentences = this.mmrScoring(sentences, queryTerms);

    // Select best sentence(s)
    return this.buildSnippet(scoredSentences, queryTerms, title);
  }

  /** Split content into sentences */
  private splitSentences(text: string): string[] {
    // Split on sentence boundaries
    const raw = text
      .replace(/([.?!])\s*(?=[A-Z])/g, '$1\n')
      .replace(/([.?!])\s*$/g, '$1')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 20); // Filter very short fragments

    return raw;
  }

  /** Extract meaningful query terms */
  private extractQueryTerms(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2 && !this.isStopWord(t));
  }

  /** Check if word is a stop word */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can',
      'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'some',
      'them', 'than', 'what', 'when', 'where', 'which', 'while', 'who', 'will',
      'with', 'would', 'about', 'after', 'before', 'between', 'still', 'again',
      'also', 'another', 'because', 'every', 'form', 'found', 'great', 'into',
      'just', 'like', 'make', 'many', 'more', 'most', 'much', 'only', 'other',
      'over', 'such', 'than', 'that', 'their', 'then', 'there', 'these', 'they',
      'this', 'those', 'through', 'under', 'very', 'were', 'when', 'where'
    ]);
    return stopWords.has(word);
  }

  /** MMR scoring for sentences */
  private mmrScoring(
    sentences: string[],
    queryTerms: string[]
  ): Array<{ sentence: string; score: number; relevance: number }> {
    const selected: number[] = [];
    const scored: Array<{ sentence: string; score: number; relevance: number }> = [];
    const remaining = new Set(sentences.map((_, i) => i));

    // Score all sentences iteratively
    while (remaining.size > 0) {
      let bestIdx = -1;
      let bestScore = -Infinity;

      for (const idx of remaining) {
        // Relevance score (similarity to query)
        const relevance = this.sentenceQuerySimilarity(sentences[idx], queryTerms);

        // Diversity score (similarity to already selected sentences)
        let maxSimilarity = 0;
        for (const selIdx of selected) {
          const sim = this.sentenceSimilarity(sentences[idx], sentences[selIdx]);
          maxSimilarity = Math.max(maxSimilarity, sim);
        }

        // MMR score
        const mmr = this.lambda * relevance - (1 - this.lambda) * maxSimilarity;

        if (mmr > bestScore) {
          bestScore = mmr;
          bestIdx = idx;
        }
      }

      if (bestIdx !== -1) {
        selected.push(bestIdx);
        remaining.delete(bestIdx);
        const relevance = this.sentenceQuerySimilarity(sentences[bestIdx], queryTerms);
        scored.push({
          sentence: sentences[bestIdx],
          score: bestScore,
          relevance
        });
      } else {
        break;
      }

      // Only select top 3 sentences max
      if (selected.length >= 3) break;
    }

    return scored.sort((a, b) => b.relevance - a.relevance);
  }

  /** Compute similarity between a sentence and the query */
  private sentenceQuerySimilarity(sentence: string, queryTerms: string[]): number {
    const lower = sentence.toLowerCase();
    let matches = 0;

    for (const term of queryTerms) {
      if (lower.includes(term)) {
        matches++;
      }
    }

    // Bonus for term density and proximity
    const termPositions = queryTerms
      .map(t => lower.indexOf(t))
      .filter(pos => pos >= 0)
      .sort((a, b) => a - b);

    let proximityBonus = 0;
    if (termPositions.length >= 2) {
      const maxGap = termPositions[termPositions.length - 1] - termPositions[0];
      proximityBonus = Math.max(0, 1 - maxGap / sentence.length);
    }

    return (matches / Math.max(1, queryTerms.length)) * 0.7 + proximityBonus * 0.3;
  }

  /** Compute cosine similarity between two sentences using word overlap */
  private sentenceSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));

    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) intersection++;
    }

    const union = new Set([...wordsA, ...wordsB]);
    return union.size > 0 ? intersection / union.size : 0;
  }

  /** Build the final snippet from scored sentences */
  private buildSnippet(
    scored: Array<{ sentence: string; score: number; relevance: number }>,
    queryTerms: string[],
    title: string
  ): string {
    if (scored.length === 0) return '';

    // Prefer sentences that contain query terms
    let snippet = '';
    const addedSentences: string[] = [];

    for (const s of scored) {
      const lower = s.sentence.toLowerCase();
      const hasMatch = queryTerms.some(t => lower.includes(t));

      if (hasMatch || addedSentences.length === 0) {
        if (snippet.length + s.sentence.length <= this.maxSnippetLength) {
          snippet += (snippet ? ' ' : '') + s.sentence;
          addedSentences.push(s.sentence);
        } else if (addedSentences.length === 0) {
          // Truncate first sentence to fit
          snippet = this.truncateToFit(s.sentence, this.maxSnippetLength);
          addedSentences.push(snippet);
        }
      }

      if (snippet.length >= this.minSnippetLength) break;
    }

    // If no matches found, use the highest-scored sentence
    if (snippet.length === 0 && scored.length > 0) {
      snippet = this.truncateToFit(scored[0].sentence, this.maxSnippetLength);
    }

    // Highlight query terms in snippet
    snippet = this.highlightTerms(snippet, queryTerms);

    return snippet;
  }

  /** Truncate text to fit max length (at sentence boundary if possible) */
  private truncateToFit(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    // Try to break at sentence boundary
    const truncated = text.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastPeriod > maxLength * 0.5) {
      return text.substring(0, lastPeriod + 1);
    } else if (lastSpace > maxLength * 0.5) {
      return text.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  /** Highlight query terms in snippet */
  private highlightTerms(text: string, queryTerms: string[]): string {
    let highlighted = text;

    for (const term of queryTerms) {
      // Case-insensitive replacement with highlight markers
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }

    return highlighted;
  }

  /** Generate a summary highlighting metadata */
  generateMetadataSnippet(doc: {
    title: string;
    content: string;
    domain: string;
    timestamp: Date;
  }, query: string): string {
    const snippet = this.generateSnippet(doc.content, query, doc.title);
    const dateStr = doc.timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    return `${dateStr} — ${snippet}`;
  }

  /** Batch generate snippets */
  generateSnippets(docs: Array<{ title: string; content: string }>, query: string): string[] {
    return docs.map(doc => this.generateSnippet(doc.content, query, doc.title));
  }
}
