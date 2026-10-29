import { routes, startRouter } from './router.js';
import { createTuningPage } from '../ui/pages/TuningPage.js';
import { createLibraryPage } from '../ui/pages/LibraryPage.js';
import { createPlayerPage } from '../ui/pages/PlayerPage.js';

import { createDrumAssistantPage } from '../ui/pages/DrumAssistantPage.js';

export class App {
  constructor(host) { this.host = host; this.pages = new Map(); }
  start() {
    if (this.stopRouter) return;
    this.stopRouter = startRouter((route, initial) => this.navigate(route, initial));
  }
  page(route) {
    if (!this.pages.has(route)) {
      const page = { tuning: createTuningPage, library: createLibraryPage, player: createPlayerPage, 'drum-assistant': createDrumAssistantPage }[route]({
        openSong: async file => {
          const player = this.page('player');
          const loading = player.loadFile(file);
          location.hash = '#/player'; this.navigate('player', false);
          await loading;
        },
        openTuning: async tuning => {
          await this.page('tuning').openSourceTuning(tuning);
          location.hash = '#/tuning'; this.navigate('tuning', false);
        }
      });
      this.pages.set(route, page); this.host.append(page.element);
    }
    return this.pages.get(route);
  }
  navigate(route, initial) {
    if (this.current === route) return;
    this.pages.get(this.current)?.hide();
    const page = this.page(route);
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
