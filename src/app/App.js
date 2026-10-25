import { routes, startRouter } from './router.js';
import { createTuningPage } from '../ui/pages/TuningPage.js';
import { createLibraryPage } from '../ui/pages/LibraryPage.js';
import { createPlayerPage } from '../ui/pages/PlayerPage.js';

export class App {
  constructor(host) { this.host = host; this.pages = new Map(); }
  start() {
    if (this.stopRouter) return;
    this.stopRouter = startRouter((route, initial) => this.navigate(route, initial));
  }
  navigate(route, initial) {
    if (this.current === route) return;
    this.pages.get(this.current)?.hide();
    if (!this.pages.has(route)) {
      const page = { tuning: createTuningPage, library: createLibraryPage, player: createPlayerPage }[route]();
      this.pages.set(route, page);
      this.host.append(page.element);
    }
    const page = this.pages.get(route);
    this.current = route;
    page.show();
    for (const link of document.querySelectorAll('[data-route]')) {
      if (link.dataset.route === route) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    document.title = `${routes[route]} — Guitar Tools`;
    if (!initial) page.element.querySelector('h1').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}
