import { createPlaceholder } from './placeholder.js';
export const createLibraryPage = () => createPlaceholder({
  id: 'library', title: 'Song Library', stage: 'Planned for Stage D',
  description: 'Your personal practice collection, in one place.',
  future: 'Saved Guitar Pro files and collections are planned for Stage D. For now, open a file directly in the Tab Player; it stays available while you move between pages in this tab.'
});
