/**
 * Three Simple Steps — GSAP ScrollTrigger pinning (desktop) + carousel (mobile)
 */
(function () {
  const MOBILE_BREAKPOINT = 750;

  class SimpleSteps extends HTMLElement {
    connectedCallback() {
      this.steps = Array.from(this.querySelectorAll('[data-step-slide]'));
      this.dots = Array.from(this.querySelectorAll('[data-step-dot]'));
      this.carousel = this.querySelector('[data-steps-carousel]');
      this.pinTarget = this.querySelector('[data-steps-pin-target]');

      if (this.steps.length === 0) return;

      this.handleResize = this.handleResize.bind(this);
      this.init();
      window.addEventListener('resize', this.handleResize);
    }

    disconnectedCallback() {
      window.removeEventListener('resize', this.handleResize);
      this.destroyDesktop();
    }

    handleResize() {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.init(), 200);
    }

    init() {
      if (window.innerWidth >= MOBILE_BREAKPOINT) {
        this.destroyMobile();
        this.initDesktop();
      } else {
        this.destroyDesktop();
        this.initMobile();
      }
    }

    // ── Desktop: GSAP ScrollTrigger pinning ──────────────────────────────
    initDesktop() {
      if (this._desktopInit) return;
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

      gsap.registerPlugin(ScrollTrigger);
      this._desktopInit = true;

      const stepCount = this.steps.length;
      // Show first step, hide rest
      this.steps.forEach((step, i) => {
        gsap.set(step, {
          opacity: i === 0 ? 1 : 0,
          y: i === 0 ? 0 : 20,
          position: i === 0 ? 'relative' : 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          pointerEvents: i === 0 ? 'auto' : 'none',
        });
      });

      this.setActiveDot(0);

      // Create the pin + scroll timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: this,
          start: 'top top+=80',
          end: () => `+=${(stepCount - 1) * window.innerHeight}`,
          pin: this.pinTarget,
          scrub: 0.5,
          anticipatePin: 1,
        },
      });

      // For each step transition, fade out current + fade in next
      for (let i = 0; i < stepCount - 1; i++) {
        tl.to(
          this.steps[i],
          {
            opacity: 0,
            y: -20,
            duration: 0.4,
            pointerEvents: 'none',
            onStart: () => this.setActiveDot(i + 1),
          },
          i
        );
        tl.fromTo(
          this.steps[i + 1],
          { opacity: 0, y: 20, pointerEvents: 'none' },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            pointerEvents: 'auto',
          },
          i + 0.1
        );
      }

      this._scrollTrigger = tl.scrollTrigger;
      this._timeline = tl;
    }

    destroyDesktop() {
      if (!this._desktopInit) return;
      this._timeline?.kill();
      this._scrollTrigger?.kill();
      this._desktopInit = false;
      // Reset inline styles
      this.steps.forEach((step) => {
        step.removeAttribute('style');
      });
    }

    // ── Mobile: scroll-snap carousel ─────────────────────────────────────
    initMobile() {
      if (this._mobileInit) return;
      this._mobileInit = true;

      this.setActiveDot(0);

      if (this.carousel) {
        this._scrollHandler = () => {
          const scrollLeft = this.carousel.scrollLeft;
          const slideWidth = this.carousel.offsetWidth;
          const index = Math.round(scrollLeft / slideWidth);
          this.setActiveDot(index);
        };
        this.carousel.addEventListener('scroll', this._scrollHandler, { passive: true });
      }
    }

    destroyMobile() {
      if (!this._mobileInit) return;
      this._mobileInit = false;
      if (this.carousel && this._scrollHandler) {
        this.carousel.removeEventListener('scroll', this._scrollHandler);
      }
    }

    setActiveDot(index) {
      this.dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === index);
      });
    }
  }

  customElements.define('one-client-simple-steps', SimpleSteps);
})();
