import { ThemeEvents, VariantUpdateEvent } from '@theme/events';

/**
 * A custom element that displays a product barcode.
 * This component listens for variant update events and updates the barcode display accordingly.
 */
class OneBarcode extends HTMLElement {
  connectedCallback() {
    const closestSection = this.closest('.shopify-section, dialog');
    if (!closestSection) return;
    closestSection.addEventListener(
      ThemeEvents.variantUpdate,
      this.updateBarcode
    );
  }

  disconnectedCallback() {
    const closestSection = this.closest('.shopify-section, dialog');
    if (!closestSection) return;
    closestSection.removeEventListener(
      ThemeEvents.variantUpdate,
      this.updateBarcode
    );
  }

  /**
   * Updates the barcode.
   * @param {VariantUpdateEvent} event - The variant update event.
   */
  updateBarcode = (event) => {
    if (event.detail.data.newProduct) {
      this.dataset.productId = event.detail.data.newProduct.id;
    } else if (
      event.target instanceof HTMLElement &&
      event.target.dataset.productId !== this.dataset.productId
    ) {
      return;
    }

    const newBarcode = event.detail.data.html.querySelector(
      'one-variant-barcode'
    );

    if (!newBarcode) return;

    const newBarcodeText = newBarcode.textContent.trim();
    const currentBarcodeText = this.textContent.trim();

    if (currentBarcodeText !== newBarcodeText) {
      this.textContent = newBarcodeText;
    }
  };
}

if (!customElements.get('one-variant-barcode')) {
  customElements.define('one-variant-barcode', OneBarcode);
}
