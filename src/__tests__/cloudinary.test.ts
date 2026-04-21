import { describe, it, expect } from 'vitest';
import { getUploadFolder } from '@/lib/cloudinary';

describe('getUploadFolder', () => {
  it('returns correct folder path for a product slug', () => {
    expect(getUploadFolder('brazilian-bundle')).toBe(
      'eshair/products/brazilian-bundle',
    );
  });

  it('handles slugs with multiple hyphens', () => {
    expect(getUploadFolder('peruvian-body-wave-bundle')).toBe(
      'eshair/products/peruvian-body-wave-bundle',
    );
  });

  it('handles single-word slug', () => {
    expect(getUploadFolder('wigs')).toBe('eshair/products/wigs');
  });

  it('always prefixes with eshair/products/', () => {
    const folder = getUploadFolder('any-product');
    expect(folder.startsWith('eshair/products/')).toBe(true);
  });
});
