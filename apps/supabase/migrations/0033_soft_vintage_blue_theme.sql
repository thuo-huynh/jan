-- Keep existing appearance preferences valid while changing the default row
-- to the focused Habit + Learning companion palette.
update public.themes
set
  slug = 'soft-vintage-blue',
  name = 'Xanh Cổ Điển Dịu',
  primary_light = '#6f8faf',
  primary_foreground_light = '#1f303d',
  secondary_light = '#a8bed1',
  secondary_foreground_light = '#263944',
  accent_light = '#c2a36b',
  accent_foreground_light = '#3d3421',
  primary_dark = '#9db7cf',
  primary_foreground_dark = '#17232c',
  secondary_dark = '#65849b',
  secondary_foreground_dark = '#edf3f6',
  accent_dark = '#d2b77f',
  accent_foreground_dark = '#302817',
  updated_at = now()
where slug = 'aizome-vermillion';
