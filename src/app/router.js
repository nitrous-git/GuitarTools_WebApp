export const routes = Object.freeze({ tuning: 'Tuning Library', library: 'Song Library', player: 'Tab Player', 'drum-assistant': 'Drum Tune Assistant' });

export function resolveRoute(hash, testMode = false) {
  if (!hash) return testMode ? 'player' : 'tuning';
  const route = hash.slice(2);
  return hash.startsWith('#/') && Object.hasOwn(routes, route) ? route : 'tuning';
}

export function startRouter(onRoute) {
  let current;
  const update = () => {
    if (location.hash === '#workspace' && current) {
      history.replaceState(null, '', `#/${current}`);
      document.getElementById('workspace').focus();
      return;
    }
    const route = resolveRoute(location.hash, new URLSearchParams(location.search).has('test'));
    if (location.hash !== `#/${route}`) history.replaceState(null, '', `#/${route}`);
    if (route === current) return;
    const initial = current === undefined;
    current = route;
    onRoute(route, initial);
  };
  window.addEventListener('hashchange', update);
  update();
  return () => window.removeEventListener('hashchange', update);
}
