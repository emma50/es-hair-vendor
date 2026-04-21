import { PriceDisplay } from './PriceDisplay';
import { StockBadge } from './StockBadge';
import { Badge } from '@/components/ui/Badge';
import {
  Package,
  MapPin,
  Waves,
  Ruler,
  Shield,
  Sparkles,
  Droplets,
  Info,
} from 'lucide-react';

interface ProductMetadata {
  weight?: string;
  origin?: string;
  texture?: string;
  density?: string;
  size?: string;
  laceType?: string;
  capType?: string;
  capSizes?: string[];
  lengths?: string[];
  features?: string[];
  colors?: string[];
  material?: string;
  holdStrength?: string;
  scent?: string;
  ingredients?: string[];
  careInstructions?: string;
  [key: string]: unknown;
}

interface ProductDetailsProps {
  name: string;
  description: string;
  price: number | string;
  compareAtPrice?: number | string | null;
  stockQuantity: number;
  categoryName: string;
  tags?: string[];
  sku?: string | null;
  metadata?: ProductMetadata | null;
}

function SpecItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="text-gold mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-muted text-xs font-medium tracking-wider uppercase">
          {label}
        </p>
        <p className="text-pearl text-sm">{value}</p>
      </div>
    </div>
  );
}

export function ProductDetails({
  name,
  description,
  price,
  compareAtPrice,
  stockQuantity,
  categoryName,
  tags,
  sku,
  metadata,
}: ProductDetailsProps) {
  // Parse description: split by double newline for paragraphs, single newline + bullet for lists
  const descriptionBlocks = description.split('\n\n').filter(Boolean);

  const meta = metadata as ProductMetadata | null;

  // Gather specs from metadata
  const specs: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
  }[] = [];
  if (meta?.origin)
    specs.push({ icon: MapPin, label: 'Origin', value: meta.origin });
  if (meta?.texture)
    specs.push({ icon: Waves, label: 'Texture', value: meta.texture });
  if (meta?.weight)
    specs.push({ icon: Package, label: 'Weight', value: meta.weight });
  if (meta?.density)
    specs.push({ icon: Sparkles, label: 'Density', value: meta.density });
  if (meta?.laceType)
    specs.push({ icon: Shield, label: 'Lace Type', value: meta.laceType });
  if (meta?.capType)
    specs.push({ icon: Shield, label: 'Cap Type', value: meta.capType });
  if (meta?.size) specs.push({ icon: Ruler, label: 'Size', value: meta.size });
  if (meta?.material)
    specs.push({ icon: Package, label: 'Material', value: meta.material });
  if (meta?.holdStrength)
    specs.push({ icon: Droplets, label: 'Hold', value: meta.holdStrength });
  if (meta?.scent)
    specs.push({ icon: Sparkles, label: 'Scent', value: meta.scent });

  return (
    <div>
      {/* Category & Name */}
      <p className="text-muted mb-1 text-sm font-medium tracking-wider uppercase">
        {categoryName}
      </p>
      <h1 className="font-display text-ivory mb-3 text-[clamp(1.5rem,3vw,2.25rem)] font-bold">
        {name}
      </h1>

      {/* Price & Stock */}
      <div className="mb-4">
        <PriceDisplay price={price} compareAtPrice={compareAtPrice} />
      </div>
      <div className="mb-6 flex items-center gap-3">
        <StockBadge quantity={stockQuantity} />
        {sku && (
          <span className="text-muted font-mono text-xs">SKU: {sku}</span>
        )}
      </div>

      {/* Description — renders paragraphs and bullet lists */}
      <div className="mb-8 space-y-4">
        {descriptionBlocks.map((block, i) => {
          const lines = block.split('\n');
          const isBulletBlock = lines.every(
            (l) => l.startsWith('• ') || l.startsWith('- ') || l.trim() === '',
          );

          if (isBulletBlock) {
            return (
              <ul key={i} className="text-silver space-y-1.5 text-sm">
                {lines
                  .filter((l) => l.trim())
                  .map((line, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="bg-gold mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                      <span>{line.replace(/^[•\-]\s*/, '')}</span>
                    </li>
                  ))}
              </ul>
            );
          }

          return (
            <p key={i} className="text-silver text-sm leading-relaxed">
              {block}
            </p>
          );
        })}
      </div>

      {/* Specs Grid */}
      {specs.length > 0 && (
        <div className="border-slate/50 bg-charcoal/50 mb-8 rounded-lg border p-5">
          <h3 className="text-pearl mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <Info className="text-gold h-3.5 w-3.5" />
            Specifications
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {specs.map((spec) => (
              <SpecItem key={spec.label} {...spec} />
            ))}
          </div>
        </div>
      )}

      {/* Available Lengths */}
      {meta?.lengths && meta.lengths.length > 0 && (
        <div className="mb-6">
          <h3 className="text-pearl mb-2 text-xs font-semibold tracking-wider uppercase">
            Available Lengths
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {meta.lengths.map((len) => (
              <span
                key={len}
                className="border-slate/50 bg-midnight text-silver rounded-md border px-2.5 py-1 text-xs"
              >
                {len}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Available Colors */}
      {meta?.colors && meta.colors.length > 0 && (
        <div className="mb-6">
          <h3 className="text-pearl mb-2 text-xs font-semibold tracking-wider uppercase">
            Available Colors
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {meta.colors.map((color) => (
              <span
                key={color}
                className="border-slate/50 bg-midnight text-silver rounded-md border px-2.5 py-1 text-xs"
              >
                {color}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      {meta?.features && meta.features.length > 0 && (
        <div className="mb-6">
          <h3 className="text-pearl mb-2 text-xs font-semibold tracking-wider uppercase">
            Features
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {meta.features.map((feat) => (
              <Badge key={feat} variant="success">
                {feat}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Ingredients */}
      {meta?.ingredients && meta.ingredients.length > 0 && (
        <div className="mb-6">
          <h3 className="text-pearl mb-2 text-xs font-semibold tracking-wider uppercase">
            Key Ingredients
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {meta.ingredients.map((ing) => (
              <span
                key={ing}
                className="border-gold/20 bg-gold/5 text-gold rounded-full border px-3 py-1 text-xs"
              >
                {ing}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Care Instructions */}
      {meta?.careInstructions && (
        <div className="border-gold/20 bg-gold/5 mb-6 rounded-lg border p-4">
          <h3 className="text-gold mb-2 text-xs font-semibold tracking-wider uppercase">
            Care Instructions
          </h3>
          <p className="text-silver text-sm leading-relaxed">
            {meta.careInstructions}
          </p>
        </div>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-midnight text-muted rounded-full px-2.5 py-0.5 text-[11px]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
