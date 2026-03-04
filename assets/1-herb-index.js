class HerbIndex extends HTMLElement {
  connectedCallback() {
    this.searchInputs = this.querySelectorAll('[data-herb-search]');
    this.alphaButtons = this.querySelectorAll('[data-alpha-btn]');
    this.letterSections = this.querySelectorAll('[data-letter-section]');
    this.emptyState = this.querySelector('[data-empty-state]');
    this.setupSearch();
    this.setupAlphaNavigation();
    this.observeMobileNavHeight();
    this.setupMobileScrollSpy();
  }

  /* ── Mobile Nav Height Observer ── */
  observeMobileNavHeight() {
    const mobileNav = this.querySelector('.herb-index__mobile-nav');
    if (!mobileNav) return;

    const update = () => {
      this.style.setProperty('--hi-mobile-nav-h', `${mobileNav.offsetHeight}px`);
    };

    update();
    this._mobileNavRO = new ResizeObserver(update);
    this._mobileNavRO.observe(mobileNav);
  }

  disconnectedCallback() {
    if (this._mobileNavRO) this._mobileNavRO.disconnect();
    if (this._scrollSpyIO) this._scrollSpyIO.disconnect();
  }

  /* ── Mobile Scroll Spy ── */
  setupMobileScrollSpy() {
    const strip = this.querySelector('[data-mobile-alpha]');
    if (!strip) return;

    let currentLetter = '';

    this._scrollSpyPaused = false;

    this._scrollSpyIO = new IntersectionObserver(
      (entries) => {
        if (this._scrollSpyPaused) return;

        entries.forEach((e) => {
          e.target._hiVisible = e.isIntersecting;
        });

        let topSection = null;
        let topOffset = Infinity;

        this.letterSections.forEach((sec) => {
          if (sec._hiVisible) {
            const top = sec.getBoundingClientRect().top;
            const offset = Math.abs(top - 80);
            if (top < 300 && offset < topOffset) {
              topOffset = offset;
              topSection = sec;
            }
          }
        });

        if (!topSection) {
          this.letterSections.forEach((sec) => {
            if (!topSection && sec._hiVisible) topSection = sec;
          });
        }

        if (topSection) {
          const letter = topSection.dataset.letterSection;
          if (letter !== currentLetter) {
            currentLetter = letter;
            const btn = strip.querySelector(`[data-alpha-btn="${letter}"]`);
            if (btn) {
              const stripRect = strip.getBoundingClientRect();
              const btnRect = btn.getBoundingClientRect();
              const edgeThreshold = 40;
              const isNearEdge = btnRect.left < stripRect.left + edgeThreshold
                || btnRect.right > stripRect.right - edgeThreshold;

              if (isNearEdge) {
                btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
              }
            }
          }
        }
      },
      { rootMargin: '-80px 0px 0px 0px', threshold: [0, 0.1, 0.25, 0.5] }
    );

    this.letterSections.forEach((sec) => {
      sec._hiVisible = false;
      this._scrollSpyIO.observe(sec);
    });
  }

  /* ── Search ── */
  setupSearch() {
    let timer;
    this.searchInputs.forEach((input) => {
      input.addEventListener('input', (e) => {
        const value = e.target.value;
        this.searchInputs.forEach((other) => {
          if (other !== e.target) other.value = value;
        });
        clearTimeout(timer);
        timer = setTimeout(() => this.filterHerbs(value), 120);
      });
    });
  }

  filterHerbs(query) {
    const q = query.toLowerCase().trim();
    let anyVisible = false;

    this.letterSections.forEach((section) => {
      const cards = section.querySelectorAll('[data-herb-card]');
      let sectionVisible = false;

      cards.forEach((card) => {
        const match = !q || card.dataset.herbName.includes(q);
        const wrapper = card.closest('.resource-list__item') || card;
        wrapper.style.display = match ? '' : 'none';
        if (match) sectionVisible = true;
      });

      section.style.display = sectionVisible ? '' : 'none';
      if (sectionVisible) anyVisible = true;
    });

    if (this.emptyState) {
      this.emptyState.style.display = !anyVisible && q ? '' : 'none';
    }

    const layout = this.querySelector('.herb-index__layout');
    if (layout) {
      layout.scrollIntoView({ behavior: 'smooth' });
    }
  }

  _resumeSpyOnScrollEnd() {
    let timer;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        window.removeEventListener('scroll', onScroll);
        this._scrollSpyPaused = false;
      }, 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── Alpha Navigation ── */
  setupAlphaNavigation() {
    this.alphaButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const letter = btn.dataset.alphaBtn;
        const target = this.querySelector(`#herb-letter-${letter}`);
        if (target) {
          this._scrollSpyPaused = true;
          target.scrollIntoView({ behavior: 'smooth' });
          this._resumeSpyOnScrollEnd();
        }
        const strip = btn.closest('[data-mobile-alpha]');
        if (strip) {
          btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      });
    });
  }

}

customElements.define('herb-index', HerbIndex);
