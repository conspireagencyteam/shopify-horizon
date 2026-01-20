/**
 * Recharge Purchase Option Observer for Horizon Theme
 *
 * This module integrates Recharge subscription widgets with the Horizon theme's variant update system.
 * It observes Recharge purchase option selections and price changes, then dispatches events to keep
 * the theme's price display synchronized with the Recharge widget.
 *
 * Features:
 * - Detects when users select one-time or subscription purchase options in Recharge widgets
 * - Monitors price changes when product variants are changed (via variant picker)
 * - Dispatches ThemeEvents.variantUpdate to update the theme's price display
 * - Works with Shadow DOM used by Recharge widgets
 * - Scoped to individual product instances using the recharge-product custom element
 *
 * Usage:
 * Wrap product forms and Recharge widgets with <recharge-product> custom element:
 *   <recharge-product>
 *     <product-form-component>...</product-form-component>
 *     <recharge-subscription-widget>...</recharge-subscription-widget>
 *   </recharge-product>
 *
 * Events Dispatched:
 * - recharge:selection:change - When a purchase option is selected
 * - ThemeEvents.variantUpdate - When price needs to update (selection or variant change)
 */

import { ThemeEvents, VariantUpdateEvent } from '@theme/events';

(function () {
  'use strict';

  class RechargePurchaseOptionObserver {
    /**
     * @param {HTMLElement} element
     */
    constructor(element) {
      this.element = element;
      this.initialized = false;
      /** @type {MutationObserver | null} */
      this.selectionObserver = null;
      /** @type {MutationObserver | null} */
      this.widgetContentObserver = null;
      /** @type {MutationObserver | null} */
      this.widgetObserver = null;
      /** @type {ShadowRoot | null} */
      this.rechargeContainer = null;
      /** @type {HTMLElement | null} */
      this.currentSelectedElement = null;

      this.init();
    }

    init() {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    }

    setup() {
      this.findRechargeContainer();
      this.startObserving();
      this.initialized = true;
    }

    findRechargeContainer() {
      // Look for Recharge custom elements and app blocks within element
      const rechargeSelectors = [
        'recharge-subscription-widget',
        '[id*="shopify-app-block"][id*="recharge"]',
        '[id*="recharge"]',
      ];

      /** @type {HTMLElement | null} */
      let foundWidgetElement = null;

      for (const selector of rechargeSelectors) {
        const elements = this.element.querySelectorAll(selector);

        for (const element of elements) {
          const shadowRoot = this.findShadowRoot(
            /** @type {HTMLElement} */ (element)
          );
          if (shadowRoot) {
            this.rechargeContainer = shadowRoot;
            return;
          }

          // Store the widget element if we found it but shadow root isn't ready yet
          if (
            !foundWidgetElement &&
            (element.tagName === 'RECHARGE-SUBSCRIPTION-WIDGET' ||
              selector === 'recharge-subscription-widget')
          ) {
            foundWidgetElement = /** @type {HTMLElement} */ (element);
          }
        }
      }

      // If we found the widget but no shadow root, wait for it to initialize
      if (!this.rechargeContainer && foundWidgetElement) {
        this.retryFindShadowRoot(foundWidgetElement);
      }
    }

    /**
     * @param {HTMLElement} widgetElement
     * @param {number} attempt
     * @param {number} maxAttempts
     */
    retryFindShadowRoot(widgetElement, attempt = 0, maxAttempts = 10) {
      const shadowRoot = this.findShadowRoot(widgetElement);

      if (shadowRoot) {
        this.rechargeContainer = shadowRoot;

        // Stop widget observer if it exists
        if (this.widgetObserver) {
          this.stopWidgetObserver();
        }

        // Set up selection observer now that we have the shadow root
        // Only set up if not already set up
        if (!this.selectionObserver) {
          this.setupSelectionObserver();
        }
        return;
      }

      if (attempt < maxAttempts) {
        setTimeout(() => {
          this.retryFindShadowRoot(widgetElement, attempt + 1, maxAttempts);
        }, 300);
      }
    }

    /**
     * @param {ShadowRoot | HTMLElement} observeTarget
     * @returns {boolean}
     */
    hasSubscriptionOptionsAvailable(observeTarget) {
      // Check if there are subscription-related elements in the widget
      const subscriptionElements = observeTarget.querySelectorAll(
        '[part*="subscription"], [part*="rc-purchase-option__unit-price"], [part*="rc-purchase-option__discounted-price"]'
      );

      // Also check for subscription text content or labels
      const subscriptionText = observeTarget.textContent || '';
      const hasSubscriptionText =
        /subscription|subscribe|recurring|delivery/i.test(subscriptionText);

      return subscriptionElements.length > 0 || hasSubscriptionText;
    }

    /**
     * @param {HTMLElement} element
     * @returns {ShadowRoot | null}
     */
    findShadowRoot(element) {
      // Check if element has shadow root
      if (element.shadowRoot) {
        return element.shadowRoot;
      }

      // Check child elements for shadow roots
      for (const child of element.children) {
        if (child.shadowRoot) {
          return child.shadowRoot;
        }

        // Recursively check nested elements
        /** @type {ShadowRoot | null} */
        const nestedShadowRoot = this.findShadowRoot(
          /** @type {HTMLElement} */ (child)
        );
        if (nestedShadowRoot) {
          return nestedShadowRoot;
        }
      }

      return null;
    }

    startObserving() {
      // Start observing the product form area for the Recharge widget to appear
      this.observeForRechargeWidget();
    }

    observeForRechargeWidget() {
      // Look specifically for the recharge widget container within element
      const rechargeWidget = this.element.querySelector(
        'recharge-subscription-widget'
      );

      if (rechargeWidget) {
        this.checkForExistingWidget();
        return;
      }

      // If not found, observe for the widget to appear
      this.widgetObserver = new MutationObserver((mutations) => {
        this.handleWidgetMutations(mutations);
      });

      // Observe within element for the widget to appear
      this.widgetObserver.observe(this.element, {
        childList: true,
        subtree: true,
      });

      // Also check if widget is already present (fallback)
      this.checkForExistingWidget();
    }

    /**
     * @param {MutationRecord[]} mutations
     */
    handleWidgetMutations(mutations) {
      let foundWidget = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = /** @type {HTMLElement} */ (node);
              // Check specifically for recharge-subscription-widget
              if (
                element.tagName === 'RECHARGE-SUBSCRIPTION-WIDGET' ||
                element.querySelector('recharge-subscription-widget')
              ) {
                foundWidget = true;
                break;
              }
            }
          }
        }
      }

      if (foundWidget) {
        // Find the widget element and retry for shadow root
        const widgetElement = this.element.querySelector(
          'recharge-subscription-widget'
        );
        if (widgetElement) {
          this.findRechargeContainer();
          // If shadow root found immediately, proceed; otherwise retryFindShadowRoot will handle it
          if (this.rechargeContainer) {
            this.stopWidgetObserver();
            this.setupSelectionObserver();
          }
        }
      }
    }

    checkForExistingWidget() {
      this.findRechargeContainer();
      if (this.rechargeContainer) {
        this.stopWidgetObserver();
        this.setupSelectionObserver();
      }
    }

    stopWidgetObserver() {
      if (this.widgetObserver) {
        this.widgetObserver.disconnect();
        this.widgetObserver = null;
      }
    }

    setupSelectionObserver() {
      const observeTarget =
        this.rechargeContainer ||
        /** @type {ShadowRoot | HTMLElement | null} */ (
          this.element.querySelector('recharge-subscription-widget')
        );

      if (!observeTarget) {
        return;
      }

      // Create observer for selection changes and price updates
      this.selectionObserver = new MutationObserver((mutations) => {
        this.handleSelectionMutations(mutations);
      });

      // Observe the entire widget for changes
      // Watch for: part attribute changes (selection), text content changes (price updates), and child list changes
      this.selectionObserver.observe(observeTarget, {
        attributes: true,
        attributeFilter: ['part'],
        childList: true,
        subtree: true,
        characterData: true, // Watch for text content changes in price elements
      });

      // Set up observer to detect when widget content is loaded
      this.setupWidgetContentObserver(observeTarget);
    }

    /**
     * @param {ShadowRoot | HTMLElement} observeTarget
     */
    setupWidgetContentObserver(observeTarget) {
      // First check if content is already loaded
      if (this.isWidgetContentLoaded(observeTarget)) {
        this.checkForInitialSelection();
        return;
      }

      // Set up observer to detect when price elements appear (indicating widget is loaded)
      this.widgetContentObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            // Check if widget content is now loaded
            if (this.isWidgetContentLoaded(observeTarget)) {
              // Stop observing and check for initial selection
              if (this.widgetContentObserver) {
                this.widgetContentObserver.disconnect();
                this.widgetContentObserver = null;
              }

              this.checkForInitialSelection();
              return;
            }
          }
        }
      });

      // Observe for content changes
      this.widgetContentObserver.observe(observeTarget, {
        childList: true,
        subtree: true,
      });
    }

    /**
     * @param {ShadowRoot | HTMLElement} observeTarget
     * @returns {boolean}
     */
    isWidgetContentLoaded(observeTarget) {
      // Check if the widget has price elements (indicates it's fully loaded)
      const priceElements = observeTarget.querySelectorAll(
        '[part="rc-purchase-option__price"], [part="rc-purchase-option__unit-price"], [part="rc-purchase-option__discounted-price"]'
      );

      return priceElements.length > 0;
    }

    checkForInitialSelection() {
      const observeTarget =
        this.rechargeContainer ||
        /** @type {ShadowRoot | HTMLElement | null} */ (
          this.element.querySelector('recharge-subscription-widget')
        );

      if (!observeTarget) {
        return;
      }

      // Check if subscription options are available
      const hasSubscriptionOptions =
        this.hasSubscriptionOptionsAvailable(observeTarget);

      if (!hasSubscriptionOptions) {
        return;
      }

      // Look for currently selected option
      const selectedElement = /** @type {HTMLElement | null} */ (
        observeTarget.querySelector('[part*="rc-purchase-option__selected"]')
      );

      if (selectedElement) {
        // Set current selected element and dispatch event
        this.currentSelectedElement = selectedElement;

        const priceData = this.extractPriceData(selectedElement);

        if (priceData) {
          this.dispatchPurchaseOptionChangeEvent(
            selectedElement,
            priceData,
            'initial-load'
          );
        }
      }
    }

    /**
     * @param {MutationRecord[]} mutations
     */
    handleSelectionMutations(mutations) {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'part'
        ) {
          const element = /** @type {HTMLElement} */ (mutation.target);
          const partValue = element.getAttribute('part');

          // Check if rc-purchase-option__selected was added
          if (partValue && partValue.includes('rc-purchase-option__selected')) {
            this.handlePurchaseOptionSelected(element);
          }
        } else if (mutation.type === 'characterData') {
          // Text content changed - check if parent is a price element
          const target = mutation.target;
          if (target.nodeType === Node.TEXT_NODE && target.parentElement) {
            const priceElement = /** @type {HTMLElement} */ (
              target.parentElement
            );

            if (
              priceElement &&
              typeof priceElement.getAttribute === 'function' &&
              (priceElement.getAttribute('part')?.includes('price') ||
                priceElement.querySelector('[part*="price"]'))
            ) {
              // Price content changed, check if we have a selected option
              this.checkForPriceUpdate();
            }
          }
        } else if (mutation.type === 'childList') {
          // Check added/removed nodes for price elements
          const nodesToCheck = [
            ...Array.from(mutation.addedNodes),
            ...Array.from(mutation.removedNodes),
          ];

          for (const node of nodesToCheck) {
            // Skip text nodes
            if (node.nodeType !== Node.ELEMENT_NODE) {
              continue;
            }

            const element = /** @type {HTMLElement} */ (node);

            // Check if this element or its descendants are price elements
            if (
              typeof element.getAttribute === 'function' &&
              (element.getAttribute('part')?.includes('price') ||
                element.querySelector('[part*="price"]'))
            ) {
              // Price element was added or removed, check for update
              this.checkForPriceUpdate();
              break; // Only need to trigger once per mutation
            }
          }
        }
      }
    }

    checkForPriceUpdate() {
      const observeTarget =
        this.rechargeContainer ||
        /** @type {ShadowRoot | HTMLElement | null} */ (
          this.element.querySelector('recharge-subscription-widget')
        );

      if (!observeTarget) return;

      // Find currently selected option
      const selectedElement = /** @type {HTMLElement | null} */ (
        observeTarget.querySelector('[part*="rc-purchase-option__selected"]')
      );

      if (selectedElement && selectedElement === this.currentSelectedElement) {
        // Same option is selected but price might have changed
        const priceData = this.extractPriceData(selectedElement);

        if (priceData) {
          this.dispatchVariantUpdateEvent(priceData.priceElement);
        }
      } else if (selectedElement) {
        // Different option selected, handle as selection change
        this.handlePurchaseOptionSelected(selectedElement);
      }
    }

    /**
     * @param {HTMLElement} selectedElement
     */
    handlePurchaseOptionSelected(selectedElement) {
      // Update current selected element
      this.currentSelectedElement = selectedElement;

      const priceData = this.extractPriceData(selectedElement);

      if (priceData) {
        // Dispatch custom event
        this.dispatchPurchaseOptionChangeEvent(
          selectedElement,
          priceData,
          'selection'
        );
      }
    }

    /**
     * @param {HTMLElement} selectedElement
     * @param {{ price: number; planType: string; hasDiscount: boolean; priceElement: HTMLElement }} priceData
     * @param {string} changeType
     */
    dispatchPurchaseOptionChangeEvent(selectedElement, priceData, changeType) {
      // Dispatch custom event
      const event = new CustomEvent('recharge:selection:change', {
        detail: {
          selectedOption: selectedElement,
          price: priceData.price,
          planType: priceData.planType,
          hasDiscount: priceData.hasDiscount,
          priceElement: priceData.priceElement,
          changeType: changeType, // 'selection' or 'initial-load'
        },
        bubbles: true,
      });

      this.element.dispatchEvent(event);

      // Also dispatch ThemeEvents.variantUpdate to trigger price updates
      if (priceData.priceElement) {
        this.dispatchVariantUpdateEvent(priceData.priceElement);
      }
    }

    /**
     * @param {HTMLElement} priceElement
     */
    dispatchVariantUpdateEvent(priceElement) {
      // Get the product form to find variant and product IDs within element
      const productForm = this.element.querySelector('product-form-component');
      if (!productForm) {
        return;
      }

      // Get variant ID from the form
      const variantIdInput = /** @type {HTMLInputElement | null} */ (
        productForm.querySelector('input[name="id"]')
      );
      const variantId = variantIdInput?.value || null;

      // Get product ID from the form component
      const productId =
        /** @type {HTMLElement} */ (productForm).dataset.productId || '';

      // Try to get full variant object from variant-picker's JSON script tag
      // This matches how variant-picker.js gets variant data
      let variantResource = null;
      const variantPicker = this.element.querySelector('variant-picker');
      if (variantPicker) {
        const variantJsonScript = variantPicker.querySelector(
          'script[type="application/json"]'
        );
        if (variantJsonScript?.textContent) {
          try {
            variantResource = JSON.parse(variantJsonScript.textContent);
            // Ensure the variant ID matches what's in the form (in case Recharge changed it)
            if (variantId && variantResource.id !== variantId) {
              variantResource.id = variantId;
            }
          } catch (e) {
            console.warn(
              '[RechargePurchaseOptionObserver] Failed to parse variant JSON:',
              e
            );
          }
        }
      }

      // Fallback to minimal variant object if we couldn't get full variant data
      if (!variantResource) {
        variantResource = {
          id: variantId || '',
          available: true,
          inventory_management: false,
        };
      } else {
        // Ensure variant ID is set even if JSON didn't have it
        if (!variantResource.id && variantId) {
          variantResource.id = variantId;
        }
        // Ensure required fields are present
        if (variantResource.available === undefined) {
          variantResource.available = true;
        }
        if (variantResource.inventory_management === undefined) {
          variantResource.inventory_management = false;
        }
      }

      // Extract price HTML from the Recharge widget
      const priceHTML =
        /** @type {HTMLElement} */ (priceElement).innerHTML ||
        /** @type {HTMLElement} */ (priceElement).textContent ||
        '';

      if (!priceHTML) {
        return;
      }

      // Create synthetic HTML document structure that product-price.js expects
      // Structure: <product-price><div ref="priceContainer">[price HTML]</div></product-price>
      const htmlString = `
        <product-price>
          <div ref="priceContainer">${priceHTML}</div>
        </product-price>
      `;

      const html = new DOMParser().parseFromString(htmlString, 'text/html');

      // Dispatch event from product-form-component so event.target.dataset.productId works
      // The event will bubble up to the section where product-price.js listens
      const variantUpdateEvent = new VariantUpdateEvent(
        variantResource,
        'recharge-purchase-option',
        {
          html,
          productId: productId,
          newProduct: undefined,
        }
      );

      // Dispatch from productForm so event.target is the product-form-component
      productForm.dispatchEvent(variantUpdateEvent);
    }

    /**
     * @param {HTMLElement} selectedElement
     * @returns {{ price: number; planType: string; hasDiscount: boolean; priceElement: HTMLElement } | null}
     */
    extractPriceData(selectedElement) {
      // Find the container that holds this selected element
      const container = /** @type {HTMLElement} */ (
        selectedElement.closest('[part*="rc-purchase-option"]') ||
          selectedElement
      );

      // Determine if this is a one-time or subscription option
      const isOneTime = this.isOneTimeOption(container);
      const isSubscription = this.isSubscriptionOption(container);

      /** @type {HTMLElement | null} */
      let priceElement = null;
      let planType = 'unknown';
      let hasDiscount = false;

      if (isOneTime) {
        // For one-time purchases, look for rc-purchase-option__price
        priceElement = /** @type {HTMLElement | null} */ (
          container.querySelector('[part="rc-purchase-option__price"]')
        );
        planType = 'one-time';
        hasDiscount = false;
      } else if (isSubscription) {
        // For subscriptions, check for discounted price first, then unit price
        priceElement = /** @type {HTMLElement | null} */ (
          container.querySelector(
            '[part="rc-purchase-option__discounted-price"]'
          )
        );
        planType = 'subscription';
        hasDiscount = !!priceElement;

        if (!priceElement) {
          priceElement = /** @type {HTMLElement | null} */ (
            container.querySelector('[part="rc-purchase-option__unit-price"]')
          );
          hasDiscount = false;
        }
      }

      if (!priceElement) {
        console.warn(
          '[RechargePurchaseOptionObserver] No price element found for selected option'
        );
        return null;
      }

      const price = this.extractPriceFromElement(priceElement);

      if (!price || price <= 0) {
        console.warn(
          '[RechargePurchaseOptionObserver] Invalid price extracted:',
          price
        );
        return null;
      }

      return {
        price,
        planType,
        hasDiscount,
        priceElement,
      };
    }

    /**
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    isOneTimeOption(element) {
      // Check if this element or its parents indicate a one-time purchase option
      /** @type {HTMLElement | null} */
      let current = element;
      let depth = 0;

      while (current && depth < 10) {
        const partValue = current.getAttribute && current.getAttribute('part');

        if (partValue && partValue.includes('onetime')) {
          return true;
        }

        current = /** @type {HTMLElement | null} */ (current.parentNode);
        depth++;
      }

      return false;
    }

    /**
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    isSubscriptionOption(element) {
      // Check if this element or its parents indicate a subscription option
      /** @type {HTMLElement | null} */
      let current = element;
      let depth = 0;

      while (current && depth < 10) {
        const partValue = current.getAttribute && current.getAttribute('part');

        if (partValue && partValue.includes('subscription')) {
          return true;
        }

        current = /** @type {HTMLElement | null} */ (current.parentNode);
        depth++;
      }

      return false;
    }

    /**
     * @param {HTMLElement} element
     * @returns {number}
     */
    extractPriceFromElement(element) {
      // Get all text content from the element and its children
      const text = element.textContent || element.innerText || '';

      // Try multiple regex patterns to extract price
      const patterns = [
        /\$([0-9,]+\.?\d*)/, // $29.99
        /([0-9,]+\.?\d*)\s*\$/, // 29.99$
        /([0-9,]+\.?\d+)/, // 29.99 (without $)
        /USD\s*([0-9,]+\.?\d*)/i, // USD 29.99
        /([0-9,]+\.?\d*)\s*USD/i, // 29.99 USD
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const price = parseFloat(match[1].replace(/,/g, ''));
          if (price > 0) {
            return price;
          }
        }
      }

      return 0;
    }

    destroy() {
      if (this.selectionObserver) {
        this.selectionObserver.disconnect();
        this.selectionObserver = null;
      }

      if (this.widgetContentObserver) {
        this.widgetContentObserver.disconnect();
        this.widgetContentObserver = null;
      }

      this.stopWidgetObserver();

      this.currentSelectedElement = null;
    }
  }

  // Custom element to scope each Recharge observer instance
  class RechargeProduct extends HTMLElement {
    /** @type {RechargePurchaseOptionObserver | null} */
    observer = null;

    connectedCallback() {
      this.observer = new RechargePurchaseOptionObserver(this);
    }

    disconnectedCallback() {
      if (this.observer) {
        this.observer.destroy();
        this.observer = null;
      }
    }
  }

  if (!customElements.get('recharge-product')) {
    customElements.define('recharge-product', RechargeProduct);
  }
})();
