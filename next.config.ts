import type { NextConfig } from 'next';

// Pin `next/image` to this project's Cloudinary cloud. Without a
// pathname restriction, `res.cloudinary.com` allows imagery from any
// Cloudinary account on the internet — a small but real SSRF /
// bandwidth-laundering surface. Empty fallback keeps local dev working
// before the env var is set (matches legacy behaviour).
const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
const cloudinaryPathname = CLOUDINARY_CLOUD ? `/${CLOUDINARY_CLOUD}/**` : '/**';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: cloudinaryPathname,
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
  async headers() {
    // Content Security Policy
    //
    // `unsafe-inline` is still present for scripts (the root layout
    // injects a pre-hydration theme-init `<script>` and the Paystack
    // inline.js shim emits small inline glue). Removing it requires a
    // per-request nonce generated in middleware + threaded through
    // every inline script tag, which is invasive. Tracked as a
    // follow-up; the mitigation today is strict framing + `base-uri`
    // + `form-action` + `object-src 'none'` so an injected script's
    // blast radius is narrow.
    //
    // `unsafe-eval` — REMOVED. It was never required by this app;
    // Paystack's hosted inline.js does not use eval at runtime, and
    // removing the directive means even a compromised dependency
    // can't ship `eval`-using malware and have it execute.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.paystack.co https://upload-widget.cloudinary.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://plus.unsplash.com",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://api.paystack.co https://api.cloudinary.com",
      'frame-src https://checkout.paystack.com https://upload-widget.cloudinary.com',
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
