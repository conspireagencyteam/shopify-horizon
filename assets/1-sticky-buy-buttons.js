import { Component } from '@theme/component';
import { ThemeEvents } from '@theme/events';

/**
 * Sticky buy buttons component that appears when the main buy buttons
 * scroll out of the viewport.
 *
 * Syncs price, media thumbnail, variant ID, quantity, and selling plan
 * with the main product form using the theme's standard event patterns.
 *
 * @extends Component
 */
class StickyBuyButtonsComponent extends Component {
  /** @type {IntersectionObserver | null} */
  #buyButtonsObserver = null;

  /** @type {IntersectionObserver | null} */
  #footerObserver = null;

  /** @type {AbortController | null} */
  #abortController = null;

  /** @type {boolean} */
  #isVisible = false;

  /** @type {boolean} */
  #buyButtonsInView = true;

  /** @type {boolean} */
  #footerInView = false;

  /** @type {boolean} */
  #scrollThresholdPassed = false;

  /** @type {Element | null} */
  #section = null;

  /** @type {boolean} */
  #isSubscription = false;

  /** Scroll threshold in pixels before enabling sticky bar */
  static #SCROLL_THRESHOLD = 100;

  connectedCallback() {
    super.connectedCallback();
    this.#section = this.closest('.shopify-section');
    this.#abortController = new AbortController();
    this.#initBuyButtonsObserver();
    this.#initFooterObserver();
    this.#initScrollThreshold();
    this.#bindEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#buyButtonsObserver?.disconnect();
    this.#buyButtonsObserver = null;
    this.#footerObserver?.disconnect();
    this.#footerObserver = null;
    this.#abortController?.abort();
    this.#abortController = null;
    this.#section = null;
  }

  /**
   * Initialize the IntersectionObserver to watch the main buy buttons element.
   */
  #initBuyButtonsObserver() {
    const section = this.#section
      || this.closest('[class*="1-product-information"]')
      || this.closest('[data-section-type="product"]');

    if (!section) return;

    const targetElement = section.querySelector('[class*="1-buy-buttons-block"]')
      || section.querySelector('.buy-buttons-block');

    if (!targetElement) return;

