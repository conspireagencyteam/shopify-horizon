import { Component } from '@theme/component';
import { sectionRenderer } from '@theme/section-renderer';
import { ThemeEvents } from '@theme/events';

/**
 * Collection title component that re-renders when filters change
 */
class CollectionTitle extends Component {
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

  #handleFilterUpdate = async () => {
    const sectionId = this.sectionId;
    if (!sectionId) return;

    await sectionRenderer.renderSection(sectionId, { cache: false });
  };
}

if (!customElements.get('collection-title')) {
  customElements.define('collection-title', CollectionTitle);
}
