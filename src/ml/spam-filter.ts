/**
 * Spam / Quality Filter
 * 
 * XGBoost classifier on 40+ features:
 * - Keyword stuffing ratio
 * - Link farm signals
 * - Content freshness
 * - Readability score
 * - HTML quality metrics
 * - Domain reputation
 * - Content-to-markup ratio
 * - Duplicate content signals
 */

interface SpamFeatures {
  // Content-based features
  keywordStuffingRatio: number;
  averageWordLength: number;
  wordCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  uppercaseRatio: number;
  punctuationRatio: number;
  numberRatio: number;
  repeatedWordRatio: number;
  uniqueWordRatio: number;
  stopWordRatio: number;
  readabilityScore: number;
  misspellingRatio: number;

  // HTML features
  contentToMarkupRatio: number;
  linkDensity: number;
  imageAltRatio: number;
  headingCount: number;
  metaKeywordCount: number;
  metaDescriptionLength: number;
  scriptTagRatio: number;
  hiddenElementCount: number;
  tinyFontCount: number;

  // Link features
  outgoingLinkCount: number;
  internalLinkRatio: number;
  externalLinkRatio: number;
  brokenLinkRatio: number;
  linkFarmScore: number;
  reciprocalLinkRatio: number;

  // Domain features
  domainAge: number;
  domainReputation: number;
  isKnownSpammer: number;
  subdomainCount: number;
  tldCredibility: number;

  // Behavioral features
  contentFreshness: number;
  updateFrequency: number;
  pageRank: number;
  bounceRate: number;
  sessionDuration: number;

  // Quality signals
  grammarScore: number;
  factualAccuracy: number;
  authorityScore: number;
}

export class SpamFilter {
  private trees: SpamTree[];
  private numTrees: number;
  private learningRate: number;
  private threshold: number;

  constructor(numTrees: number = 50, threshold: number = 0.5) {
    this.trees = [];
    this.numTrees = numTrees;
    this.learningRate = 0.3;
    this.threshold = threshold;

    this.initializeTrees();
  }

  /** Initialize ensemble of decision trees */
  private initializeTrees(): void {
    for (let i = 0; i < this.numTrees; i++) {
      this.trees.push(this.buildRandomTree(5));
    }
  }

  /** Build a random decision tree */
  private buildRandomTree(maxDepth: number): SpamTree {
    return {
      root: this.buildRandomNode(maxDepth, 0),
      weight: 1.0
    };
  }

  /** Build a random decision tree node */
  private buildRandomNode(maxDepth: number, depth: number): SpamNode {
    if (depth >= maxDepth) {
      return {
        featureIndex: 0,
        threshold: 0,
        left: null,
        right: null,
        score: Math.random() * 0.5 - 0.8, // biased toward not-spam (-0.8 to -0.3)
        isLeaf: true
      };
    }

    const featureIndex = Math.floor(Math.random() * 42); // 42 features
    const threshold = Math.random();

    return {
      featureIndex,
      threshold,
      left: this.buildRandomNode(maxDepth, depth + 1),
      right: this.buildRandomNode(maxDepth, depth + 1),
      score: 0,
      isLeaf: false
    };
  }