    this.#buyButtonsObserver = new IntersectionObserver(
      (entries) => {
        this.#buyButtonsInView = entries[0].isIntersecting;
        this.#updateVisibility();
      },
      { threshold: 0 }
    );

    this.#buyButtonsObserver.observe(targetElement);
  }

  /**
   * Initialize the IntersectionObserver to watch the footer element.
   */
  #initFooterObserver() {
    const footer = document.querySelector('footer')
      || document.querySelector('[class*="footer"]')
      || document.querySelector('#shopify-section-footer');

    if (!footer) return;

    this.#footerObserver = new IntersectionObserver(
      (entries) => {
        this.#footerInView = entries[0].isIntersecting;
        this.#updateVisibility();
      },
      { threshold: 0 }
    );

    this.#footerObserver.observe(footer);
  }

  /**
   * Initialize scroll threshold detection.
   * Sticky bar won't show until user has scrolled past threshold.
   * Hides again if user scrolls back above threshold.
   */
  #initScrollThreshold() {
    const signal = this.#abortController?.signal;
    if (!signal) return;

    // Check initial scroll position
    this.#scrollThresholdPassed = window.scrollY >= StickyBuyButtonsComponent.#SCROLL_THRESHOLD;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const isPastThreshold = window.scrollY >= StickyBuyButtonsComponent.#SCROLL_THRESHOLD;
        if (isPastThreshold !== this.#scrollThresholdPassed) {
          this.#scrollThresholdPassed = isPastThreshold;
          this.#updateVisibility();
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true, signal });
  }

  /**
   * Update sticky bar visibility based on all conditions.
   * Show when: scroll threshold passed AND buy buttons NOT visible AND footer NOT visible
   */
  #updateVisibility() {
    if (this.#scrollThresholdPassed && !this.#buyButtonsInView && !this.#footerInView) {
      this.#show();
    } else {
      this.#hide();
    }
  }

  /**
   * Bind to variant update events and form input changes.
   */
  #bindEvents() {
    const signal = this.#abortController?.signal;
    if (!signal) return;

    const target = this.#section || document;

    target.addEventListener(ThemeEvents.variantUpdate, this.#handleVariantUpdate, { signal });
    target.addEventListener(ThemeEvents.quantitySelectorUpdate, this.#handleQuantityUpdate, { signal });

    if (this.#section) {
      this.#section.addEventListener('change', this.#handleFormChange, { signal });
    }

    document.addEventListener('recharge:selection:change', this.#handleRechargeSelectionChange, { signal });
  }

  /**
   * Handle quantity selector update events (from +/- buttons).
   * @param {CustomEvent} event
   */
  #handleQuantityUpdate = (event) => {
    const { detail } = event;
    if (!detail?.quantity) return;

    const target = /** @type {Element | null} */ (event.target);
    if (!target) return;

    const quantityValue = String(detail.quantity);
    const isFromStickyBar = this.contains(target);

    if (isFromStickyBar) {
      // Sync to main form
      this.#syncToMainForm('quantity', quantityValue);
    } else {
      // Sync to sticky bar
      this.#syncInputValue('quantity', quantityValue);
    }
  };

  /**
   * Handle Recharge subscription selection changes.
   * @param {CustomEvent} event
   */
  #handleRechargeSelectionChange = (event) => {
    if (!event.detail) return;

    // Store subscription state for use in #updateButtonState
    this.#isSubscription = event.detail.planType === 'subscription';

    this.#syncFromMainForm();
  };

  /**
   * Sync form values from the main product form to sticky form.
   */
  #syncFromMainForm() {
    if (!this.#section) return;

    const mainForm = this.#section.querySelector(
      'form[data-type="add-to-cart-form"]:not(.sticky-buy-buttons form)'
    );
    if (!mainForm) return;

    // Sync selling_plan
    const sellingPlan = /** @type {HTMLInputElement | null} */ (
      mainForm.querySelector('input[name="selling_plan"]')
    );
    this.#syncInputValue('selling_plan', sellingPlan?.value || '', true);

    // Sync variant ID
    const variantId = /** @type {HTMLInputElement | null} */ (
      mainForm.querySelector('input[name="id"]')
    );
    if (variantId?.value) {
      this.#syncInputValue('id', variantId.value);
    }

    // Sync quantity
    const quantity = /** @type {HTMLInputElement | null} */ (
      mainForm.querySelector('input[name="quantity"]')
    );
    if (quantity?.value) {
      this.#syncInputValue('quantity', quantity.value);
    }
  }

  /**
   * Sync a form input value to all matching inputs in sticky bar.
   * @param {string} name - Input name attribute
   * @param {string} value - Value to set
   * @param {boolean} [createIfMissing] - Create hidden input if not found
   */
  #syncInputValue(name, value, createIfMissing = false) {
    const inputs = this.querySelectorAll(`input[name="${name}"]`);

    if (inputs.length === 0 && createIfMissing) {
      // Create hidden input in each form
      this.querySelectorAll('form[data-type="add-to-cart-form"]').forEach((form) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
      return;
    }

    inputs.forEach((input) => {
      if (input instanceof HTMLInputElement) {
        input.value = value;
      }
    });
  }

  /**
   * Handle form input changes to sync values bidirectionally.
   * @param {Event} event
   */
  #handleFormChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    if (target instanceof HTMLInputElement && target.type === 'radio' && !target.checked) return;

    const { name, value } = target;
    const isFromStickyBar = this.contains(target);

    // Quantity syncs both ways
    if (name === 'quantity') {
      if (isFromStickyBar) {
        this.#syncToMainForm('quantity', value);
      } else {
        this.#syncInputValue('quantity', value);
      }
      return;
    }

    // Other fields only sync from main to sticky
    if (isFromStickyBar) return;

    if (name === 'id') {
      this.#syncInputValue(name, value);
    } else if (name === 'selling_plan') {
      this.#syncInputValue(name, value, true);
    }
  };

  /**
   * Sync a value from sticky bar to main form.
   * @param {string} name - Input name attribute
   * @param {string} value - Value to set
   */
  #syncToMainForm(name, value) {
    if (!this.#section) return;

    const mainForm = this.#section.querySelector(
      'form[data-type="add-to-cart-form"]:not(.sticky-buy-buttons form)'
    );
    if (!mainForm) return;

    const input = /** @type {HTMLInputElement | null} */ (
      mainForm.querySelector(`input[name="${name}"]`)
    );

    if (input && input.value !== value) {
      input.value = value;
      // Dispatch events to trigger any listeners
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * Handle variant update events.
   * @param {CustomEvent} event
   */
  #handleVariantUpdate = (event) => {
    const { detail } = event;
    if (!detail?.resource) return;

    const { resource, data } = detail;

    // Verify this update is for our product
    const formComponent = /** @type {HTMLElement | null} */ (
      this.querySelector('product-form-component')
    );
    if (formComponent?.dataset.productId && data?.productId) {
      if (formComponent.dataset.productId !== data.productId) return;
    }

    // Sync variant ID
    this.#syncInputValue('id', String(resource.id));

    // Update button state
    this.#updateButtonState(resource.available);

    // Sync price
    if (data?.html) {
      this.#updatePrice(data.html);
    }

    // Sync thumbnail
    if (resource.featured_media) {
      this.#updateThumbnail(resource.featured_media);
    }
  };

  /**
   * Update price display from event HTML or fallback to main page.
   * @param {Document} html
   */
  #updatePrice(html) {
    const stickyPrice = this.querySelector('product-price [ref="priceContainer"]');
    if (!stickyPrice) return;

    // Try event HTML first, then fallback to main page
    let newPrice = html.querySelector('product-price [ref="priceContainer"]')
      || html.querySelector('[ref="priceContainer"]');

    if (!newPrice && this.#section) {
      newPrice = this.#section.querySelector(
        'product-price:not(.sticky-buy-buttons product-price) [ref="priceContainer"]'
      );
    }

    if (newPrice && stickyPrice.innerHTML !== newPrice.innerHTML) {
      stickyPrice.innerHTML = newPrice.innerHTML;
    }
  }

  /**
   * Update thumbnail image when variant changes.
   * @param {{ id: number, alt?: string, preview_image?: { src: string } }} media
   */
  #updateThumbnail(media) {
    const img = /** @type {HTMLImageElement | null} */ (
      this.querySelector('.sticky-product-thumbnail img')
    );
    if (!img || !media?.preview_image?.src) return;

    const newMediaId = String(media.id);
    if (img.dataset.mediaId === newMediaId) return;

    const baseSrc = media.preview_image.src;
    const buildSrc = (/** @type {number} */ w) => {
      if (baseSrc.includes('width=')) return baseSrc.replace(/width=\d+/, `width=${w}`);
      return baseSrc + (baseSrc.includes('?') ? '&' : '?') + `width=${w}`;
    };

    img.srcset = [50, 100, 200, 400].map((w) => `${buildSrc(w)} ${w}w`).join(', ');
    img.src = buildSrc(400);
    img.dataset.mediaId = newMediaId;
    img.alt = media.alt || '';
  }

  /**
   * Update submit button state based on availability.
   * @param {boolean} available
   */
  #updateButtonState(available) {
    this.querySelectorAll('button[type="submit"]').forEach((btn) => {
      if (!(btn instanceof HTMLButtonElement)) return;

      btn.disabled = !available;

      const textEl = btn.querySelector('.add-to-cart-text__content');
      if (!textEl) return;

      if (!available) {
        // @ts-ignore - window.theme is a custom theme object
        const strings = window.theme?.strings || {};
        textEl.textContent = strings.soldOut || 'Sold out';
      } else {
        // When available, use stored subscription state
        const component = btn.closest('one-add-to-cart-component, add-to-cart-component');
        if (component instanceof HTMLElement) {
          textEl.textContent = this.#isSubscription
            ? (component.dataset.subscriptionText || 'Add subscription to cart')
            : (component.dataset.defaultText || 'Add to cart');
        }
      }
    });
  }

  /**
   * Show the sticky bar.
   */
  #show() {
    if (this.#isVisible) return;
    this.#isVisible = true;
    this.classList.add('is-visible');
    this.#syncFromMainForm();
  }

  /**
   * Hide the sticky bar.
   */
  #hide() {
    if (!this.#isVisible) return;
    this.#isVisible = false;
    this.classList.remove('is-visible');
  }
}

if (!customElements.get('sticky-buy-buttons-component')) {
  customElements.define('sticky-buy-buttons-component', StickyBuyButtonsComponent);
}
