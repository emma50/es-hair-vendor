/**
 * Demo catalog populator.
 *
 * Populates the database with the curated showroom dataset: 4 categories,
 * 13 products (with images and variants), and 5 sample orders. This is
 * the "what Sarah's store looks like with content in it" dataset — NOT
 * the defaults every database must have. True defaults (StoreSettings
 * singleton) live in `prisma/seed.ts`.
 *
 * Usage:
 *   pnpm db:demo:populate          # idempotent — safe to re-run
 *
 * Design notes:
 *   - Uses upsert-by-slug for Category and Product, so re-running the
 *     script refreshes descriptions/prices/stock without disturbing any
 *     admin-created rows that have different slugs.
 *   - Images and variants attached to a demo product are fully replaced
 *     on each run (scoped to the demo product only — admin products are
 *     never touched).
 *   - Sample orders are matched by orderNumber; existing orders are
 *     skipped so re-running never creates duplicates or wipes real
 *     customer data.
 *   - Inherits the production guard from `src/lib/db-admin.ts` — refuses
 *     to run against a DATABASE_URL that looks like production.
 */
import { randomBytes } from 'node:crypto';
import { prisma, runScript } from './client';

// ---------------------------------------------------------------------------
// High-quality Unsplash images (free license, publicly accessible)
// Using direct URLs with optimized sizing for product cards & galleries
// ---------------------------------------------------------------------------
const IMG = {
  // Bundles — wavy, straight, deep wave, curly hair textures
  brazilianBodyWave: [
    'https://images.unsplash.com/photo-1605169811917-69c3ed745335?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1718376919034-094300669109?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531872666280-7383ade0b4c4?w=800&h=800&fit=crop&q=80',
  ],
  peruvianStraight: [
    'https://plus.unsplash.com/premium_photo-1661286610613-58cb2d892c5d?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1707198729998-00e7ade16e4d?w=800&h=800&fit=crop&q=80',
    'https://plus.unsplash.com/premium_photo-1661286689761-a0f68dff360f?w=800&h=800&fit=crop&q=80',
  ],
  malaysianDeepWave: [
    'https://images.unsplash.com/photo-1634746715098-6cafbc6a7a00?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1640237497443-bdca8d04818f?w=800&h=800&fit=crop&q=80',
  ],
  indianCurly: [
    'https://images.unsplash.com/photo-1649312555826-e42566d05d15?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1656473031961-9d5d9ee19f40?w=800&h=800&fit=crop&q=80',
  ],
  // Closures & Frontals — close-up parting / scalp views
  closure4x4: [
    'https://images.unsplash.com/photo-1663582816158-42354522fe15?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1663582815337-52558dc2f9fd?w=800&h=800&fit=crop&q=80',
  ],
  frontal13x4: [
    'https://images.unsplash.com/photo-1663582816260-ea903f9441eb?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1663582816222-0058880a9fdc?w=800&h=800&fit=crop&q=80',
  ],
  frontal13x6: [
    'https://images.unsplash.com/photo-1634746715098-6cafbc6a7a00?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1640237497443-bdca8d04818f?w=800&h=800&fit=crop&q=80',
  ],
  // Wigs — styled hair on models
  bodyWaveWig: [
    'https://plus.unsplash.com/premium_photo-1661290269611-2967bbd58369?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1565906353471-db6555b67554?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1654168080461-87e8081d68c7?w=800&h=800&fit=crop&q=80',
  ],
  straightBobWig: [
    'https://images.unsplash.com/photo-1562767172-d72f880669ef?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1614435763665-faf28450accc?w=800&h=800&fit=crop&q=80',
  ],
  deepWaveWig: [
    'https://images.unsplash.com/photo-1760551937980-74ed4e89c8b0?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1675881149208-ac7db8cf2785?w=800&h=800&fit=crop&q=80',
  ],
  // Accessories
  satinBonnet: [
    'https://images.unsplash.com/photo-1588554615944-63c18a0b61b8?w=800&h=800&fit=crop&q=80',
  ],
  wideToothComb: [
    'https://images.unsplash.com/photo-1713180758582-9bac6bc62a26?w=800&h=800&fit=crop&q=80',
  ],
  edgeControl: [
    'https://images.unsplash.com/photo-1699158660334-57ba99b538d7?w=800&h=800&fit=crop&q=80',
  ],
  // Categories
  catBundles:
    'https://images.unsplash.com/photo-1605169811917-69c3ed745335?w=600&h=400&fit=crop&q=80',
  catClosures:
    'https://images.unsplash.com/photo-1663582816158-42354522fe15?w=600&h=400&fit=crop&q=80',
  catWigs:
    'https://plus.unsplash.com/premium_photo-1661290269611-2967bbd58369?w=600&h=400&fit=crop&q=80',
  catAccessories:
    'https://images.unsplash.com/photo-1588554615944-63c18a0b61b8?w=600&h=400&fit=crop&q=80',
};