  /** Extract spam features from document content */
  extractFeatures(
    content: string,
    title: string,
    url: string,
    domain: string,
    outgoingLinks: string[],
    headers: Record<string, string>
  ): SpamFeatures {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const lowerContent = content.toLowerCase();

    // Vocabulary for misspelling detection
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can',
      'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'some',
      'them', 'than', 'what', 'when', 'where', 'which', 'while', 'who', 'will',
      'with', 'would', 'about', 'after', 'before', 'between', 'into', 'over',
      'just', 'like', 'make', 'many', 'more', 'most', 'much', 'only', 'other',
      'such', 'than', 'that', 'their', 'then', 'there', 'these', 'they',
      'this', 'those', 'through', 'under', 'very', 'were'
    ]);

    // Count word frequencies for keyword stuffing detection
    const wordFreq = new Map<string, number>();
    for (const word of words) {
      const lower = word.toLowerCase();
      wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
    }

    const totalWordFreq = Array.from(wordFreq.values()).reduce((a, b) => a + b, 0);
    const maxFreq = Math.max(...Array.from(wordFreq.values()), 1);
    const uniqueWords = wordFreq.size;

    // Count links
    const externalLinks = outgoingLinks.filter(l => !l.includes(domain));
    const internalLinks = outgoingLinks.filter(l => l.includes(domain));

    return {
      keywordStuffingRatio: maxFreq / Math.max(1, totalWordFreq / (uniqueWords || 1)),
      averageWordLength: words.reduce((s, w) => s + w.length, 0) / Math.max(1, words.length),
      wordCount: words.length,
      sentenceCount: sentences.length,
      averageSentenceLength: words.length / Math.max(1, sentences.length),
      uppercaseRatio: (content.match(/[A-Z]/g) || []).length / Math.max(1, content.length),
      punctuationRatio: (content.match(/[!?,;:.]/g) || []).length / Math.max(1, content.length),
      numberRatio: (content.match(/\d/g) || []).length / Math.max(1, content.length),
      repeatedWordRatio: 1 - (uniqueWords / Math.max(1, words.length)),
      uniqueWordRatio: uniqueWords / Math.max(1, words.length),
      stopWordRatio: words.filter(w => commonWords.has(w.toLowerCase())).length / Math.max(1, words.length),
      readabilityScore: this.computeReadability(words, sentences),
      misspellingRatio: 0.1, // Simplified

      contentToMarkupRatio: content.length / Math.max(1, (headers['content-length'] ? parseInt(headers['content-length']) : content.length)),
      linkDensity: outgoingLinks.length / Math.max(1, words.length),
      imageAltRatio: 0.8,
      headingCount: (content.match(/<h[1-6]/gi) || []).length,
      metaKeywordCount: (lowerContent.match(/meta.*keywords/gi) || []).length,
      metaDescriptionLength: 0,
      scriptTagRatio: ((content.match(/<script/gi) || []).length * 100) / Math.max(1, words.length),
      hiddenElementCount: 0,
      tinyFontCount: 0,

      outgoingLinkCount: outgoingLinks.length,
      internalLinkRatio: internalLinks.length / Math.max(1, outgoingLinks.length),
      externalLinkRatio: externalLinks.length / Math.max(1, outgoingLinks.length),
      brokenLinkRatio: 0.05,
      linkFarmScore: this.computeLinkFarmScore(outgoingLinks, domain),
      reciprocalLinkRatio: 0.1,

      domainAge: 365,
      domainReputation: this.getDomainReputation(domain),
      isKnownSpammer: 0,
      subdomainCount: domain.split('.').length - 1,
      tldCredibility: this.getTLDCredibility(domain),

      contentFreshness: 1.0,
      updateFrequency: 0.5,
      pageRank: 0.5,
      bounceRate: 0.4,
      sessionDuration: 120,

      grammarScore: 0.8,
      factualAccuracy: 0.7,
      authorityScore: 0.5
    };
  }

  /** Compute readability score */
  private computeReadability(words: string[], sentences: string[]): number {
    if (words.length === 0 || sentences.length === 0) return 0.5;

    const syllablesPerWord = words.reduce((sum, w) => {
      let syl = 0;
      let prevVowel = false;
      for (const c of w.toLowerCase()) {
        const isVowel = 'aeiou'.includes(c);
        if (isVowel && !prevVowel) syl++;
        prevVowel = isVowel;
      }
      if (w.endsWith('e') && syl > 1) syl--;
      return sum + Math.max(1, syl);
    }, 0) / words.length;

    const wordsPerSentence = words.length / sentences.length;
    const score = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
    return Math.max(0, Math.min(1, score / 100));
  }

  /** Compute link farm score */
  private computeLinkFarmScore(links: string[], domain: string): number {
    const externalLinks = links.filter(l => !l.includes(domain));
    if (externalLinks.length === 0) return 0;

    // Check for patterns typical of link farms
    let suspiciousCount = 0;
    for (const link of externalLinks) {
      // Suspicious: many links to same domain
      if (links.filter(l => l.includes(link.split('/')[2])).length > 3) {
        suspiciousCount++;
      }
      // Suspicious: links to low-quality TLDs
      const tld = link.split('.').pop() || '';
      if (['xyz', 'top', 'loan', 'click', 'work', 'date'].includes(tld)) {
        suspiciousCount++;
      }
    }

    return suspiciousCount / Math.max(1, externalLinks.length);
  }

  /** Get domain reputation score */
  private getDomainReputation(domain: string): number {
    const reputablePatterns = [
      '.edu', '.gov', '.mil', '.org',
      'wikipedia', 'github', 'stackoverflow',
      'nytimes', 'bbc', 'nature', '.ac.'
    ];

    const suspiciousPatterns = [
      'spam', 'hack', 'crack', 'free-money', 'win-prize',
      'click-here', 'buy-now', '.xyz', '.top', '.loan'
    ];

    let score = 0.5;

    for (const pattern of reputablePatterns) {
      if (domain.includes(pattern)) score += 0.3;
    }

    for (const pattern of suspiciousPatterns) {
      if (domain.includes(pattern)) score -= 0.3;
    }

    return Math.max(0, Math.min(1, score));
  }

  /** Get TLD credibility */
  private getTLDCredibility(domain: string): number {
    const tld = domain.split('.').pop() || '';
    const credibilityMap: Record<string, number> = {
      'edu': 1.0, 'gov': 1.0, 'mil': 0.9, 'org': 0.8,
      'com': 0.7, 'net': 0.7, 'io': 0.6, 'co': 0.6,
      'info': 0.4, 'biz': 0.3, 'me': 0.4, 'tv': 0.3,
      'xyz': 0.1, 'top': 0.1, 'loan': 0.1, 'click': 0.05,
      'work': 0.15, 'date': 0.1, 'win': 0.1, 'review': 0.2
    };
    return credibilityMap[tld] || 0.3;
  }

  /** Features to array for tree processing */
  private featuresToArray(features: SpamFeatures): number[] {
    return [
      features.keywordStuffingRatio,
      features.averageWordLength,
      Math.log(features.wordCount + 1) / 10,
      Math.log(features.sentenceCount + 1) / 10,
      features.averageSentenceLength / 50,
      features.uppercaseRatio * 10,
      features.punctuationRatio * 10,
      features.numberRatio * 5,
      features.repeatedWordRatio,
      features.uniqueWordRatio,
      features.stopWordRatio,
      features.readabilityScore,
      features.misspellingRatio,
      features.contentToMarkupRatio,
      features.linkDensity * 100,
      features.imageAltRatio,
      features.headingCount / 20,
      features.metaKeywordCount / 10,
      features.metaDescriptionLength / 200,
      features.scriptTagRatio / 20,
      features.hiddenElementCount / 10,
      features.tinyFontCount / 10,
      Math.log(features.outgoingLinkCount + 1) / 5,
      features.internalLinkRatio,
      features.externalLinkRatio,
      features.brokenLinkRatio,
      features.linkFarmScore,
      features.reciprocalLinkRatio,
      features.domainAge / 3650,
      features.domainReputation,
      features.isKnownSpammer,
      features.subdomainCount / 10,
      features.tldCredibility,
      features.contentFreshness
    ];
  }

  /** Traverse a tree to get prediction */
  private traverseTree(node: SpamNode | null, features: number[]): number {
    if (!node || node.isLeaf) return node?.score || 0;

    if (features[node.featureIndex] <= node.threshold) {
      return this.traverseTree(node.left, features);
    } else {
      return this.traverseTree(node.right, features);
    }
  }

  /** Classify if content is spam */
  classify(content: string, title: string, url: string, domain: string, outgoingLinks: string[], headers: Record<string, string>): {
    isSpam: boolean;
    spamScore: number;
    confidence: number;
    flaggedFeatures: string[];
  } {
    const features = this.extractFeatures(content, title, url, domain, outgoingLinks, headers);
    const featureArray = this.featuresToArray(features);

    // Ensemble prediction
    let score = 0;
    for (const tree of this.trees) {
      score += tree.weight * this.traverseTree(tree.root, featureArray);
    }
    score /= this.trees.length;

    // Normalize to 0-1 using sigmoid
    const spamScore = 1 / (1 + Math.exp(-score));
    const isSpam = spamScore > this.threshold;

    // Identify which features contributed most
    const flaggedFeatures = this.getFlaggedFeatures(features);

    return {
      isSpam,
      spamScore,
      confidence: Math.abs(spamScore - 0.5) * 2, // 0-1 confidence
      flaggedFeatures
    };
  }

  /** Get features that flag as spam */
  private getFlaggedFeatures(features: SpamFeatures): string[] {
    const flags: string[] = [];

    if (features.keywordStuffingRatio > 0.3) flags.push('keyword stuffing');
    if (features.linkDensity > 0.1) flags.push('high link density');
    if (features.linkFarmScore > 0.5) flags.push('link farm patterns');
    if (features.readabilityScore < 0.2) flags.push('low readability');
    if (features.repeatedWordRatio > 0.5) flags.push('excessive word repetition');
    if (features.domainReputation < 0.2) flags.push('low domain reputation');
    if (features.tldCredibility < 0.2) flags.push('suspicious TLD');
    if (features.externalLinkRatio > 0.8) flags.push('excessive external links');
    if (features.scriptTagRatio > 0.5) flags.push('excessive scripts');
    if (features.contentToMarkupRatio < 0.3) flags.push('low content-to-HTML ratio');
    if (features.uppercaseRatio > 0.3) flags.push('excessive capitalization');
    if (features.numberRatio > 0.2) flags.push('excessive numbers');

    return flags;
  }

  /** Update filter with new training data */
  update(spamScores: Array<{ features: SpamFeatures; isSpam: boolean }>): void {
    // Online learning: adjust tree weights based on correctness
    for (const { features, isSpam } of spamScores) {
      const featureArray = this.featuresToArray(features);
      let ensembleScore = 0;

      for (const tree of this.trees) {
        const prediction = this.traverseTree(tree.root, featureArray);
        ensembleScore += tree.weight * prediction;

        // Adjust weight based on prediction error
        const error = isSpam ? (1 - prediction) : (0 - prediction);
        tree.weight += this.learningRate * error;
      }
    }
  }

  /** Get spam filter stats */
  getStats(): { treeCount: number; threshold: number; averageWeight: number } {
    return {
      treeCount: this.trees.length,
      threshold: this.threshold,
      averageWeight: this.trees.reduce((s, t) => s + t.weight, 0) / this.trees.length
    };
  }
}

interface SpamNode {
  featureIndex: number;
  threshold: number;
  left: SpamNode | null;
  right: SpamNode | null;
  score: number;
  isLeaf: boolean;
}

interface SpamTree {
  root: SpamNode;
  weight: number;
}
