/**
 * Detects when a sticky element is stuck to the top of the viewport
 * and toggles an `is-stuck` class. Uses a sentinel element placed
 * just above the sticky container — when the sentinel scrolls out
 * of view, the sticky element must be stuck.
 */
class StickyProductObserver extends HTMLElement {
  /** @type {IntersectionObserver | null} */
  #observer = null;

  /** @type {HTMLElement | null} */
  #sentinel = null;

  connectedCallback() {
    this.#sentinel = this.querySelector('[data-sticky-sentinel]');
    const sticky = this.querySelector('[data-sticky-target]');

    if (!this.#sentinel || !sticky) return;

    this.#observer = new IntersectionObserver(
      ([entry]) => {
        sticky.classList.toggle('is-stuck', !entry.isIntersecting);
      },
      { threshold: 0 }
    );

    this.#observer.observe(this.#sentinel);
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#sentinel = null;
  }
}

if (!customElements.get('sticky-product-observer')) {
  customElements.define('sticky-product-observer', StickyProductObserver);
}
