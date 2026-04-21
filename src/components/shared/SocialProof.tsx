import { Shield, Truck, MessageCircle } from 'lucide-react';

const signals = [
  {
    icon: Shield,
    title: '100% Human Hair',
    description: 'Premium quality, ethically sourced, guaranteed authentic.',
  },
  {
    icon: Truck,
    title: '24 – 48hr Delivery',
    description: 'Fast, reliable delivery across Lagos and nationwide.',
  },
  {
    icon: MessageCircle,
    title: 'Always On WhatsApp',
    description: 'Instant support, personalized picks, anytime you need.',
  },
];

export function SocialProof() {
  return (
    <section className="relative py-20">
      {/* Top + bottom hairlines */}
      <div
        aria-hidden="true"
        className="via-slate/60 absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent to-transparent"
      />
      <div
        aria-hidden="true"
        className="via-slate/60 absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent to-transparent"
      />
      {/* Ambient champagne wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(212,168,83,0.04),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-3 sm:px-6 lg:gap-16 lg:px-8">
        {signals.map((signal) => (
          <div key={signal.title} className="group text-center">
            <div className="relative mx-auto mb-5 h-14 w-14">
              {/* Rotating ring */}
              <div
                aria-hidden="true"
                className="border-gold/20 group-hover:border-gold/60 absolute inset-0 rounded-full border transition-colors duration-500"
              />
              <div
                aria-hidden="true"
                className="border-gold/0 group-hover:border-gold/30 absolute inset-1 rounded-full border transition-colors duration-500"
              />
              {/* Icon */}
              <div className="from-gold/15 to-gold/0 group-hover:shadow-glow-sm absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br transition-all duration-500">
                <signal.icon className="text-gold h-5 w-5" />
              </div>
            </div>
            <h3 className="font-display text-ivory mb-2 text-lg font-semibold tracking-tight">
              {signal.title}
            </h3>
            <p className="text-silver mx-auto max-w-[18rem] text-sm leading-relaxed">
              {signal.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
