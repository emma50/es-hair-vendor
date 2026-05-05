export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  DISPUTED: 'Disputed',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning/20 text-warning',
  CONFIRMED: 'bg-info/20 text-info',
  PROCESSING: 'bg-gold/20 text-gold',
  SHIPPED: 'bg-info/20 text-info',
  DELIVERED: 'bg-success/20 text-success',
  CANCELLED: 'bg-error/20 text-error',
  REFUNDED: 'bg-silver/20 text-silver',
  DISPUTED: 'bg-warning/20 text-warning',
};

export const ORDER_CHANNEL_LABELS: Record<string, string> = {
  PAYSTACK: 'Paystack',
  WHATSAPP: 'WhatsApp',
};

export const ORDER_CHANNEL_COLORS: Record<string, string> = {
  PAYSTACK: 'bg-info/20 text-info',
  WHATSAPP: 'bg-whatsapp/20 text-whatsapp',
};

export const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const;

export const LOW_STOCK_THRESHOLD = 5;

export const ITEMS_PER_PAGE = 20;

// ── Store contact config (centralized env access with fallbacks) ──

export const STORE_CONFIG = {
  get whatsappNumber() {
    return "09166303104";
  },
  get email() {
    return 'se351436@gmail.com';
  },
  get phone() {
    return '09166303104, 07079146310';
  },
  get address() {
    return '1, Tawose Str, Off Agboyi Road Ogudu Orioke, Ogudu, Lagos, Nigeria';
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://www.eshairvendor.com/';
  },
  get instagramUrl() {
    return 'https://instagram.com/emmanuelsarahhair';
  },
  get facebookUrl() {
    return 'https://facebook.com/emmanuelsarahhair';
  },
  get tiktokUrl() {
    return 'https://tiktok.com/@emmanuelsarahhair';
  },
} as const;

// ── Shipping ──

const DEFAULT_SHIPPING_FEE = 2500;
const DEFAULT_FREE_SHIPPING_MIN = 100000;

export function estimateShippingCost(subtotal: number): number {
  return subtotal >= DEFAULT_FREE_SHIPPING_MIN ? 0 : DEFAULT_SHIPPING_FEE;
}

// ── Phone formatting ──

export function formatPhoneDisplay(phone: string): string {
  return phone.replace(/^\+?(\d{3})(\d{3})(\d{3})(\d{4})$/, '+$1 $2 $3 $4');
}
