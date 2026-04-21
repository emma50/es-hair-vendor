// Types for Paystack's hosted inline.js script (loaded from
// https://js.paystack.co/v2/inline.js). We use the hosted script rather
// than the `@paystack/inline-js` npm package so Paystack can keep the
// checkout client in lockstep with their backend — the npm package
// pins a snapshot that drifts and can 403 on hashed iframe assets.

interface PaystackLoadedTransaction {
  id: number;
  accessCode: string;
  customer: Record<string, unknown>;
}

interface PaystackSuccessTransaction {
  id: number;
  reference: string;
  message: string;
  transaction: string;
  status: string;
}

interface PaystackTransactionError {
  message: string;
}

interface PaystackTransactionOptions {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref?: string;
  reference?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  channels?: string[];
  metadata?: Record<string, unknown>;
  onLoad?: (transaction: PaystackLoadedTransaction) => void;
  onSuccess: (transaction: PaystackSuccessTransaction) => void;
  onCancel: () => void;
  onError?: (error: PaystackTransactionError) => void;
}

interface PaystackPopInstance {
  newTransaction(options: PaystackTransactionOptions): void;
}

interface PaystackPopConstructor {
  new (): PaystackPopInstance;
  isLoaded(): boolean;
}

declare global {
  interface Window {
    PaystackPop?: PaystackPopConstructor;
  }
}

export {};
