'use client';

import {
  canOrder,
  currentPrice,
  formatOMR,
  type PublicProduct,
} from '@/lib/products';
import { WhatsAppChooser } from './whatsapp-chooser';

// Orders happen on WhatsApp: the shopper picks who to message and the order
// (product, quantity, price and link) is already written for them.

export function orderMessage(product: PublicProduct, quantity = 1) {
  const link = `${window.location.origin}/products/${product.slug}`;
  return [
    canOrder(product) ? "Hi, I'd like to order:" : 'Hi, is this available?',
    product.name,
    quantity > 1 ? `Quantity: ${quantity}` : '',
    `SKU: ${product.sku}`,
    `Price on the website: ${formatOMR(currentPrice(product))}${quantity > 1 ? ` each` : ''}`,
    link,
  ]
    .filter(Boolean)
    .join('\n');
}

export function OrderOnWhatsApp({
  product,
  quantity = 1,
  size = 'lg',
  className,
}: {
  product: PublicProduct;
  quantity?: number;
  size?: 'md' | 'lg';
  className?: string;
}) {
  const orderable = canOrder(product);
  return (
    <WhatsAppChooser
      label={
        size === 'md'
          ? orderable
            ? 'Order'
            : 'Ask'
          : orderable
            ? 'Order on WhatsApp'
            : 'Ask on WhatsApp'
      }
      ariaLabel={`${orderable ? 'Order' : 'Ask about'} ${product.name} on WhatsApp`}
      title={orderable ? 'Order on WhatsApp' : 'Ask about this product'}
      description="Choose who to message. WhatsApp opens with your order already written."
      message={() => orderMessage(product, quantity)}
      size={size}
      className={className}
    />
  );
}
