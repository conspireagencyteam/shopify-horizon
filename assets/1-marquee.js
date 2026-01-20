import { Component } from '@theme/component';

/**
 * High-performance marquee using CSS animation with pixel values.
 * Based on proven approach that works on iOS Safari without scroll glitches.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} wrapper - The wrapper element.
 * @property {HTMLElement} content - The content element.
 * @property {HTMLElement[]} marqueeItems - The marquee items collection.
 *
 * @extends Component<Refs>
 */
class OneMarqueeComponent extends Component {
  requiredRefs = ['wrapper', 'content', 'marqueeItems'];

  /** @type {ResizeObserver | null} */
  #resizeObserver = null;
  /** @type {HTMLElement | null} */
  #clone = null;

  connectedCallback() {
    super.connectedCallback();

    const { marqueeItems } = this.refs;
    if (marqueeItems.length === 0) return;

    this.#calculateAndAnimate();
    this.#setupResizeObserver();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
      this.#resizeObserver = null;
    }
  }

  #setupResizeObserver() {
    this.#resizeObserver = new ResizeObserver(() => {
      this.#calculateAndAnimate();
    });

    this.#resizeObserver.observe(this);
    this.#resizeObserver.observe(this.refs.content);
  }

  #calculateAndAnimate() {
    const { wrapper, content } = this.refs;

    const contentWidth = content.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(wrapper).gap) || 0;

    if (!contentWidth) return;

    // Create or update clone
    if (!this.#clone) {
      this.#clone = /** @type {HTMLElement} */ (content.cloneNode(true));
      this.#clone.setAttribute('aria-hidden', 'true');
      this.#clone.removeAttribute('ref');
      wrapper.appendChild(this.#clone);
    } else {
      this.#clone.innerHTML = content.innerHTML;
    }

    // Calculate animation values
    const totalWidth = contentWidth + gap;
    const speed = 70; // pixels per second
    const duration = totalWidth / speed;

    // Get direction
    const direction = this.getAttribute('data-movement-direction');
    const isReverse = direction === 'reverse';

    // Set CSS variables for animation
    wrapper.style.setProperty('--ticker-duration', `${duration}s`);
    wrapper.style.setProperty('--ticker-direction', isReverse ? 'reverse' : 'normal');
    wrapper.style.setProperty('--ticker-width', `${totalWidth}px`);
  }
}

if (!customElements.get('one-marquee-component')) {
  customElements.define('one-marquee-component', OneMarqueeComponent);
}
