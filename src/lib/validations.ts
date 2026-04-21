import { z } from 'zod';
import { NIGERIAN_STATES } from '@/lib/constants';
import { ORDER_STATUS_VALUES } from '@/lib/order-state';

// Membership check is O(1). The list is small (37 entries) but typing
// it as a `Set<(typeof NIGERIAN_STATES)[number]>` keeps the refine
// callback honest: only values from the whitelist pass.
const NIGERIAN_STATE_SET: ReadonlySet<string> = new Set(NIGERIAN_STATES);

/**
 * Absolute cap on free-form admin text fields (order notes, store
 * settings announcement, etc.) Small enough to comfortably fit in a
 * TEXT column and large enough for a few paragraphs. Protects against
 * accidental or malicious OOM / row-size blow-ups.
 */
const ADMIN_TEXT_MAX = 4000;

export const emailSubscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const checkoutFormSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be 120 characters or fewer'),
  customerPhone: z
    .string()
    .trim()
    .regex(
      /^(\+?234|0)[789]\d{9}$/,
      'Please enter a valid Nigerian phone number',
    ),
  customerEmail: z
    .string()
    .trim()
    .email('Please enter a valid email')
    .max(120, 'Email must be 120 characters or fewer')
    .optional()
    .or(z.literal('')),
  shippingAddress: z
    .string()
    .trim()
    .min(5, 'Please enter your delivery address')
    .max(300, 'Address must be 300 characters or fewer'),
  shippingCity: z
    .string()
    .trim()
    .min(2, 'Please enter your city')
    .max(80, 'City must be 80 characters or fewer'),
  // The checkout UI ships a `<select>` backed by NIGERIAN_STATES, but
  // a determined client can hand-craft the payload. Refusing off-list
  // values at the schema layer prevents garbage state names leaking
  // into orders and the downstream shipping/admin tools.
  shippingState: z
    .string()
    .trim()
    .min(2, 'Please select your state')
    .max(80, 'State must be 80 characters or fewer')
    .refine((s) => NIGERIAN_STATE_SET.has(s), {
      message: 'Please select a valid Nigerian state',
    }),
  notes: z
    .string()
    .trim()
    .max(
      ADMIN_TEXT_MAX,
      `Notes must be ${ADMIN_TEXT_MAX} characters or fewer`,
    )
    .optional(),
});

/**
 * Cart line item, validated on the server before we touch the DB.
 *
 * The client sends these over from the Zustand store, which ultimately
 * derives from `window.localStorage` — i.e. arbitrary user-controlled
 * input. Without runtime validation a malicious client can submit:
 *
 *   - `quantity: -100`  → `updateMany({ decrement: -100 })` INCREMENTS
 *     stock, line total goes negative, order total goes negative.
 *   - `quantity: NaN`   → `NaN > stockQty` is `false`, stock check
 *     passes, subsequent Decimal math corrupts the whole order row.
 *   - `quantity: 1e9`   → integer overflow + DoS-scale insert.
 *   - `productId: "' OR 1=1--"` → not a SQL injection (Prisma is
 *     parameterised) but definitely a logic-corruption vector.
 *
 * Whitelisting types + bounds closes all of those in one place.
 * `cuid` matches Prisma's default ID format; update this if the schema
 * is ever changed away from `@default(cuid())`.
 */
export const cartItemSchema = z.object({
  productId: z.string().cuid('Invalid product id'),
  variantId: z.string().cuid('Invalid variant id').nullable(),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .positive('Quantity must be greater than zero')
    .max(100, 'Quantity may not exceed 100 per line'),
});

/** Extended form used by `validateCart` which also carries a price snapshot. */
export const cartValidationItemSchema = cartItemSchema.extend({
  price: z
    .number()
    .nonnegative('Price must be zero or greater')
    .max(10_000_000, 'Price snapshot out of range'),
});

export const cartItemsArraySchema = z
  .array(cartItemSchema)
  .min(1, 'Your cart is empty.')
  .max(50, 'Too many items in one order.');

