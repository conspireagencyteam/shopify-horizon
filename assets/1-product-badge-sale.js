import { ThemeEvents, VariantUpdateEvent } from '@theme/events';
import { morph } from '@theme/morph';

class OneProductBadgeSale extends HTMLElement {
  connectedCallback() {
    const closestSection = this.closest('.shopify-section, dialog');
    closestSection?.addEventListener(ThemeEvents.variantUpdate, this.updateBadge);
  }

  disconnectedCallback() {
    const closestSection = this.closest('.shopify-section, dialog');
    closestSection?.removeEventListener(ThemeEvents.variantUpdate, this.updateBadge);
  }

  /**
   * Updates the sale badge.
   * @param {VariantUpdateEvent} event - The variant update event.
   */
  updateBadge = (event) => {
    if (event.detail.data.newProduct) {
      this.dataset.productId = event.detail.data.newProduct.id;
    } else if (event.target instanceof HTMLElement && event.target.dataset.productId !== this.dataset.productId) {
      return;
    }

    const newBadge = event.detail.data.html.querySelector('one-product-badge-sale');

    if (!newBadge) return;

    morph(this, newBadge, { childrenOnly: true });
  };
}

if (!customElements.get('one-product-badge-sale')) {
  customElements.define('one-product-badge-sale', OneProductBadgeSale);
}
