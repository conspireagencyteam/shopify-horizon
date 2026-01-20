import { AddToCartComponent } from '@theme/product-form';
import { ThemeEvents } from '@theme/events';

/**
 * Extended add-to-cart component that updates button text based on
 * Recharge subscription selection.
 *
 * Follows the theme's component pattern:
 * - Self-contained behavior
 * - Listens for events and updates itself
 * - Uses data attributes for configuration
 *
 * @typedef {object} OneAddToCartRefs
 * @property {HTMLButtonElement} addToCartButton - The add to cart button.
 * @extends AddToCartComponent
 */
class OneAddToCartComponent extends AddToCartComponent {
  /** @type {AbortController | null} */
  #abortController = null;

  /** @type {Element | null} */
  #section = null;

  /** @type {boolean} */
  #isSubscription = false;

  /** @type {number | null} */
  #pendingRaf = null;

  connectedCallback() {
    super.connectedCallback();

    // Create new AbortController for this connection
    this.#abortController = new AbortController();
    this.#section = this.closest('.shopify-section');

    this.#bindEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    // Clean up listeners and pending rAF
    this.#abortController?.abort();
    this.#abortController = null;
    this.#section = null;

    if (this.#pendingRaf) {
      cancelAnimationFrame(this.#pendingRaf);
      this.#pendingRaf = null;
    }
  }

  /**
   * Binds event listeners for subscription changes and variant updates.
   * Listens on section scope to avoid responding to events from other products.
   * Sticky bar listens on document only (not section) to avoid double-firing.
   */
  #bindEvents() {
    if (!this.#abortController) return;

    const { signal } = this.#abortController;
    const isInStickyBar = !!this.closest('.sticky-buy-buttons');

    if (isInStickyBar) {
      // Sticky bar: listen on document only (event bubbles from main section)
      document.addEventListener(
        'recharge:selection:change',
        this.#handleSubscriptionChange,
        { signal }
      );

      // Also need variant updates for sticky bar
      if (this.#section) {
        this.#section.addEventListener(
          ThemeEvents.variantUpdate,
          this.#handleVariantUpdate,
          { signal }
        );
      }
    } else if (this.#section) {
      // Main section: listen on section scope
      this.#section.addEventListener(
        'recharge:selection:change',
        this.#handleSubscriptionChange,
        { signal }
      );

      this.#section.addEventListener(
        ThemeEvents.variantUpdate,
        this.#handleVariantUpdate,
        { signal }
      );
    }
  }

  /**
   * Handles subscription selection change events.
   * Updates the button text based on the selected plan type.
   * @param {CustomEvent} event
   */
  #handleSubscriptionChange = (event) => {
    if (!event.detail?.planType) return;

    // Skip if we're not connected
    if (!this.isConnected) return;

    const { planType } = event.detail;

    // Store subscription state
    this.#isSubscription = planType === 'subscription';

    this.#updateButtonText();
  };

  /**
   * Handles variant update events.
   * Re-applies subscription text after morph resets the button.
   * @param {CustomEvent} event
   */
  #handleVariantUpdate = (event) => {
    if (!this.isConnected) return;

    // Only re-apply if subscription is selected and product is available
    if (this.#isSubscription && event.detail?.resource?.available !== false) {
      // Cancel any pending rAF to avoid stacking
      if (this.#pendingRaf) {
        cancelAnimationFrame(this.#pendingRaf);
      }

      // Use requestAnimationFrame to run after morph completes
      this.#pendingRaf = requestAnimationFrame(() => {
        this.#pendingRaf = null;
        if (this.isConnected) {
          this.#updateButtonText();
        }
      });
    }
  };

  /**
   * Updates the button text based on current subscription state.
   */
  #updateButtonText() {
    const textElement = this.querySelector('.add-to-cart-text__content');
    if (!textElement) return;

    // Try own data attributes first
    let newText = this.#isSubscription
      ? this.dataset.subscriptionText
      : this.dataset.defaultText;

    // Fallback: sync from main button if we're in sticky bar (no data attributes)
    if (!newText && this.#section) {
      const mainComponent = this.#section.querySelector(
        'one-add-to-cart-component:not(.sticky-buy-buttons one-add-to-cart-component)'
      );

      if (mainComponent) {
        newText = this.#isSubscription
          ? /** @type {HTMLElement} */ (mainComponent).dataset.subscriptionText
          : /** @type {HTMLElement} */ (mainComponent).dataset.defaultText;
      }
    }

    if (newText) {
      textElement.textContent = newText;
    }
  }
}

if (!customElements.get('one-add-to-cart-component')) {
  customElements.define('one-add-to-cart-component', OneAddToCartComponent);
}
