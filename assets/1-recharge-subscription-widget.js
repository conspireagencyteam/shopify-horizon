/**
 * Recharge Subscription Widget Custom Element
 *
 * This module provides a custom element wrapper for Recharge subscription widgets that
 * dynamically loads the widget configuration and scripts from the product page section.
 * It handles script deduplication to prevent loading the same scripts multiple times.
 *
 * Features:
 * - Fetches Recharge widget configuration from product page sections
 * - Loads required external and inline scripts for the widget
 * - Prevents duplicate script loading (checks globally for external scripts, locally for inline)
 * - Works with the recharge-subscription-widget block in product sections
 *
 * Usage:
 * Use the <recharge-subscription-widget-custom> element with required attributes:
 *   <recharge-subscription-widget-custom
 *     data-product-handle="product-handle"
 *     data-product-information-section-id="section-id">
 *     <div class="recharge-subscription-widget">
 *       <div class="recharge-widget-container">...</div>
 *     </div>
 *   </recharge-subscription-widget-custom>
 *
 * Required Attributes:
 * - data-product-handle: The product handle to fetch the widget from
 * - data-product-information-section-id: The section ID containing the Recharge widget
 */

if (!customElements.get('recharge-subscription-widget-custom')) {
  class RechargeSubscriptionWidgetCustom extends HTMLElement {
    connectedCallback() {
      const productHandle = this.getAttribute('data-product-handle');
      const sectionId = this.getAttribute(
        'data-product-information-section-id'
      );
      const widget = this.querySelector('.recharge-subscription-widget');
      const widgetContainer = widget?.querySelector(
        '.recharge-widget-container'
      );

      if (!productHandle || !sectionId || !widgetContainer) return;

      // Check if required scripts are already loaded in this custom element
      const requiredIds = [
        'SubscriptionWidgetConfig__shopify_settings',
        'SubscriptionWidgetConfig__preview_config',
        'SubscriptionWidgetConfig__configs',
      ];
      if (
        requiredIds.every((id) =>
          this.querySelector(`script#${id}`)?.textContent.trim()
        )
      )
        return;

      // Fetch section from product page
      fetch(`/products/${productHandle}?sections=${sectionId}`)
        .then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))
        )
        .then((data) => {
          const sectionKey = Object.keys(data)[0];
          const sectionHTML = sectionKey ? data[sectionKey] : null;
          if (!sectionHTML) return;

          const doc = new DOMParser().parseFromString(sectionHTML, 'text/html');
          const rechargeBlock = doc.querySelector(
            '.shopify-app-block.recharge-subscription-widget'
          );
          if (!rechargeBlock) return;

          const parentNode = widgetContainer.parentNode;
          if (!parentNode) return;

          rechargeBlock.querySelectorAll('script').forEach((script) => {
            // Handle external scripts - check globally since they're shared
            if (script.src) {
              if (document.querySelector(`script[src="${script.src}"]`)) return;
              const externalScript = document.createElement('script');
              externalScript.src = script.src;
              externalScript.type = script.type || 'text/javascript';
              parentNode.insertBefore(
                externalScript,
                widgetContainer.nextSibling
              );
              return;
            }

            // Handle inline scripts - skip if already exists in this custom element
            const scriptId = script.id;
            if (scriptId && this.querySelector(`script#${scriptId}`)) return;

            const newScript = document.createElement('script');
            if (scriptId) newScript.id = scriptId;
            newScript.textContent = script.textContent;
            parentNode.insertBefore(newScript, widgetContainer.nextSibling);
          });
        })
        .catch((err) => console.error('Recharge: Error fetching section', err));
    }
  }

  customElements.define(
    'recharge-subscription-widget-custom',
    RechargeSubscriptionWidgetCustom
  );
}
