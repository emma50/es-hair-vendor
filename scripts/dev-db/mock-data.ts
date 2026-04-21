/**
 * Mock data generators.
 *
 * Deterministic-ish (seeded by index) so re-running populate produces
 * stable-ish output without needing faker as a dependency.
 */
import { MOCK } from './client';

// ── Small seeded pickers ─────────────────────────────────────────
function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length] as T;
}

function pad(n: number, width = 4): string {
  return n.toString().padStart(width, '0');
}

// ── Source data ──────────────────────────────────────────────────
const FIRST_NAMES = [
  'Ada',
  'Chioma',
  'Ngozi',
  'Funke',
  'Amaka',
  'Blessing',
  'Tolu',
  'Ifeoma',
  'Kemi',
  'Zainab',
  'Halima',
  'Aisha',
  'Yewande',
  'Bolaji',
  'Temi',
] as const;

const LAST_NAMES = [
  'Okafor',
  'Adeyemi',
  'Balogun',
  'Eze',
  'Nwosu',
  'Bello',
  'Olawale',
  'Okonkwo',
  'Ibrahim',
  'Onyeka',
  'Adebayo',
  'Mohammed',
] as const;

const STATES = [
  'Lagos',
  'Abuja',
  'Rivers',
  'Oyo',
  'Kano',
  'Enugu',
  'Delta',
  'Kaduna',
] as const;

const CITIES = [
  'Lekki',
  'Ikeja',
  'Victoria Island',
  'Surulere',
  'Port Harcourt',
  'Ibadan',
  'Abuja',
  'Enugu',
] as const;

const PRODUCT_THEMES = [
  {
    base: 'Brazilian Body Wave',
    desc: 'Soft, bouncy body wave texture. 100% virgin human hair.',
  },
  {
    base: 'Peruvian Straight',
    desc: 'Sleek, silky straight bundles with natural luster.',
  },
  {
    base: 'Malaysian Deep Wave',
    desc: 'Deep wave pattern that holds its curl beautifully wet or dry.',
  },
  {
    base: 'Indian Curly',
    desc: 'Tight, defined curls sourced from Indian temple hair.',
  },
  {
    base: 'HD Lace Frontal',
    desc: 'Ultra-thin HD lace that melts into every skin tone.',
  },
  {
    base: 'Closure Wig',
    desc: 'Pre-made closure wig, ready to wear out of the box.',
  },
] as const;

const LENGTHS = [12, 14, 16, 18, 20, 22, 24, 26] as const;

// ── Public types ─────────────────────────────────────────────────
export interface MockProductInput {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  basePrice: number;
  compareAtPrice: number | null;
  sku: string;
  stockQuantity: number;
  isFeatured: boolean;
  tags: string[];
  images: { url: string; publicId: string; alt: string; isPrimary: boolean }[];
  variants: {
    name: string;
    label: string;
    price: number;
    stockQuantity: number;
    sku: string;
  }[];
}

export interface MockOrderInput {
  orderNumber: string;
  channel: 'PAYSTACK' | 'WHATSAPP';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  notes: string | null;
}

// ── Generators ───────────────────────────────────────────────────

/**
 * Generate `count` mock products. Each product has a MOCK- SKU prefix and
 * the "mock" tag for safe identification later.
 */
export function generateMockProducts(count: number): MockProductInput[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const theme = pick(PRODUCT_THEMES, i);
    const length = pick(LENGTHS, i);
    const basePrice = 45000 + (i % 10) * 5000;
    const hasCompareAt = i % 3 === 0;
    const name = `${theme.base} ${length}"`;
    // Unique slug + SKU per run so populate can be called multiple times
    const suffix = `${now}-${pad(i)}`;

    return {
      name: `[MOCK] ${name}`,
      slug: `mock-${theme.base.toLowerCase().replace(/\s+/g, '-')}-${length}-${suffix}`,
      description: `${theme.desc} Length: ${length} inches. This is mock data for development.`,
      shortDescription: `${theme.base} ${length}" — dev mock.`,
      basePrice,
      compareAtPrice: hasCompareAt ? basePrice + 15000 : null,
      sku: `${MOCK.skuPrefix}${pad(i)}-${length}`,
      stockQuantity: 5 + (i % 20),
      isFeatured: i % 4 === 0,
      tags: [MOCK.productTag, theme.base.toLowerCase().split(' ')[0]!],
      images: [
        {
          url: `https://placehold.co/800x800/1a1a1a/d4a853?text=${encodeURIComponent(name)}`,
          publicId: `mock/products/${suffix}-primary`,
          alt: name,
          isPrimary: true,
        },
      ],
      variants:
        i % 2 === 0
          ? LENGTHS.slice(0, 3).map((len, vi) => ({
              name: `${len}"`,
              label: `${len} inches`,
              price: basePrice + vi * 5000,
              stockQuantity: 3 + vi * 2,
              sku: `${MOCK.skuPrefix}${pad(i)}-V${vi}`,
            }))
          : [],
    };
  });
}

/**
 * Generate `count` mock orders. Line items are populated by the caller
 * from the mock products actually in the database.
 */
export function generateMockOrders(count: number): MockOrderInput[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const first = pick(FIRST_NAMES, i);
    const last = pick(LAST_NAMES, i + 1);
    const subtotal = 50000 + (i % 10) * 7500;
    const shippingCost = subtotal >= 100000 ? 0 : 3500;

    return {
      orderNumber: `${MOCK.orderPrefix}${now}-${pad(i)}`,
      channel: i % 2 === 0 ? 'PAYSTACK' : 'WHATSAPP',
      customerName: `${first} ${last}`,
      customerEmail: `${first.toLowerCase()}.${last.toLowerCase()}${MOCK.emailDomain}`,
      customerPhone: `+23480${pad(10000000 + i, 8)}`,
      shippingAddress: `${i + 1} ${pick(LAST_NAMES, i)} Street`,
      shippingCity: pick(CITIES, i),
      shippingState: pick(STATES, i),
      subtotal,
      shippingCost,
      total: subtotal + shippingCost,
      notes: i % 3 === 0 ? 'Please call before delivery.' : null,
    };
  });
}

/**
 * Generate `count` mock email subscribers. Addresses always end with the
 * mock domain so they can be safely deleted.
 */
export function generateMockSubscribers(count: number): { email: string }[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const first = pick(FIRST_NAMES, i);
    return { email: `${first.toLowerCase()}.${now}.${i}${MOCK.emailDomain}` };
  });
}
