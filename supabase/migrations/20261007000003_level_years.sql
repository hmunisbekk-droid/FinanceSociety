-- Levels are years of study: Level 3 is the foundation year (CIFS), then Levels 4–6
-- are years 2–4 of a degree (correction from the club, 7 Oct 2026).
update public.levels set study_year = 'Foundation (CIFS)', description = 'Foundation year (CIFS): the building blocks of finance, economics and quantitative methods.' where number = 3;
update public.levels set study_year = 'Year 2',             description = 'Second year: core modules in accounting, economics and financial mathematics.' where number = 4;
update public.levels set study_year = 'Year 3',             description = 'Third year: corporate finance, investments and financial reporting in depth.' where number = 5;
update public.levels set study_year = 'Year 4 (final)',     description = 'Final (fourth) year: advanced finance, risk, derivatives and the dissertation.' where number = 6;
