class OneSectionGroupBegin extends HTMLElement {
  static observedAttributes = ['style'];

  #wrapper = null;
  #ownerId = null;

  connectedCallback() {
    this.#wrap();
  }

  disconnectedCallback() {
    this.#unwrap();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.#updateWrapper();
  }

  #readColor() {
    return this.style.getPropertyValue('--group-color').trim() || 'transparent';
  }

  #wrap() {
    const beginSection = this.closest('.shopify-section');
    if (!beginSection) return;

    // Already wrapped? The wrapper sits right after beginSection.
    const nextSibling = beginSection.nextElementSibling;
    if (
      nextSibling?.classList.contains('1-section-group') &&
      nextSibling.dataset.groupOwner === beginSection.id
    ) {
      this.#wrapper = nextSibling;
      this.#ownerId = beginSection.id;
      return;
    }

    // Walk siblings AFTER beginSection until we find an end marker, another
    // begin marker (auto-close before next group), or run out of siblings.
    let endSection = null;
    let cursor = beginSection.nextElementSibling;
    while (cursor) {
      if (cursor.querySelector('one-section-group-begin')) break;
      endSection = cursor;
      if (cursor.querySelector('one-section-group-end')) break;
      cursor = cursor.nextElementSibling;
    }

    if (!endSection) return;

    const wrapper = document.createElement('div');
    wrapper.className = '1-section-group';
    wrapper.style.setProperty('--group-color', this.#readColor());
    wrapper.dataset.groupOwner = beginSection.id;

    // Insert wrapper right after beginSection — beginSection itself is NOT moved.
    // This is critical: moving beginSection would trigger disconnect/connect on
    // `this` and cause infinite recursion.
    beginSection.after(wrapper);

    // Move siblings between wrapper and (inclusive) endSection into the wrapper.
    let node = wrapper.nextElementSibling;
    const stopAfter = endSection.nextElementSibling;
    while (node && node !== stopAfter) {
      const next = node.nextElementSibling;
      wrapper.appendChild(node);
      node = next;
    }

    this.#wrapper = wrapper;
    this.#ownerId = beginSection.id;
  }

  #unwrap() {
    let wrapper = this.#wrapper;
    if (!wrapper && this.#ownerId) {
      wrapper = document.querySelector(
        `.\\31-section-group[data-group-owner="${this.#ownerId}"]`
      );
    }
    if (!wrapper || !wrapper.parentNode) {
      this.#wrapper = null;
      return;
    }
    while (wrapper.firstChild) {
      wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
    }
    wrapper.remove();
    this.#wrapper = null;
  }

  #updateWrapper() {
    if (!this.#wrapper) return;
    this.#wrapper.style.setProperty('--group-color', this.#readColor());
  }
}

customElements.define('one-section-group-begin', OneSectionGroupBegin);
customElements.define('one-section-group-end', class extends HTMLElement {});