async function main() {
  console.log('🎨 Populating demo catalog...\n');

  // StoreSettings is NOT seeded here — that's a true default managed by
  // `prisma/seed.ts`. This script only touches showroom content.

  // ─── Categories ─────────────────────────────────────────────────
  const categories = [
    {
      name: 'Bundles',
      slug: 'bundles',
      description:
        'Premium 100% virgin human hair bundles in body wave, straight, deep wave, and curly textures. Available in lengths from 10" to 30".',
      image: IMG.catBundles,
      sortOrder: 1,
    },
    {
      name: 'Closures & Frontals',
      slug: 'closures-frontals',
      description:
        'Swiss and HD lace closures (4x4, 5x5) and frontals (13x4, 13x6) for a seamless, natural-looking install.',
      image: IMG.catClosures,
      sortOrder: 2,
    },
    {
      name: 'Wigs',
      slug: 'wigs',
      description:
        'Ready-to-wear human hair wigs — full lace, lace front, and headband styles. Pre-plucked, pre-styled, and glueless options.',
      image: IMG.catWigs,
      sortOrder: 3,
    },
    {
      name: 'Accessories',
      slug: 'accessories',
      description:
        'Hair care essentials — satin bonnets, wide-tooth combs, edge control, silk pillowcases, and styling tools.',
      image: IMG.catAccessories,
      sortOrder: 4,
    },
  ];

  const categoryRecords: Record<string, string> = {};

  for (const cat of categories) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { description: cat.description, image: cat.image },
      create: cat,
    });
    categoryRecords[cat.slug] = record.id;
  }
  console.log('✅ Categories seeded');

  // ─── Products ───────────────────────────────────────────────────
  const products = [
    // === BUNDLES ===
    {
      name: 'Brazilian Body Wave Bundle',
      slug: 'brazilian-body-wave-bundle',
      description:
        'Our best-selling Brazilian body wave bundle delivers effortless, bouncy curls with a natural lustre. Made from 100% unprocessed virgin human hair, each bundle is carefully selected for consistent texture from root to tip.\n\n• Weight: 100g per bundle\n• Texture: Body wave with natural S-pattern\n• Origin: Brazilian virgin hair\n• Can be colored, bleached, permed, and heat-styled\n• Double-weft construction prevents shedding\n• Lasts 12–18 months with proper care\n• Available in 10"–30" lengths',
      shortDescription:
        'Premium Brazilian body wave — soft, bouncy, and versatile. 100g, double-weft.',
      categoryId: categoryRecords['bundles'],
      basePrice: 45000,
      compareAtPrice: 55000,
      sku: 'BDL-BZ-BW-001',
      stockQuantity: 48,
      isFeatured: true,
      tags: ['brazilian', 'body-wave', 'bundle', 'best-seller', 'virgin-hair'],
      metadata: {
        weight: '100g',
        origin: 'Brazil',
        texture: 'Body Wave',
        lengths: [
          '10"',
          '12"',
          '14"',
          '16"',
          '18"',
          '20"',
          '22"',
          '24"',
          '26"',
          '28"',
          '30"',
        ],
        careInstructions:
          'Wash with sulfate-free shampoo. Air dry or blow-dry on low heat. Use a wide-tooth comb to detangle from ends to roots.',
      },
      images: IMG.brazilianBodyWave,
    },
    {
      name: 'Peruvian Straight Bundle',
      slug: 'peruvian-straight-bundle',
      description:
        'Sleek, silky, and naturally straight — our Peruvian straight bundles are perfect for a polished, sophisticated look. The lightweight, bouncy texture blends seamlessly with relaxed or natural hair.\n\n• Weight: 100g per bundle\n• Texture: Naturally straight with slight body\n• Origin: Peruvian virgin hair\n• Minimal shedding, tangle-free\n• Double-drawn for consistent fullness\n• Heat-friendly up to 400°F\n• Available in 10"–28" lengths',
      shortDescription:
        'Silky straight Peruvian bundle — sleek, lightweight, double-drawn.',
      categoryId: categoryRecords['bundles'],
      basePrice: 42000,
      sku: 'BDL-PR-ST-001',
      stockQuantity: 35,
      isFeatured: true,
      tags: ['peruvian', 'straight', 'bundle', 'virgin-hair', 'double-drawn'],
      metadata: {
        weight: '100g',
        origin: 'Peru',
        texture: 'Straight',
        lengths: [
          '10"',
          '12"',
          '14"',
          '16"',
          '18"',
          '20"',
          '22"',
          '24"',
          '26"',
          '28"',
        ],
        careInstructions:
          'Co-wash weekly. Apply argan oil serum for extra shine. Wrap hair at night with a satin scarf or bonnet.',
      },
      images: IMG.peruvianStraight,
    },
    {
      name: 'Malaysian Deep Wave Bundle',
      slug: 'malaysian-deep-wave-bundle',
      description:
        'Luxurious deep wave texture with well-defined, tight curls that hold their pattern beautifully. Our Malaysian deep wave bundles are sourced from single donors for superior quality and consistency.\n\n• Weight: 100g per bundle\n• Texture: Deep wave (tight, defined curls)\n• Origin: Malaysian virgin hair\n• Single-donor collection\n• Can be flat-ironed straight and reverts when wet\n• Tangle-resistant, minimal shedding\n• Available in 10"–26" lengths',
      shortDescription:
        'Malaysian deep wave — tight curls, single-donor, tangle-resistant.',
      categoryId: categoryRecords['bundles'],
      basePrice: 48000,
      compareAtPrice: 58000,
      sku: 'BDL-MY-DW-001',
      stockQuantity: 22,
      isFeatured: true,
      tags: ['malaysian', 'deep-wave', 'bundle', 'single-donor', 'virgin-hair'],
      metadata: {
        weight: '100g',
        origin: 'Malaysia',
        texture: 'Deep Wave',
        lengths: [
          '10"',
          '12"',
          '14"',
          '16"',
          '18"',
          '20"',
          '22"',
          '24"',
          '26"',
        ],
        careInstructions:
          'Finger-detangle before washing. Use a moisturizing conditioner. Scrunch curls with a microfiber towel — avoid rubbing.',
      },
      images: IMG.malaysianDeepWave,
    },
    {
      name: 'Indian Curly Bundle',
      slug: 'indian-curly-bundle',
      description:
        'Beautiful, bouncy curls with incredible volume and natural movement. Our Indian curly bundles are ethically sourced from temples and carefully processed to maintain the natural curl pattern.\n\n• Weight: 100g per bundle\n• Texture: Loose to tight curly (3B–3C pattern)\n• Origin: Indian temple hair\n• Ethically sourced, single-donor\n• Color-safe and heat-safe\n• Retains curl pattern after washing\n• Available in 10"–24" lengths',
      shortDescription:
        'Indian temple curly hair — bouncy, voluminous, ethically sourced.',
      categoryId: categoryRecords['bundles'],
      basePrice: 50000,
      compareAtPrice: 62000,
      sku: 'BDL-IN-CR-001',
      stockQuantity: 15,
      tags: ['indian', 'curly', 'bundle', 'temple-hair', 'ethical'],
      metadata: {
        weight: '100g',
        origin: 'India',
        texture: 'Curly (3B-3C)',
        lengths: ['10"', '12"', '14"', '16"', '18"', '20"', '22"', '24"'],
        careInstructions:
          'Deep condition bi-weekly. Apply leave-in conditioner and curl cream. Sleep on a satin pillowcase.',
      },
      images: IMG.indianCurly,
    },

    // === CLOSURES & FRONTALS ===
    {
      name: '4x4 Lace Closure — Body Wave',
      slug: '4x4-lace-closure-body-wave',
      description:
        'Our Swiss lace 4x4 closure delivers a natural-looking part that blends invisibly with your scalp. Pre-plucked hairline with baby hairs for a realistic finish.\n\n• Size: 4" × 4"\n• Lace type: Swiss lace (transparent)\n• Texture: Body wave\n• Pre-plucked hairline with baby hairs\n• Free part — can be parted anywhere within the closure\n• Bleached knots for invisible grid\n• 130% density\n• Available in 10"–20" lengths',
      shortDescription:
        '4x4 Swiss lace closure — pre-plucked, body wave, invisible blending.',
      categoryId: categoryRecords['closures-frontals'],
      basePrice: 28000,
      compareAtPrice: 35000,
      sku: 'CLS-4x4-BW-001',
      stockQuantity: 20,
      isFeatured: true,
      tags: ['closure', '4x4', 'body-wave', 'swiss-lace', 'pre-plucked'],
      metadata: {
        size: '4x4',
        laceType: 'Swiss Lace',
        texture: 'Body Wave',
        density: '130%',
        lengths: ['10"', '12"', '14"', '16"', '18"', '20"'],
        features: ['Pre-plucked', 'Baby hairs', 'Bleached knots', 'Free part'],
      },
      images: IMG.closure4x4,
    },
    {
      name: '13x4 Lace Frontal — Straight',
      slug: '13x4-lace-frontal-straight',
      description:
        'Full ear-to-ear coverage with our 13x4 HD lace frontal. The ultra-thin HD lace melts into any skin tone for a completely undetectable hairline.\n\n• Size: 13" × 4"\n• Lace type: HD (high-definition) lace\n• Texture: Straight\n• Ear-to-ear coverage\n• Pre-plucked natural hairline\n• Versatile parting (left, right, middle)\n• 150% density\n• Available in 12"–24" lengths',
      shortDescription:
        '13x4 HD lace frontal — ear-to-ear, straight, undetectable.',
      categoryId: categoryRecords['closures-frontals'],
      basePrice: 38000,
      sku: 'FRT-13x4-ST-001',
      stockQuantity: 14,
      tags: ['frontal', '13x4', 'straight', 'hd-lace'],
      metadata: {
        size: '13x4',
        laceType: 'HD Lace',
        texture: 'Straight',
        density: '150%',
        lengths: ['12"', '14"', '16"', '18"', '20"', '22"', '24"'],
        features: [
          'Pre-plucked',
          'Ear-to-ear',
          'HD invisible lace',
          'Versatile parting',
        ],
      },
      images: IMG.frontal13x4,
    },
    {
      name: '13x6 HD Lace Frontal — Deep Wave',
      slug: '13x6-hd-lace-frontal-deep-wave',
      description:
        'Maximum versatility with our 13x6 deep parting frontal. The extra-deep lace space allows for deep side parts, middle parts, and even pulled-back styles.\n\n• Size: 13" × 6"\n• Lace type: HD (high-definition) lace\n• Texture: Deep wave\n• Deep parting space for styling versatility\n• Pre-plucked with realistic hairline\n• Can be worn glueless with adjustable band\n• 150% density\n• Available in 14"–26" lengths',
      shortDescription:
        '13x6 deep parting HD frontal — deep wave, glueless-ready.',
      categoryId: categoryRecords['closures-frontals'],
      basePrice: 52000,
      compareAtPrice: 65000,
      sku: 'FRT-13x6-DW-001',
      stockQuantity: 9,
      isFeatured: true,
      tags: ['frontal', '13x6', 'deep-wave', 'hd-lace', 'glueless'],
      metadata: {
        size: '13x6',
        laceType: 'HD Lace',
        texture: 'Deep Wave',
        density: '150%',
        lengths: ['14"', '16"', '18"', '20"', '22"', '24"', '26"'],
        features: [
          'Deep parting',
          'Glueless option',
          'Pre-plucked',
          'Adjustable band',
        ],
      },
      images: IMG.frontal13x6,
    },

    // === WIGS ===
    {
      name: 'Body Wave Full Lace Wig',
      slug: 'body-wave-full-lace-wig',
      description:
        'Our signature body wave full lace wig is ready to wear straight out of the box. Made with 100% virgin human hair on a full lace cap, it offers 360° styling freedom — pull it into a ponytail, bun, or wear it down.\n\n• Cap: Full lace construction\n• Density: 180%\n• Texture: Body wave\n• Pre-plucked hairline with baby hairs\n• Adjustable straps + 3 combs for secure fit\n• Can be parted anywhere on the cap\n• Glueless option available\n• Cap sizes: Small, Medium, Large\n• Available in 14"–28" lengths',
      shortDescription:
        'Full lace body wave wig — 180% density, 360° styling, ready-to-wear.',
      categoryId: categoryRecords['wigs'],
      basePrice: 120000,
      compareAtPrice: 150000,
      sku: 'WIG-FL-BW-001',
      stockQuantity: 8,
      isFeatured: true,
      tags: ['wig', 'body-wave', 'full-lace', 'glueless', '180-density'],
      metadata: {
        capType: 'Full Lace',
        density: '180%',
        texture: 'Body Wave',
        capSizes: ['Small (21")', 'Medium (22")', 'Large (23")'],
        lengths: ['14"', '16"', '18"', '20"', '22"', '24"', '26"', '28"'],
        features: [
          'Pre-plucked',
          'Baby hairs',
          'Glueless',
          'Adjustable straps',
          '3 combs',
        ],
      },
      images: IMG.bodyWaveWig,
    },
    {
      name: 'Straight Bob Lace Front Wig',
      slug: 'straight-bob-lace-front-wig',
      description:
        'Chic, effortless, and low-maintenance — our straight bob lace front wig is the perfect everyday wig. The blunt-cut bob falls just below the chin for a modern, sophisticated silhouette.\n\n• Cap: 13x4 lace front\n• Density: 150%\n• Texture: Silky straight (blunt cut)\n• Length: 10"–14" (short bob)\n• Pre-styled and pre-cut\n• Beginner-friendly — easy install\n• Lightweight and breathable cap\n• Cap sizes: Small, Medium, Large',
      shortDescription:
        'Blunt-cut straight bob — 13x4 lace front, beginner-friendly.',
      categoryId: categoryRecords['wigs'],
      basePrice: 75000,
      compareAtPrice: 95000,
      sku: 'WIG-LF-SB-001',
      stockQuantity: 12,
      isFeatured: true,
      tags: ['wig', 'straight', 'bob', 'lace-front', 'beginner-friendly'],
      metadata: {
        capType: '13x4 Lace Front',
        density: '150%',
        texture: 'Silky Straight (Blunt Bob)',
        capSizes: ['Small (21")', 'Medium (22")', 'Large (23")'],
        lengths: ['10"', '12"', '14"'],
        features: ['Pre-styled', 'Pre-cut', 'Lightweight cap', 'Easy install'],
      },
      images: IMG.straightBobWig,
    },
    {
      name: 'Deep Wave Headband Wig',
      slug: 'deep-wave-headband-wig',
      description:
        'No lace, no glue, no stress. Our deep wave headband wig installs in under 2 minutes — just slip it on, adjust the headband, and go. Perfect for beginners or anyone who wants a protective style without the commitment.\n\n• Cap: Headband wig (no lace)\n• Density: 150%\n• Texture: Deep wave\n• Zero-skill installation\n• Comes with 3 interchangeable headbands\n• Adjustable velcro strap\n• Protective style — no glue, no heat\n• Cap sizes: One size fits most\n• Available in 14"–24" lengths',
      shortDescription:
        'Deep wave headband wig — no lace, no glue, 2-minute install.',
      categoryId: categoryRecords['wigs'],
      basePrice: 55000,
      sku: 'WIG-HB-DW-001',
      stockQuantity: 18,
      tags: ['wig', 'deep-wave', 'headband', 'glueless', 'beginner-friendly'],
      metadata: {
        capType: 'Headband (no lace)',
        density: '150%',
        texture: 'Deep Wave',
        capSizes: ['One size fits most'],
        lengths: ['14"', '16"', '18"', '20"', '22"', '24"'],
        features: [
          'No lace',
          'No glue',
          '3 headbands included',
          '2-minute install',
        ],
      },
      images: IMG.deepWaveWig,
    },

    // === ACCESSORIES ===
    {
      name: 'Luxury Satin Bonnet',
      slug: 'luxury-satin-bonnet',
      description:
        'Protect your investment while you sleep. Our oversized luxury satin bonnet keeps your hair moisturized, frizz-free, and tangle-free overnight. The double-layered satin prevents friction damage and preserves curl patterns.\n\n• Material: 100% mulberry silk satin (double-layer)\n• Size: Oversized — fits all hair lengths and styles\n• Elastic band: Soft, adjustable, no headaches\n• Colors: Black, Gold, Champagne\n• Machine washable\n• Works for bundles, wigs, braids, and natural hair',
      shortDescription:
        'Oversized satin bonnet — double-layer silk, preserves styles overnight.',
      categoryId: categoryRecords['accessories'],
      basePrice: 5500,
      compareAtPrice: 8000,
      sku: 'ACC-SB-001',
      stockQuantity: 50,
      isFeatured: true,
      tags: ['bonnet', 'satin', 'silk', 'hair-care', 'sleep-protection'],
      metadata: {
        material: '100% Mulberry Silk Satin',
        size: 'Oversized (fits all)',
        colors: ['Black', 'Gold', 'Champagne'],
        careInstructions: 'Machine wash cold. Lay flat to dry.',
      },
      images: IMG.satinBonnet,
    },
    {
      name: 'Detangling Wide-Tooth Comb',
      slug: 'detangling-wide-tooth-comb',
      description:
        'The essential tool for gentle detangling. Our wide-tooth comb glides through wet or dry hair without pulling, breaking, or damaging delicate strands.\n\n• Material: Heat-resistant, anti-static carbon fiber\n• Teeth spacing: Extra-wide for snag-free detangling\n• Works on all textures — straight, wavy, curly, coily\n• Seamless teeth — no snagging or splitting\n• Lightweight and travel-friendly\n• Also great for even product distribution',
      shortDescription:
        'Anti-static wide-tooth comb — gentle detangling for all textures.',
      categoryId: categoryRecords['accessories'],
      basePrice: 3500,
      sku: 'ACC-WC-001',
      stockQuantity: 75,
      tags: ['comb', 'wide-tooth', 'detangling', 'hair-tool'],
      metadata: {
        material: 'Carbon Fiber',
        features: [
          'Anti-static',
          'Heat-resistant',
          'Seamless teeth',
          'Travel-friendly',
        ],
      },
      images: IMG.wideToothComb,
    },
    {
      name: 'Edge Control Gel — Strong Hold',
      slug: 'edge-control-gel-strong-hold',
      description:
        'Lay your edges to perfection with our non-flaking, humidity-resistant edge control. Infused with castor oil and biotin for nourishment while styling. Provides 24-hour hold without stiffness or white residue.\n\n• Hold: Strong (24-hour)\n• Key ingredients: Castor oil, biotin, vitamin E\n• Humidity-resistant — no reversion\n• Non-flaking, non-greasy formula\n• Pleasant coconut vanilla scent\n• Size: 100ml jar\n• Works on natural hair, wigs, and extensions',
      shortDescription:
        'Strong-hold edge control — non-flaking, castor oil infused, 24hr hold.',
      categoryId: categoryRecords['accessories'],
      basePrice: 4500,
      compareAtPrice: 6000,
      sku: 'ACC-EC-001',
      stockQuantity: 40,
      tags: ['edge-control', 'gel', 'styling', 'strong-hold', 'hair-care'],
      metadata: {
        holdStrength: 'Strong (24hr)',
        size: '100ml',
        ingredients: ['Castor Oil', 'Biotin', 'Vitamin E', 'Coconut Oil'],
        scent: 'Coconut Vanilla',
      },
      images: IMG.edgeControl,
    },
  ];

  // NB: No blanket deleteMany here. This script is idempotent and must
  // never touch rows it didn't create. Each demo product is upserted by
  // slug; only images/variants scoped to that specific demo product are
  // replaced. Admin-created products with different slugs are untouched.

  for (const product of products) {
    const { images, ...productData } = product;

    // Upsert the product itself (matched by unique slug).
    const created = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: productData,
      create: productData,
    });

    // Replace images and variants only for THIS demo product. Using
    // the productId filter guarantees we don't touch admin products.
    await prisma.productImage.deleteMany({
      where: { productId: created.id },
    });
    await prisma.productVariant.deleteMany({
      where: { productId: created.id },
    });

    // Add product images (multiple per product)
    for (const [i, url] of images.entries()) {
      await prisma.productImage.create({
        data: {
          productId: created.id,
          url,
          publicId: `eshair/products/${productData.slug}/${i === 0 ? 'main' : `gallery-${i}`}`,
          alt:
            i === 0
              ? productData.name
              : `${productData.name} — ${i === 1 ? 'detail view' : 'styled look'}`,
          width: 800,
          height: 800,
          sortOrder: i,
          isPrimary: i === 0,
        },
      });
    }

    // Add variants for bundles (lengths)
    if (productData.categoryId === categoryRecords['bundles']) {
      const lengths = [
        { name: '14-inch', label: '14 inches', priceAdd: 0 },
        { name: '18-inch', label: '18 inches', priceAdd: 5000 },
        { name: '22-inch', label: '22 inches', priceAdd: 10000 },
        { name: '26-inch', label: '26 inches', priceAdd: 15000 },
      ];
      for (const length of lengths) {
        await prisma.productVariant.create({
          data: {
            productId: created.id,
            name: length.name,
            label: length.label,
            price: productData.basePrice + length.priceAdd,
            stockQuantity: Math.max(
              3,
              Math.floor(productData.stockQuantity / 4),
            ),
            sku: `${productData.sku}-${length.name.toUpperCase()}`,
            isActive: true,
          },
        });
      }
    }

    // Add variants for wigs (cap sizes)
    if (productData.categoryId === categoryRecords['wigs']) {
      const sizes = [
        { name: 'small', label: 'Small (21")', priceAdd: 0 },
        { name: 'medium', label: 'Medium (22")', priceAdd: 0 },
        { name: 'large', label: 'Large (23")', priceAdd: 5000 },
      ];
      for (const size of sizes) {
        await prisma.productVariant.create({
          data: {
            productId: created.id,
            name: size.name,
            label: size.label,
            price: productData.basePrice + size.priceAdd,
            stockQuantity: Math.max(
              2,
              Math.floor(productData.stockQuantity / 3),
            ),
            sku: `${productData.sku}-${size.name.toUpperCase()}`,
            isActive: true,
          },
        });
      }
    }

    // Add color variants for satin bonnet
    if (productData.slug === 'luxury-satin-bonnet') {
      const colors = [
        { name: 'black', label: 'Black', priceAdd: 0 },
        { name: 'gold', label: 'Gold', priceAdd: 500 },
        { name: 'champagne', label: 'Champagne', priceAdd: 500 },
      ];
      for (const color of colors) {
        await prisma.productVariant.create({
          data: {
            productId: created.id,
            name: color.name,
            label: color.label,
            price: productData.basePrice + color.priceAdd,
            stockQuantity: Math.max(
              10,
              Math.floor(productData.stockQuantity / 3),
            ),
            sku: `${productData.sku}-${color.name.toUpperCase()}`,
            isActive: true,
          },
        });
      }
    }

    console.log(`  📦 ${productData.name}`);
  }
  console.log('✅ Products seeded\n');

  // ─── Sample Orders ──────────────────────────────────────────────
  // Get some product IDs for order items
  const allProducts = await prisma.product.findMany({ take: 5 });

  const sampleOrders = [
    {
      orderNumber: 'ESH-20260301-001',
      status: 'DELIVERED' as const,
      channel: 'PAYSTACK' as const,
      customerName: 'Amaka Okafor',
      customerEmail: 'amaka.okafor@gmail.com',
      customerPhone: '+2348034567890',
      shippingAddress: '15 Admiralty Way, Lekki Phase 1',
      shippingCity: 'Lagos',
      shippingState: 'Lagos',
      subtotal: 90000,
      shippingCost: 2500,
      total: 92500,
      paymentReference: 'PAY-ref-abc123def456',
      paymentStatus: 'success',
      notes: 'Please deliver before 3pm',
      createdAt: new Date('2026-03-01T10:30:00Z'),
    },
    {
      orderNumber: 'ESH-20260315-002',
      status: 'SHIPPED' as const,
      channel: 'PAYSTACK' as const,
      customerName: 'Blessing Eze',
      customerEmail: 'blessing.eze@yahoo.com',
      customerPhone: '+2348055667788',
      shippingAddress: '42 Allen Avenue, Ikeja',
      shippingCity: 'Lagos',
      shippingState: 'Lagos',
      subtotal: 120000,
      shippingCost: 0,
      total: 120000,
      paymentReference: 'PAY-ref-ghi789jkl012',
      paymentStatus: 'success',
      createdAt: new Date('2026-03-15T14:00:00Z'),
    },
    {
      orderNumber: 'ESH-20260320-003',
      status: 'PROCESSING' as const,
      channel: 'WHATSAPP' as const,
      customerName: 'Chioma Adeyemi',
      customerEmail: 'chioma.a@hotmail.com',
      customerPhone: '+2348099887766',
      shippingAddress: '8 Bode Thomas Street, Surulere',
      shippingCity: 'Lagos',
      shippingState: 'Lagos',
      subtotal: 76000,
      shippingCost: 2500,
      total: 78500,
      paymentStatus: 'paid_on_delivery',
      adminNotes: 'WhatsApp order — customer confirmed via voice note',
      createdAt: new Date('2026-03-20T09:15:00Z'),
    },
    {
      orderNumber: 'ESH-20260328-004',
      status: 'CONFIRMED' as const,
      channel: 'PAYSTACK' as const,
      customerName: 'Funke Adebayo',
      customerEmail: 'funke.adebayo@gmail.com',
      customerPhone: '+2348011223344',
      shippingAddress: '23 Victoria Island Road',
      shippingCity: 'Lagos',
      shippingState: 'Lagos',
      subtotal: 175000,
      shippingCost: 0,
      total: 175000,
      paymentReference: 'PAY-ref-mno345pqr678',
      paymentStatus: 'success',
      notes: 'Gift wrapping please',
      createdAt: new Date('2026-03-28T16:45:00Z'),
    },
    {
      orderNumber: 'ESH-20260401-005',
      status: 'PENDING' as const,
      channel: 'WHATSAPP' as const,
      customerName: 'Ngozi Ibe',
      customerPhone: '+2348077665544',
      shippingAddress: '5 Akin Adesola Street, VI',
      shippingCity: 'Lagos',
      shippingState: 'Lagos',
      subtotal: 55000,
      shippingCost: 2500,
      total: 57500,
      createdAt: new Date('2026-04-01T11:00:00Z'),
    },
  ];

  // Create orders with items
  if (allProducts.length >= 5) {
    const orderItemSets = [
      // Order 1: 2x Brazilian Body Wave bundles
      [
        {
          productId: allProducts[0].id,
          name: allProducts[0].name,
          variantName: '18 inches',
          price: 50000,
          quantity: 2,
          total: 90000,
        },
      ],
      // Order 2: Body Wave Full Lace Wig
      [
        {
          productId:
            allProducts.find((p) => p.slug === 'body-wave-full-lace-wig')?.id ||
            allProducts[4].id,
          name: 'Body Wave Full Lace Wig',
          variantName: 'Medium (22")',
          price: 120000,
          quantity: 1,
          total: 120000,
        },
      ],
      // Order 3: Malaysian Deep Wave + 4x4 Closure
      [
        {
          productId: allProducts[2].id,
          name: allProducts[2].name,
          variantName: '22 inches',
          price: 58000,
          quantity: 1,
          total: 58000,
        },
        {
          productId:
            allProducts.find((p) => p.slug === '4x4-lace-closure-body-wave')
              ?.id || allProducts[3].id,
          name: '4x4 Lace Closure — Body Wave',
          price: 28000,
          quantity: 1,
          total: 28000,
        },
      ],
      // Order 4: Straight Bob Wig + Satin Bonnet + Edge Control
      [
        {
          productId:
            allProducts.find((p) => p.slug === 'straight-bob-lace-front-wig')
              ?.id || allProducts[4].id,
          name: 'Straight Bob Lace Front Wig',
          variantName: 'Medium (22")',
          price: 75000,
          quantity: 1,
          total: 75000,
        },
        {
          productId:
            allProducts.find((p) => p.slug === 'luxury-satin-bonnet')?.id ||
            allProducts[0].id,
          name: 'Luxury Satin Bonnet',
          variantName: 'Gold',
          price: 6000,
          quantity: 1,
          total: 6000,
        },
        {
          productId:
            allProducts.find((p) => p.slug === 'edge-control-gel-strong-hold')
              ?.id || allProducts[0].id,
          name: 'Edge Control Gel — Strong Hold',
          price: 4500,
          quantity: 2,
          total: 9000,
        },
      ],
      // Order 5: Deep Wave Headband Wig
      [
        {
          productId:
            allProducts.find((p) => p.slug === 'deep-wave-headband-wig')?.id ||
            allProducts[4].id,
          name: 'Deep Wave Headband Wig',
          variantName: '18 inches',
          price: 55000,
          quantity: 1,
          total: 55000,
        },
      ],
    ];

    for (let i = 0; i < sampleOrders.length; i++) {
      // Skip-if-exists by orderNumber so re-running the script never
      // clones orders or wipes real customer history.
      const existing = await prisma.order.findUnique({
        where: { orderNumber: sampleOrders[i].orderNumber },
        select: { id: true },
      });
      if (existing) {
        console.log(
          `  ⊘ ${sampleOrders[i].orderNumber} already exists — skipped`,
        );
        continue;
      }

      const order = await prisma.order.create({
        data: {
          ...sampleOrders[i],
          accessToken: randomBytes(32).toString('base64url'),
        },
      });

      for (const item of orderItemSets[i]) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            ...item,
          },
        });
      }
      console.log(
        `  🛒 ${sampleOrders[i].orderNumber} — ${sampleOrders[i].customerName}`,
      );
    }
  }
  console.log('✅ Orders seeded\n');

  console.log('🎉 Demo catalog populated successfully!');
}

runScript(main, 'demo-catalog');
