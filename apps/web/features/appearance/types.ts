/** Row shape for `public.themes` (data-model.md "themes"). */
export type Theme = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  primary_light: string;
  primary_foreground_light: string;
  secondary_light: string;
  secondary_foreground_light: string;
  accent_light: string;
  accent_foreground_light: string;
  primary_dark: string;
  primary_foreground_dark: string;
  secondary_dark: string;
  secondary_foreground_dark: string;
  accent_dark: string;
  accent_foreground_dark: string;
  created_at?: string;
  updated_at?: string;
};

export type AppearanceMode = 'light' | 'dark';
