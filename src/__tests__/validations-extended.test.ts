import { describe, it, expect } from 'vitest';
import {
  variantFormSchema,
  storeSettingsSchema,
  checkoutFormSchema,
  productFormSchema,
} from '@/lib/validations';

describe('variantFormSchema', () => {
  const validVariant = {
    name: '18-inches',
    label: '18 Inches',
    price: 30000,
    stockQuantity: 25,
    sku: 'BR-18',
  };

  it('accepts valid variant data', () => {
    const result = variantFormSchema.safeParse(validVariant);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = variantFormSchema.safeParse({ ...validVariant, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty label', () => {
    const result = variantFormSchema.safeParse({ ...validVariant, label: '' });
    expect(result.success).toBe(false);
  });

  it('rejects zero price', () => {
    const result = variantFormSchema.safeParse({ ...validVariant, price: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative price', () => {
    const result = variantFormSchema.safeParse({
      ...validVariant,
      price: -500,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative stock', () => {
    const result = variantFormSchema.safeParse({
      ...validVariant,
      stockQuantity: -1,
    });
    expect(result.success).toBe(false);
  });

  it('allows zero stock', () => {
    const result = variantFormSchema.safeParse({
      ...validVariant,
      stockQuantity: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty sku', () => {
    const result = variantFormSchema.safeParse({ ...validVariant, sku: '' });
    expect(result.success).toBe(true);
  });

  it('coerces string price to number', () => {
    const result = variantFormSchema.safeParse({
      ...validVariant,
      price: '30000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(30000);
    }
  });
});

describe('storeSettingsSchema', () => {
  const validSettings = {
    storeName: 'Emmanuel Sarah Hair',
    storeEmail: 'hello@eshair.com',
    storePhone: '+2348012345678',
    whatsappNumber: '08012345678',
    shippingFee: 2500,
    freeShippingMin: 100000,
    announcementBar: 'Free shipping on orders over ₦100,000!',
    isMaintenanceMode: false,
  };

  it('accepts valid settings', () => {
    const result = storeSettingsSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
  });

  it('rejects empty store name', () => {
    const result = storeSettingsSchema.safeParse({
      ...validSettings,
      storeName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = storeSettingsSchema.safeParse({
      ...validSettings,
      storeEmail: 'not-email',
    });
    expect(result.success).toBe(false);
  });

  it('allows empty email', () => {
    const result = storeSettingsSchema.safeParse({
      ...validSettings,
      storeEmail: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative shipping fee', () => {
    const result = storeSettingsSchema.safeParse({
      ...validSettings,
      shippingFee: -100,
    });
    expect(result.success).toBe(false);
  });

  it('allows zero shipping fee (free shipping)', () => {
    const result = storeSettingsSchema.safeParse({
      ...validSettings,
      shippingFee: 0,
    });
    expect(result.success).toBe(true);
  });

  it('defaults isMaintenanceMode to false', () => {
    const { isMaintenanceMode, ...rest } = validSettings;
    const result = storeSettingsSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isMaintenanceMode).toBe(false);
    }
  });

  it('allows empty announcement bar', () => {
    const result = storeSettingsSchema.safeParse({
      ...validSettings,
      announcementBar: '',
    });
    expect(result.success).toBe(true);
  });
});

describe('checkoutFormSchema - edge cases', () => {
  const validData = {
    customerName: 'Ada Okonkwo',
    customerPhone: '08012345678',
    customerEmail: '',
    shippingAddress: '15 Admiralty Way, Lekki Phase 1',
    shippingCity: 'Lagos',
    shippingState: 'Lagos',
    notes: '',
  };

  it('accepts phone with 07 prefix', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      customerPhone: '07012345678',
    });
    expect(result.success).toBe(true);
  });

  it('accepts phone with 09 prefix', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      customerPhone: '09012345678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects phone with 06 prefix (not a valid Nigerian mobile prefix)', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      customerPhone: '06012345678',
    });
    expect(result.success).toBe(false);
  });

  it('rejects phone that is too short', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      customerPhone: '0801234',
    });
    expect(result.success).toBe(false);
  });

  it('rejects phone that is too long', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      customerPhone: '080123456789999',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short city name', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      shippingCity: 'L',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short state name', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      shippingState: 'L',
    });
    expect(result.success).toBe(false);
  });

  it('allows optional notes', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      notes: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('accepts notes with delivery instructions', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      notes: 'Please call before delivery. Gate code: 1234',
    });
    expect(result.success).toBe(true);
  });
});

describe('productFormSchema - edge cases', () => {
  const validProduct = {
    name: 'Brazilian Bundle',
    description: 'Premium quality Brazilian human hair bundle for natural look',
    categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    basePrice: 25000,
    stockQuantity: 50,
    isActive: true,
    isFeatured: false,
  };

  it('rejects zero price', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      basePrice: 0,
    });
    expect(result.success).toBe(false);
  });

  it('coerces string price to number', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      basePrice: '25000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.basePrice).toBe(25000);
    }
  });

  it('allows zero stock', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      stockQuantity: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-integer stock', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      stockQuantity: 5.5,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional tags as string', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      tags: 'premium,brazilian,human-hair',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty tags', () => {
    const result = productFormSchema.safeParse({ ...validProduct, tags: '' });
    expect(result.success).toBe(true);
  });

  it('accepts optional sku', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      sku: 'BR-BDL-001',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty short description', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      shortDescription: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short description over 160 chars', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      shortDescription: 'A'.repeat(161),
    });
    expect(result.success).toBe(false);
  });

  it('accepts compare-at price of 0', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      compareAtPrice: 0,
    });
    expect(result.success).toBe(true);
  });

  it('defaults isActive to true', () => {
    const { isActive, isFeatured, ...rest } = validProduct;
    const result = productFormSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it('defaults isFeatured to false', () => {
    const { isFeatured, ...rest } = validProduct;
    const result = productFormSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isFeatured).toBe(false);
    }
  });
});
