import { Component } from '@theme/component';
import { GSAPLoader } from '@theme/1-gsap-loader';

/**
 * Parallax group component using GSAP
 * @ts-nocheck - GSAP is loaded dynamically
 */
export class ParallaxGroup extends Component {
  /** @type {any} */
  #scrollTrigger = null;

  connectedCallback() {
    super.connectedCallback();
    
    // Only initialize if parallax is enabled
    if (this.dataset.parallax === 'true') {
      this.#init();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#cleanup();
  }

  /**
   * Initialize parallax effect
   * @private
   */
  async #init() {
    // Skip on mobile if desktop-only
    if (this.classList.contains('parallax-desktop-only') && window.innerWidth <= 749) {
      return;
    }

    // Load GSAP using shared loader
    try {
      await GSAPLoader.loadAll();
      this.#setupParallax();
    } catch (error) {
      console.warn('Failed to load GSAP for parallax:', error);
    }
  }


  /**
   * Setup GSAP parallax animation
   * @private
   */
  #setupParallax() {
    const { gsap, ScrollTrigger } = GSAPLoader;
    if (!gsap || !ScrollTrigger) return;

    const speed = this.dataset.parallaxSpeed || 'medium';
    const direction = this.dataset.parallaxDirection || 'vertical';
    
    // Get speed value from CSS custom property
    const speedValue = parseInt(getComputedStyle(this).getPropertyValue('--parallax-speed')) || 30;
    
    // Create animation properties based on direction
    const animationProps = this.#getAnimationProps(direction, speedValue);
    const fromProps = this.#getFromProps(direction, speedValue);

    // Create GSAP animation with ScrollTrigger
    this.#scrollTrigger = gsap.fromTo(this, fromProps, {
      ...animationProps,
      ease: 'none',
      scrollTrigger: {
        trigger: this,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        invalidateOnRefresh: true,
        onRefresh: () => {
          // Re-check mobile on refresh
          const isMobile = window.innerWidth <= 749;
          if (this.classList.contains('parallax-desktop-only') && isMobile) {
            this.#scrollTrigger?.disable?.();
          }
        }
      }
    });
  }

  /**
   * Get animation properties based on direction
   * @private
   * @param {string} direction
   * @param {number} speedValue
   * @returns {object}
   */
  #getAnimationProps(direction, speedValue) {
    switch(direction) {
      case 'vertical':
        return { y: `${speedValue}%` };
      case 'horizontal':
        return { x: `${speedValue}%` };
      case 'both':
        return { y: `${speedValue}%`, x: `${speedValue * 0.5}%` };
      default:
        return { y: `${speedValue}%` };
    }
  }

  /**
   * Get from properties based on direction
   * @private
   * @param {string} direction
   * @param {number} speedValue
   * @returns {object}
   */
  #getFromProps(direction, speedValue) {
    switch(direction) {
      case 'vertical':
        return { y: `-${speedValue}%` };
      case 'horizontal':
        return { x: `-${speedValue * 0.5}%` };
      case 'both':
        return { y: `-${speedValue}%`, x: `-${speedValue * 0.5}%` };
      default:
        return { y: `-${speedValue}%` };
    }
  }

  /**
   * Clean up GSAP animations
   * @private
   */
  #cleanup() {
    if (this.#scrollTrigger) {
      this.#scrollTrigger.kill();
      this.#scrollTrigger = null;
    }
  }

  /**
   * Refresh parallax animation
   */
  refresh() {
    if (GSAPLoader.isScrollTriggerLoaded) {
      GSAPLoader.ScrollTrigger.refresh();
    }
  }
}

// Auto-register the component
customElements.define('parallax-group', ParallaxGroup);