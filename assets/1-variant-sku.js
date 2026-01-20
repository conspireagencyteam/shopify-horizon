import { ThemeEvents, VariantUpdateEvent } from '@theme/events';

/**
 * A custom element that displays a product sku.
 * This component listens for variant update events and updates the sku display accordingly.
 */
class OneSku extends HTMLElement {
  connectedCallback() {
    const closestSection = this.closest('.shopify-section, dialog');
    if (!closestSection) return;
    closestSection.addEventListener(ThemeEvents.variantUpdate, this.updateSku);
  }

  disconnectedCallback() {
    const closestSection = this.closest('.shopify-section, dialog');
    if (!closestSection) return;
    closestSection.removeEventListener(
      ThemeEvents.variantUpdate,
      this.updateSku
    );
  }

  /**
   * Updates the sku.
   * @param {VariantUpdateEvent} event - The variant update event.
   */
  updateSku = (event) => {
    if (event.detail.data.newProduct) {
      this.dataset.productId = event.detail.data.newProduct.id;
    } else if (
      event.target instanceof HTMLElement &&
      event.target.dataset.productId !== this.dataset.productId
    ) {
      return;
    }

    const newSku = event.detail.data.html.querySelector('one-variant-sku');

    if (!newSku) return;

    const newSkuText = newSku.textContent.trim();
    const currentSkuText = this.textContent.trim();

    if (currentSkuText !== newSkuText) {
      this.textContent = newSkuText;
    }
  };
}

if (!customElements.get('one-variant-sku')) {
  customElements.define('one-variant-sku', OneSku);
}
