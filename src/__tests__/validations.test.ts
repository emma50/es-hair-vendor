import { describe, it, expect } from 'vitest';
import {
  emailSubscribeSchema,
  checkoutFormSchema,
  productFormSchema,
  categoryFormSchema,
} from '@/lib/validations';

describe('emailSubscribeSchema', () => {
  it('accepts a valid email', () => {
    const result = emailSubscribeSchema.safeParse({
      email: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = emailSubscribeSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty string', () => {
    const result = emailSubscribeSchema.safeParse({ email: '' });
    expect(result.success).toBe(false);
  });
});

describe('checkoutFormSchema', () => {
  const validData = {
    customerName: 'John Doe',
    customerPhone: '08012345678',
    customerEmail: 'john@example.com',
    shippingAddress: '123 Main Street, Lekki',
    shippingCity: 'Lagos',
    shippingState: 'Lagos',
    notes: '',
  };

  it('accepts valid data', () => {
    const result = checkoutFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects a short name', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      customerName: 'J',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid phone number', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      customerPhone: '123',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid Nigerian phone with +234', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      customerPhone: '+2348012345678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing address', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      shippingAddress: 'ab',
    });
    expect(result.success).toBe(false);
  });

  it('allows optional email to be empty', () => {
    const result = checkoutFormSchema.safeParse({
      ...validData,
      customerEmail: '',
    });
    expect(result.success).toBe(true);
  });
});

describe('productFormSchema', () => {
  const validProduct = {
    name: 'Brazilian Bundle',
    description: 'Premium quality Brazilian human hair bundle',
    categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    basePrice: 25000,
    stockQuantity: 50,
    isActive: true,
    isFeatured: false,
  };

  it('accepts valid product data', () => {
    const result = productFormSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('rejects negative price', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      basePrice: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing category', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      categoryId: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short description', () => {
    const result = productFormSchema.safeParse({
      ...validProduct,
      description: 'Short',
    });
    expect(result.success).toBe(false);
  });
});

describe('categoryFormSchema', () => {
  it('accepts a valid category', () => {
    const result = categoryFormSchema.safeParse({
      name: 'Bundles',
      description: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = categoryFormSchema.safeParse({ name: '', description: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a single-character name', () => {
    const result = categoryFormSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });
});
