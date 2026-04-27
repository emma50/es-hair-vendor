'use client';

import { useEffect, useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, MessageCircle, Shield } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ui/Toast';
import { useRequestDedup } from '@/hooks/useRequestDedup';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { CartSummary } from '@/components/cart/CartSummary';
import { createOrder, cancelPendingOrder } from '@/app/actions/orders';
import { buildWhatsAppOrderUrl } from '@/lib/whatsapp';
import {
  NIGERIAN_STATES,
  STORE_CONFIG,
  estimateShippingCost,
} from '@/lib/constants';
import { checkoutFormSchema } from '@/lib/validations';
import { cn } from '@/lib/utils';

type PaymentMethod = 'PAYSTACK' | 'WHATSAPP';

interface CheckoutClientProps {
  /** Pre-filled customer name from the signed-in user's profile. */
  initialName?: string;
  /** Pre-filled email from the signed-in user's Supabase auth record. */
  initialEmail?: string;
}

export function CheckoutClient({
  initialName = '',
  initialEmail = '',
}: CheckoutClientProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const { items, subtotal, clearCart, isHydrated } = useCart();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const dedup = useRequestDedup();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAYSTACK');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const shippingCost = estimateShippingCost(subtotal);
  const whatsappNumber = STORE_CONFIG.whatsappNumber;

  // Redirect empty-cart visitors back to /cart. Must happen in an
  // effect — calling router.replace() during render triggers React's
  // "setState during render" warning because Next's Router mutates
  // internal state synchronously.
  const cartIsEmpty = isHydrated && items.length === 0;
  useEffect(() => {
    if (cartIsEmpty) router.replace('/cart');
  }, [cartIsEmpty, router]);

  if (cartIsEmpty) return null;

  function getFormValues() {
    if (!formRef.current) return null;
    const form = new FormData(formRef.current);
    return Object.fromEntries(form.entries());
  }

  function focusField(fieldName: string) {
    if (!formRef.current) return;
    const el = formRef.current.querySelector<HTMLElement>(
      `[name="${fieldName}"]`,
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus({ preventScroll: true });
  }

  function validateForm(formValues: Record<string, FormDataEntryValue>) {
    const parsed = checkoutFormSchema.safeParse(formValues);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors(errors);
      const firstField = Object.keys(errors)[0];
      const firstMessage = firstField
        ? (errors as Record<string, string[] | undefined>)[firstField]?.[0]
        : null;
      toast(firstMessage ?? 'Please check your form fields.', 'error');
      if (firstField) focusField(firstField);
      return false;
    }

    // Paystack requires a real email to issue a receipt. We treat an
    // empty email as a field-level error rather than silently falling
    // back to a fake domain (Paystack rejects those with no popup).
    if (paymentMethod === 'PAYSTACK' && !parsed.data.customerEmail) {
      const msg = 'Email is required for Paystack payments.';
      setFieldErrors({ customerEmail: [msg] });
      toast(msg, 'error');
      focusField('customerEmail');
      return false;
    }

    setFieldErrors({});
    return true;
  }

  function handlePaystack(formValues: Record<string, FormDataEntryValue>) {
    startTransition(async () => {
      const result = await dedup('checkout-paystack', () =>
        createOrder(
          formValues,
          items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          'PAYSTACK',
        ),
      );

      if (!result.success) {
        toast(result.error, 'error');
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      const { orderNumber, paymentReference, accessToken, amount, email } =
        result.data;
      const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

      if (!paystackKey) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(
            'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is missing from the client bundle. ' +
              'Set it in .env.local and restart the dev server.',
          );
        }
        toast(
          'Paystack is not configured. Please contact support.',
          'error',
        );
        return;
      }

      // Paystack requires email. Server-side validation should already
      // have enforced this for PAYSTACK orders, but guard anyway so we
      // never hand the SDK a blank string (which fails silently).
      if (!email) {
        toast('Email is required for Paystack payments.', 'error');
        focusField('customerEmail');
        return;
      }

      const customerName = String(formValues.customerName ?? '').trim();
      const [firstName, ...rest] = customerName.split(/\s+/);
      const lastName = rest.join(' ');
      const phone = String(formValues.customerPhone ?? '');

      // Use the hosted Paystack script (loaded via <Script> below).
      // Bundling `@paystack/inline-js` pins a snapshot that can drift
      // from Paystack's checkout backend — the hosted script is always
      // in lockstep, which avoids the "403 on iframe assets" class of
      // failure where hashed CSS/JS URLs in the iframe no longer exist.
      const PaystackPop = window.PaystackPop;
      if (!PaystackPop) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(
            'window.PaystackPop is unavailable — the hosted inline.js ' +
              'script has not loaded. Check DevTools Network tab for a ' +
              'blocked request to https://js.paystack.co/v2/inline.js.',
          );
        }
        toast('Payment script failed to load. Please try again.', 'error');
        return;
      }

      try {
        const popup = new PaystackPop();

        popup.newTransaction({
          key: paystackKey,
          email,
          amount,
          reference: paymentReference,
          currency: 'NGN',
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone: phone || undefined,
          metadata: {
            order_number: orderNumber,
            custom_fields: [
              {
                display_name: 'Order Number',
                variable_name: 'order_number',
                value: orderNumber,
              },
            ],
          },
          onLoad: (tx) => {
            if (process.env.NODE_ENV !== 'production') {
              console.info('Paystack transaction loaded', tx);
            }
          },
          onSuccess: (tx) => {
            if (process.env.NODE_ENV !== 'production') {
              console.info('Paystack transaction success', tx);
            }
            clearCart();
            router.push(
              `/checkout/success?t=${encodeURIComponent(accessToken)}`,
            );
          },
          onCancel: () => {
            // Fire-and-forget release: the server cancels the PENDING
            // order + credits stock back so the cart items aren't
            // locked by abandoned popups. Safe to ignore the result —
            // the server-side cleanup cron is the backstop, and we
            // never want the UI to block on this.
            void cancelPendingOrder(accessToken).catch(() => {});
            toast(
              'Payment was cancelled. Stock has been released.',
              'warning',
            );
          },
          onError: (err) => {
            // Log in every environment — production payment errors
            // leave no trace otherwise, and a customer report has
            // nothing for us to debug from.
            console.error('Paystack transaction error', err);
            // Release the held stock immediately. Without this, a
            // network blip / popup-blocker / browser hiccup leaves the
            // PENDING order with stock decremented until the cron
            // sweeps it ~45 min later — long enough that the customer
            // hitting "Pay" again sees their own previous attempt as
            // "out of stock".
            void cancelPendingOrder(accessToken).catch(() => {});
            toast(
              err.message ?? 'Payment could not be completed.',
              'error',
            );
          },
        });
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Paystack popup failed to open:', err);
        }
        toast('Could not open payment window. Please try again.', 'error');
      }
    });
  }

  function handleWhatsApp(formValues: Record<string, FormDataEntryValue>) {
    startTransition(async () => {
      const result = await dedup('checkout-whatsapp', () =>
        createOrder(
          formValues,
          items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          'WHATSAPP',
        ),
      );

      if (!result.success) {
        toast(result.error, 'error');
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      const { orderNumber, accessToken } = result.data;

      // Build WhatsApp URL with cart items and order number
      const whatsappUrl = buildWhatsAppOrderUrl(
        items,
        subtotal,
        shippingCost,
        whatsappNumber,
        orderNumber,
      );

      // Open WhatsApp in a new tab. `noopener,noreferrer` denies the
      // opened tab a back-reference to `window.opener` (reverse-tabnabbing
      // protection) and strips the `Referer` so a mis-typed URL can't
      // leak our checkout origin to a third party.
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      // Clear cart and redirect to success page
      clearCart();
      router.push(
        `/checkout/success?t=${encodeURIComponent(accessToken)}&channel=whatsapp`,
      );
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return; // Prevent duplicate submissions

    const formValues = getFormValues();
    if (!formValues) return;

    if (!validateForm(formValues)) return;

    if (paymentMethod === 'PAYSTACK') {
      handlePaystack(formValues);
    } else {
      handleWhatsApp(formValues);
    }
  }

  const stateOptions = NIGERIAN_STATES.map((s) => ({ value: s, label: s }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/*
       * Load Paystack's hosted inline.js.
       *
       * Version pinning:
       *   Paystack does NOT publish hash-pinned URLs (no `v2.22.8` —
       *   only `/v2/inline.js`, which they update in-place). That
       *   means we cannot use Subresource Integrity here; a
       *   `integrity="..."` attribute would break the page the moment
       *   Paystack ships their next patch. The trade-off is accepted
       *   because (a) payments break immediately if their script is
       *   tampered, which their own uptime monitoring would catch
       *   faster than ours, and (b) the script's origin is locked to
       *   `js.paystack.co` via our CSP `script-src`.
       *
       *   Monitoring plan: Sentry (or similar) should alarm on a spike
       *   in `Paystack transaction error` / `Paystack popup failed to
       *   open` telemetry — a malicious CDN swap would surface there
       *   well before fraud had a chance to accumulate.
       *
       * Loading strategy:
       *   `beforeInteractive` would be ideal but isn't allowed inside
       *   a page, so we use the default (`afterInteractive`) which is
       *   plenty fast — by the time the user fills the form and
       *   clicks Pay, it's long loaded. The server action round-trip
       *   also gates the popup, so there's no race in practice.
       */}
      <Script src="https://js.paystack.co/v2/inline.js" />

      <Link
        href="/cart"
        className="text-silver hover:text-gold mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Cart
      </Link>

      <h1 className="font-display text-ivory mb-8 text-3xl font-bold">
        Checkout
      </h1>

      <form ref={formRef} onSubmit={handleSubmit}>
        <fieldset disabled={isPending} className="disabled:opacity-70">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="border-slate bg-charcoal rounded-lg border p-6">
                <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
                  Customer Details
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    name="customerName"
                    label="Full Name"
                    autoComplete="name"
                    defaultValue={initialName}
                    required
                    error={fieldErrors.customerName?.[0]}
                  />
                  <Input
                    name="customerPhone"
                    label="Phone Number"
                    type="tel"
                    autoComplete="tel"
                    placeholder="08012345678"
                    required
                    error={fieldErrors.customerPhone?.[0]}
                  />
                  <Input
                    name="customerEmail"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    // Simpler, non-shifting label — the `hint` below
                    // explains the Paystack requirement without
                    // mutating the label text as the user toggles
                    // payment methods (previously the label flashed
                    // between "Email (required for Paystack)" and
                    // "Email (optional)" which made the field look
                    // like it was changing under the user).
                    hint={
                      paymentMethod === 'PAYSTACK'
                        ? 'Required for Paystack — your receipt will be sent here.'
                        : 'Optional — we only use it to send order updates.'
                    }
                    defaultValue={initialEmail}
                    required={paymentMethod === 'PAYSTACK'}
                    className="sm:col-span-2"
                    error={fieldErrors.customerEmail?.[0]}
                  />
                </div>
              </div>

              <div className="border-slate bg-charcoal rounded-lg border p-6">
                <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
                  Delivery Address
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    name="shippingAddress"
                    label="Street Address"
                    autoComplete="street-address"
                    required
                    className="sm:col-span-2"
                    error={fieldErrors.shippingAddress?.[0]}
                  />
                  <Input
                    name="shippingCity"
                    label="City"
                    autoComplete="address-level2"
                    required
                    error={fieldErrors.shippingCity?.[0]}
                  />
                  <Select
                    name="shippingState"
                    label="State"
                    options={stateOptions}
                    placeholder="Select state"
                    autoComplete="address-level1"
                    required
                    error={fieldErrors.shippingState?.[0]}
                  />
                </div>
              </div>

              <div className="border-slate bg-charcoal rounded-lg border p-6">
                <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
                  Order Notes (optional)
                </h2>
                <Textarea
                  name="notes"
                  placeholder="Any special delivery instructions?"
                />
              </div>

              {/* Payment Method Selection */}
              <div className="border-slate bg-charcoal rounded-lg border p-6">
                <h2 className="font-display text-ivory mb-4 text-lg font-semibold">
                  Payment Method
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PAYSTACK')}
                    disabled={isPending}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all',
                      paymentMethod === 'PAYSTACK'
                        ? 'border-gold bg-gold/5'
                        : 'border-slate hover:border-silver',
                      isPending && 'pointer-events-none opacity-60',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        paymentMethod === 'PAYSTACK'
                          ? 'bg-gold/20 text-gold'
                          : 'bg-slate/50 text-muted',
                      )}
                    >
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p
                        className={cn(
                          'font-semibold',
                          paymentMethod === 'PAYSTACK'
                            ? 'text-gold'
                            : 'text-pearl',
                        )}
                      >
                        Pay with Paystack
                      </p>
                      <p className="text-muted mt-0.5 text-xs">
                        Secure instant payment via card, bank transfer, or USSD
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('WHATSAPP')}
                    disabled={isPending}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all',
                      paymentMethod === 'WHATSAPP'
                        ? 'border-whatsapp bg-whatsapp/5'
                        : 'border-slate hover:border-silver',
                      isPending && 'pointer-events-none opacity-60',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        paymentMethod === 'WHATSAPP'
                          ? 'bg-whatsapp/20 text-whatsapp'
                          : 'bg-slate/50 text-muted',
                      )}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p
                        className={cn(
                          'font-semibold',
                          paymentMethod === 'WHATSAPP'
                            ? 'text-whatsapp'
                            : 'text-pearl',
                        )}
                      >
                        Chat on WhatsApp
                      </p>
                      <p className="text-muted mt-0.5 text-xs">
                        Discuss payment options directly with us via WhatsApp
                      </p>
                    </div>
                  </button>
                </div>

                {paymentMethod === 'WHATSAPP' && (
                  <div className="border-whatsapp/20 bg-whatsapp/5 mt-4 rounded-md border px-4 py-3">
                    <p className="text-silver text-xs leading-relaxed">
                      Your order will be placed and you&apos;ll be redirected to
                      WhatsApp to discuss payment options (bank transfer, cash
                      on delivery, etc.) directly with our team.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <CartSummary subtotal={subtotal} shippingCost={shippingCost} />

              <div className="mt-4 space-y-3">
                {paymentMethod === 'PAYSTACK' ? (
                  <Button
                    type="submit"
                    isLoading={isPending}
                    className="w-full"
                    size="lg"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay with Paystack
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    isLoading={isPending}
                    variant="whatsapp"
                    className="w-full"
                    size="lg"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Place Order via WhatsApp
                  </Button>
                )}

                <p className="text-muted flex items-center justify-center gap-1.5 text-[11px]">
                  <Shield className="h-3 w-3" />
                  Your information is secure and encrypted
                </p>
              </div>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
