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
    contentToMarkupRatio: number;
    linkDensity: number;
    imageAltRatio: number;
    headingCount: number;
    metaKeywordCount: number;
    metaDescriptionLength: number;
    scriptTagRatio: number;
    hiddenElementCount: number;
    tinyFontCount: number;
    outgoingLinkCount: number;
    internalLinkRatio: number;
    externalLinkRatio: number;
    brokenLinkRatio: number;
    linkFarmScore: number;
    reciprocalLinkRatio: number;
    domainAge: number;
    domainReputation: number;
    isKnownSpammer: number;
    subdomainCount: number;
    tldCredibility: number;
    contentFreshness: number;
    updateFrequency: number;
    pageRank: number;
    bounceRate: number;
    sessionDuration: number;
    grammarScore: number;
    factualAccuracy: number;
    authorityScore: number;
}
export declare class SpamFilter {
    private trees;
    private numTrees;
    private learningRate;
    private threshold;
    constructor(numTrees?: number, threshold?: number);
    /** Initialize ensemble of decision trees */
    private initializeTrees;
    /** Build a random decision tree */
    private buildRandomTree;
    /** Build a random decision tree node */
    private buildRandomNode;
    /** Extract spam features from document content */
    extractFeatures(content: string, title: string, url: string, domain: string, outgoingLinks: string[], headers: Record<string, string>): SpamFeatures;
    /** Compute readability score */
    private computeReadability;
    /** Compute link farm score */
    private computeLinkFarmScore;
    /** Get domain reputation score */
    private getDomainReputation;
    /** Get TLD credibility */
    private getTLDCredibility;
    /** Features to array for tree processing */
    private featuresToArray;
    /** Traverse a tree to get prediction */
    private traverseTree;
    /** Classify if content is spam */
    classify(content: string, title: string, url: string, domain: string, outgoingLinks: string[], headers: Record<string, string>): {
        isSpam: boolean;
        spamScore: number;
        confidence: number;
        flaggedFeatures: string[];
    };
    /** Get features that flag as spam */
    private getFlaggedFeatures;
    /** Update filter with new training data */
    update(spamScores: Array<{
        features: SpamFeatures;
        isSpam: boolean;
    }>): void;
    /** Get spam filter stats */
    getStats(): {
        treeCount: number;
        threshold: number;
        averageWeight: number;
    };
}
export {};
//# sourceMappingURL=spam-filter.d.ts.map