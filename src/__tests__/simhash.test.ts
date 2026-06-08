import { SimHash } from '../structures/simhash';

describe('SimHash', () => {
  let simhash: SimHash;

  beforeEach(() => {
    simhash = new SimHash(64, 15);
  });

  test('should generate consistent fingerprints for same content', () => {
    const content = 'This is a test document with some content for fingerprinting';
    const fp1 = simhash.compute(content);
    const fp2 = simhash.compute(content);
    expect(fp1).toBe(fp2);
  });

  test('similar documents should have small Hamming distance', () => {
    const doc1 = 'The quick brown fox jumps over the lazy dog';
    const doc2 = 'The quick brown fox jumps over the lazy cat';
    
    const fp1 = simhash.compute(doc1);
    const fp2 = simhash.compute(doc2);
    const distance = simhash.hammingDistance(fp1, fp2);
    
    expect(distance).toBeLessThan(10);
  });

  test('different documents should have large Hamming distance', () => {
    const doc1 = 'Artificial intelligence and machine learning are transforming technology';
    const doc2 = 'Sports teams compete in various athletic events around the world';
    
    const fp1 = simhash.compute(doc1);
    const fp2 = simhash.compute(doc2);
    const distance = simhash.hammingDistance(fp1, fp2);
    
    expect(distance).toBeGreaterThan(5);
  });

  test('should detect near-duplicates', () => {
    // Only 1 word differs out of 10, so fingerprints should be very close
    const original = 'Search engines index billions of pages and serve results very quickly today';
    const duplicate = 'Search engines index billions of pages and serve results very quickly now';
    
    const fp1 = simhash.compute(original);
    const fp2 = simhash.compute(duplicate);
    
    const isDup = simhash.isNearDuplicate(fp1, fp2);
    expect(isDup).toBe(true);
  });

  test('LSH buckets should group similar documents', () => {
    // Longer documents with only 1 differing word => many shared shingles
    const doc1 = 'The quick brown fox jumps over the lazy dog near the big brown fence by the green tree and the tall red house on the hill';
    const doc2 = 'The quick brown fox jumps over the lazy cat near the big brown fence by the green tree and the tall red house on the hill';
    const doc3 = 'Baseball basketball football soccer tennis sports athletics swimming cycling volleyball running gymnastics';
    
    const fp1 = simhash.compute(doc1);
    const fp2 = simhash.compute(doc2);
    const fp3 = simhash.compute(doc3);
    
    // Use 8 bands (8 bits each) for reliable LSH matching with 64-bit fingerprints
    const buckets1 = simhash.lshBuckets(fp1, 8);
    const buckets2 = simhash.lshBuckets(fp2, 8);
    const buckets3 = simhash.lshBuckets(fp3, 8);
    
    // Similar docs should share at least one bucket
    const shared = buckets1.filter(b => buckets2.includes(b));
    expect(shared.length).toBeGreaterThan(0);
    
    // Different docs should not share all buckets
    const sharedWithDiff = buckets1.filter(b => buckets3.includes(b));
    expect(sharedWithDiff.length).toBeLessThan(buckets1.length);
  });

  test('should find near-duplicates in a set', () => {
    const fingerprints = new Map<number, bigint>();
    
    // Longer documents for stable fingerprint comparison
    const doc1 = 'The quick brown fox jumps over the lazy dog near the big brown fence and the tall red house on the green hill';
    const doc2 = 'The quick brown fox jumps over the lazy cat near the big brown fence and the tall red house on the green hill';
    const doc3 = 'Quantum physics deals with subatomic particles and their strange behavior in the observable universe';
    
    fingerprints.set(1, simhash.compute(doc1));
    fingerprints.set(2, simhash.compute(doc2));
    fingerprints.set(3, simhash.compute(doc3));
    
    const duplicates = simhash.findNearDuplicates(fingerprints, 8);
    
    // Doc 1 and 2 should be near-duplicates
    const dupOf1 = duplicates.get(1);
    expect(dupOf1).toBeDefined();
    expect(dupOf1).toContain(2);
  });
});