export const cartValidationItemsArraySchema = z
  .array(cartValidationItemSchema)
  .max(50, 'Too many items in one cart.');

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Product name is required')
    .max(120, 'Product name must be 120 characters or fewer'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(10000, 'Description is too long'),
  shortDescription: z
    .string()
    .trim()
    .max(160, 'Short description must be under 160 characters')
    .optional()
    .or(z.literal('')),
  categoryId: z.string().cuid('Please select a category'),
  basePrice: z.coerce
    .number()
    .positive('Price must be greater than 0')
    .max(1_000_000_000, 'Price is unreasonably large'),
  compareAtPrice: z.coerce
    .number()
    .positive()
    .max(1_000_000_000)
    .optional()
    .or(z.literal(0)),
  sku: z.string().trim().max(64).optional().or(z.literal('')),
  stockQuantity: z.coerce
    .number()
    .int()
    .min(0, 'Stock cannot be negative')
    .max(1_000_000, 'Stock is unreasonably large'),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  // Tags arrive as a comma-separated string; the server action
  // trims, case-insensitive-dedupes, and drops empties before write.
  tags: z.string().max(1000, 'Tag list is too long').optional(),
});

export const variantFormSchema = z.object({
  name: z.string().trim().min(1, 'Variant name is required').max(80),
  label: z.string().trim().min(1, 'Display label is required').max(80),
  price: z.coerce
    .number()
    .positive('Price must be greater than 0')
    .max(1_000_000_000, 'Price is unreasonably large'),
  stockQuantity: z.coerce.number().int().min(0).max(1_000_000),
  sku: z.string().trim().max(64).optional().or(z.literal('')),
});

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name is required')
    .max(80, 'Category name must be 80 characters or fewer'),
  description: z.string().trim().max(500).optional().or(z.literal('')),
});

export const categoryReorderSchema = z.object({
  orderedIds: z.array(z.string().cuid()).min(1),
});

/**
 * Validates the admin order-status update payload. The status is
 * validated against the enum; additional server-side state-machine
 * checks happen in the action itself (see `lib/order-state.ts`).
 */
export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES, {
    errorMap: () => ({ message: 'Invalid order status' }),
  }),
});

export const orderNotesUpdateSchema = z.object({
  adminNotes: z
    .string()
    .max(ADMIN_TEXT_MAX, `Notes must be ${ADMIN_TEXT_MAX} characters or fewer`),
});

/**
 * Admin refund payload. `reason` is stored in Paystack's merchant_note
 * and also appended to the order's adminNotes so the history is
 * self-explanatory. Capped at 300 chars — Paystack truncates longer
 * values on their end.
 */
export const orderRefundSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Please give a brief reason for the refund.')
    .max(300, 'Reason must be 300 characters or fewer'),
});

export const storeSettingsSchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(1, 'Store name is required')
    .max(80, 'Store name must be 80 characters or fewer'),
  storeEmail: z
    .string()
    .trim()
    .email('Please enter a valid email')
    .optional()
    .or(z.literal('')),
  storePhone: z.string().trim().max(30).optional().or(z.literal('')),
  whatsappNumber: z.string().trim().max(30).optional().or(z.literal('')),
  shippingFee: z.coerce.number().min(0).max(10_000_000),
  freeShippingMin: z.coerce
    .number()
    .min(0)
    .max(10_000_000_000)
    .optional()
    .or(z.literal(0)),
  announcementBar: z.string().trim().max(240).optional().or(z.literal('')),
  isMaintenanceMode: z.boolean().default(false),
});

// ─── Auth schemas ──────────────────────────────────────────────────

/**
 * Password policy for every auth surface that sets a password (signup,
 * reset-password, change-password). Tuned for the trade-off a small
 * storefront actually needs: stop obvious credential stuffing and weak
 * guesses without frustrating legitimate customers on mobile keyboards.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or fewer')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/\d/, 'Include at least one number');

export const signUpSchema = z
  .object({
    name: z.string().min(2, 'Please enter your name').max(80),
    email: z.string().email('Please enter a valid email address'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Please enter your name').max(80),
  email: z.string().email('Please enter a valid email address'),
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;
export type ProductFormData = z.infer<typeof productFormSchema>;
export type VariantFormData = z.infer<typeof variantFormSchema>;
export type CategoryFormData = z.infer<typeof categoryFormSchema>;
export type CategoryReorderData = z.infer<typeof categoryReorderSchema>;
export type StoreSettingsData = z.infer<typeof storeSettingsSchema>;
export type OrderStatusUpdateData = z.infer<typeof orderStatusUpdateSchema>;
export type OrderNotesUpdateData = z.infer<typeof orderNotesUpdateSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;
