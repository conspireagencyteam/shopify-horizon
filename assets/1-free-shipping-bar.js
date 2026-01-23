import { ThemeEvents } from '@theme/events';

/**
 * A custom element that displays a free shipping progress bar.
 * Shows the remaining amount needed to qualify for free shipping
 * and updates dynamically when the cart changes.
 *
 * @element one-free-shipping-bar
 *
 * @attr {string} threshold - The minimum cart total (in cents) to qualify for free shipping
 * @attr {string} total-price - The current cart total (in cents)
 * @attr {string} reached-message - Message to display when threshold is reached
 * @attr {string} unreached-message - Message template with {{ remaining_amount }} placeholder
 * @attr {string} money-format - The shop's money format string
 */
class OneFreeShippingBar extends HTMLElement {
  /** @type {number} */
  #threshold;

  /** @type {AbortController} */
  #abortController;

  constructor() {
    super();

    // Parse threshold from attribute (expects dollar value, convert to cents)
    const thresholdAttr = this.getAttribute('threshold') || '0';
    this.#threshold = parseFloat(thresholdAttr.replace(/[^0-9.]/g, '')) * 100;

    // Store the parsed threshold back as cents for consistency
    this.setAttribute('threshold', String(this.#threshold));
  }

  static get observedAttributes() {
    return ['threshold', 'total-price'];
  }

  connectedCallback() {
    this.#abortController = new AbortController();

    // Listen for cart updates
    document.addEventListener(
      ThemeEvents.cartUpdate,
      this.#handleCartUpdate,
      { signal: this.#abortController.signal }
    );

    // Initial render
    this.#updateDisplay();
  }

  disconnectedCallback() {
    this.#abortController?.abort();
  }

  /**
   * Gets the current cart total price in cents
   * @returns {number}
   */
  get totalPrice() {
    return parseFloat(this.getAttribute('total-price') || '0');
  }

  /**
   * Sets the cart total price in cents
   * @param {number} value
   */
  set totalPrice(value) {
    this.setAttribute('total-price', String(value));
  }

  /**
   * Gets the progress percentage (0-100)
   * @returns {number}
   */
  get progress() {
    if (this.#threshold <= 0) return 100;
    return Math.min(100, Math.round((this.totalPrice / this.#threshold) * 100));
  }

  /**
   * Checks if the free shipping threshold has been reached
   * @returns {boolean}
   */
  get isThresholdReached() {
    return this.totalPrice >= this.#threshold;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.#updateDisplay();
    }
  }

  /**
   * Handles cart update events
   * @param {CustomEvent} event
   */
  #handleCartUpdate = (event) => {
    const progressBar = this.querySelector('[ref="progressBar"]');
    if (progressBar) {
      progressBar.setAttribute('aria-busy', 'true');
    }

    // Calculate the price for shipping-eligible items
    const cart = event.detail?.resource;
    if (cart?.items) {
      const priceForItems = cart.items
        .filter((/** @type {{ requires_shipping: boolean }} */ item) => item.requires_shipping)
        .reduce(
          (/** @type {number} */ sum, /** @type {{ final_line_price: number }} */ item) =>
            sum + item.final_line_price,
          0
        );

      // Subtract cart-level discounts
      const cartDiscount = (cart.cart_level_discount_applications || []).reduce(
        (/** @type {number} */ sum, /** @type {{ total_allocated_amount: number }} */ discount) =>
          sum + discount.total_allocated_amount,
        0
      );

      this.totalPrice = priceForItems - cartDiscount;
    }

    if (progressBar) {
      progressBar.setAttribute('aria-busy', 'false');
    }
  };

  /**
   * Updates the display message and progress bar
   */
  #updateDisplay() {
    const messageElement = this.querySelector('[ref="message"]');
    const progressBar = this.querySelector('[ref="progressBar"]');

    if (messageElement) {
      if (this.isThresholdReached) {
        messageElement.innerHTML = this.getAttribute('reached-message') || '';
      } else {
        const remaining = this.#threshold - this.totalPrice;
        const formattedRemaining = this.#formatMoney(remaining);
        const unreachedMessage = this.getAttribute('unreached-message') || '';

        // Replace the placeholder with the formatted remaining amount
        messageElement.innerHTML = unreachedMessage.replace(
          /\{\{\s*remaining_amount\s*\}\}/g,
          formattedRemaining
        );
      }
    }

    if (progressBar) {
      progressBar.setAttribute('aria-valuenow', String(this.progress));
      progressBar.style.setProperty('--progress', String(this.progress / 100));
    }
  }

  /**
   * Formats a price in cents to display format
   * @param {number} cents - The price in cents
   * @returns {string} - Formatted price string
   */
  #formatMoney(cents) {
    const moneyFormat = this.getAttribute('money-format') || '${{amount}}';
    const amount = (cents / 100).toFixed(2);
    const amountNoDecimals = Math.floor(cents / 100).toString();
    const amountWithComma = amount.replace('.', ',');

    // Handle common Shopify money format patterns
    return moneyFormat
      .replace('{{amount_with_comma_separator}}', amountWithComma)
      .replace('{{amount_no_decimals}}', amountNoDecimals)
      .replace('{{amount_no_decimals_with_comma_separator}}', amountNoDecimals)
      .replace('{{amount}}', amount);
  }
}

if (!customElements.get('one-free-shipping-bar')) {
  customElements.define('one-free-shipping-bar', OneFreeShippingBar);
}
