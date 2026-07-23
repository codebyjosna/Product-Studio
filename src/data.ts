export interface SuggestionChip {
  id: string;
  label: string;
  prompt: string;
  description: string;
}

export interface MediaSelection {
  id: string;
  source: 'suggestion' | 'upload';
  images: string[]; // asset URLs or data URLs
  description: string;
}

export { getMaxProductImages as loadMaxProductImages } from './lib/catalog';
