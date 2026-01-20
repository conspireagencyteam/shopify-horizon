// Custom theme editor logic for Nature's Answer theme

/**
 * @typedef {HTMLElement & { activate: (event: {target: Element}) => void, deactivate: (event: {target: Element}) => void }} HeaderMenuElement
 */

/**
 * Get megamenu context for a given element (desktop only)
 * @param {HTMLElement} element
 * @returns {{ headerMenu: HeaderMenuElement, menuListItem: Element } | null}
 */
function getMegamenuContext(element) {
  const megamenuContainer = element.closest('one-megamenu');
  if (!megamenuContainer) return null;

  const menuListItem = megamenuContainer.closest('.menu-list__list-item');
  if (!menuListItem) return null;

  /** @type {HeaderMenuElement | null} */
  const headerMenu = /** @type {HeaderMenuElement | null} */ (menuListItem.closest('header-menu'));
  if (!headerMenu) return null;

  return { headerMenu, menuListItem };
}

/**
 * Activate megamenu for a given element inside it
 * @param {HTMLElement} element
 */
function activateMegamenuForElement(element) {
  const context = getMegamenuContext(element);
  if (context) {
    context.headerMenu.activate({ target: context.menuListItem });
  }
}

/**
 * Deactivate megamenu for a given element inside it
 * @param {HTMLElement} element
 */
function deactivateMegamenuForElement(element) {
  const context = getMegamenuContext(element);
  if (context) {
    context.headerMenu.deactivate({ target: context.menuListItem });
  }
}

/**
 * Handle megamenu block selection - auto-open the megamenu in design mode
 */
document.addEventListener('shopify:block:select', function (event) {
  if (event.target instanceof HTMLElement) {
    activateMegamenuForElement(event.target);
  }
});

/**
 * Handle megamenu block deselection - close the megamenu in design mode
 */
document.addEventListener('shopify:block:deselect', function (event) {
  if (event.target instanceof HTMLElement) {
    deactivateMegamenuForElement(event.target);
  }
});
