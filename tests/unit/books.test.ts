import { describe, it, expect } from 'vitest';
import { getBookBySlug, getBookByOdrName, getBookByModernName, ALL_BOOKS } from '$lib/data/books';

describe('ALL_BOOKS', () => {
  it('contains 76 books', () => {
    expect(ALL_BOOKS.length).toBe(76);
  });

  it('has no duplicate slugs', () => {
    const slugs = ALL_BOOKS.map(b => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('marks NT books as having Confraternity', () => {
    const mark = ALL_BOOKS.find(b => b.slug === 'mark')!;
    expect(mark.hasConfraternity).toBe(true);
  });

  it('marks OT books as not having Confraternity', () => {
    const genesis = ALL_BOOKS.find(b => b.slug === 'genesis')!;
    expect(genesis.hasConfraternity).toBe(false);
  });
});

describe('getBookBySlug', () => {
  it('returns book for valid slug', () => {
    expect(getBookBySlug('mark')?.odrName).toBe('Mark');
  });

  it('returns undefined for invalid slug', () => {
    expect(getBookBySlug('notabook')).toBeUndefined();
  });
});

describe('getBookByOdrName', () => {
  it('resolves ODR name with Kings offset', () => {
    expect(getBookByOdrName('3 Kings')?.slug).toBe('3-kings');
  });

  it('resolves Josue', () => {
    expect(getBookByOdrName('Josue')?.slug).toBe('josue');
  });

  it('resolves Machabees', () => {
    expect(getBookByOdrName('1 Machabees')?.slug).toBe('1-machabees');
  });
});

describe('getBookByModernName', () => {
  it('resolves modern name to ODR slug', () => {
    expect(getBookByModernName('1 Samuel')?.slug).toBe('1-kings');
  });

  it('resolves Song of Solomon', () => {
    expect(getBookByModernName('Song of Solomon')?.slug).toBe('canticle-of-canticles');
  });

  it('resolves Revelation', () => {
    expect(getBookByModernName('Revelation')?.slug).toBe('apocalypse');
  });
});
