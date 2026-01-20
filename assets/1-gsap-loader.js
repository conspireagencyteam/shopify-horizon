/**
 * GSAP Loader Utility
 * Provides a centralized way to load GSAP and its plugins
 * @ts-nocheck - GSAP is loaded dynamically
 */

class GSAPLoader {
  /** @type {boolean} */
  static #coreLoaded = false;
  
  /** @type {boolean} */
  static #scrollTriggerLoaded = false;
  
  /** @type {Promise<void>|null} */
  static #loadingPromise = null;

  /**
   * Load GSAP core library
   * @returns {Promise<void>}
   */
  static async loadCore() {
    if (this.#coreLoaded && window.gsap) {
      return Promise.resolve();
    }

    if (this.#loadingPromise) {
      return this.#loadingPromise;
    }

    this.#loadingPromise = new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.gsap) {
        this.#coreLoaded = true;
        resolve();
        return;
      }

      // Check if already loading
      if (window.gsapLoading) {
        window.addEventListener('gsapCoreLoaded', () => {
          this.#coreLoaded = true;
          resolve();
        });
        return;
      }

      window.gsapLoading = true;

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
      script.onerror = () => reject(new Error('Failed to load GSAP core'));
      script.onload = () => {
        this.#coreLoaded = true;
        window.dispatchEvent(new Event('gsapCoreLoaded'));
        resolve();
      };

      document.head.appendChild(script);
    });

    return this.#loadingPromise;
  }

  /**
   * Load GSAP ScrollTrigger plugin
   * @returns {Promise<void>}
   */
  static async loadScrollTrigger() {
    // Load core first if not loaded
    await this.loadCore();

    if (this.#scrollTriggerLoaded && window.ScrollTrigger) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.ScrollTrigger) {
        this.#scrollTriggerLoaded = true;
        window.gsap.registerPlugin(window.ScrollTrigger);
        resolve();
        return;
      }

      // Check if already loading
      if (window.scrollTriggerLoading) {
        window.addEventListener('scrollTriggerLoaded', () => {
          this.#scrollTriggerLoaded = true;
          resolve();
        });
        return;
      }

      window.scrollTriggerLoading = true;

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js';
      script.onerror = () => reject(new Error('Failed to load ScrollTrigger'));
      script.onload = () => {
        window.gsap.registerPlugin(window.ScrollTrigger);
        this.#scrollTriggerLoaded = true;
        window.dispatchEvent(new Event('scrollTriggerLoaded'));
        resolve();
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Load both GSAP core and ScrollTrigger
   * @returns {Promise<void>}
   */
  static async loadAll() {
    await this.loadCore();
    await this.loadScrollTrigger();
  }

  /**
   * Check if GSAP core is loaded
   * @returns {boolean}
   */
  static get isCoreLoaded() {
    return this.#coreLoaded && !!window.gsap;
  }

  /**
   * Check if ScrollTrigger is loaded
   * @returns {boolean}
   */
  static get isScrollTriggerLoaded() {
    return this.#scrollTriggerLoaded && !!window.ScrollTrigger;
  }

  /**
   * Get GSAP instance (assumes it's loaded)
   * @returns {any}
   */
  static get gsap() {
    return window.gsap;
  }

  /**
   * Get ScrollTrigger instance (assumes it's loaded)
   * @returns {any}
   */
  static get ScrollTrigger() {
    return window.ScrollTrigger;
  }
}

export { GSAPLoader };