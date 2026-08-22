-- 0022_localize_theme_names.sql
-- Vietnamese-localization pass (DESIGN.md "Language" note, apps/web CLAUDE.md):
-- the default theme was already renamed to "Aizome Vermillion" in 0021; this
-- migration finishes the Settings theme picker by giving the other 3 preset
-- themes Vietnamese display names too, so the picker doesn't read as
-- half-translated. Only `name` changes — `slug` stays stable since nothing
-- else in the app keys off the old English name, only the slug (unchanged).
update public.themes set name = 'Chàm Dâu' where slug = 'indigo-berry';
update public.themes set name = 'Rừng Đất Nung' where slug = 'forest-clay';
update public.themes set name = 'Xám Hồng' where slug = 'slate-rose';
