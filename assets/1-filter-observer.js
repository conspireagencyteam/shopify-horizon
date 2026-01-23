import { Component } from '@theme/component';
import { sectionRenderer } from '@theme/section-renderer';
import { ThemeEvents } from '@theme/events';

// Debounce timers per section
const debounceTimers = new Map();

/**
 * Component that re-renders its section when filters change.
 * Multiple instances in the same section will only trigger one render.
 */
class FilterObserver extends Component {
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(ThemeEvents.FilterUpdate, this.#handleFilterUpdate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(ThemeEvents.FilterUpdate, this.#handleFilterUpdate);
  }

  get sectionId() {
    const section = this.closest('.shopify-section');
    if (!section) return null;
    return section.id.replace('shopify-section-', '');
  }

  #handleFilterUpdate = () => {
    const sectionId = this.sectionId;
    if (!sectionId) return;

    // Clear any existing timer for this section
    if (debounceTimers.has(sectionId)) {
      clearTimeout(debounceTimers.get(sectionId));
    }

    // Set a new timer to render after a short delay
    const timerId = setTimeout(async () => {
      debounceTimers.delete(sectionId);
      await sectionRenderer.renderSection(sectionId, { cache: false });
    }, 50);

    debounceTimers.set(sectionId, timerId);
  };
}

if (!customElements.get('one-filter-observer')) {
  customElements.define('one-filter-observer', FilterObserver);
}
