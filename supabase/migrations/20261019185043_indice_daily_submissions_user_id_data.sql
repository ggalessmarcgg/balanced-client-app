-- 2026-10-19 · Indice su daily_submissions(user_id, submission_date DESC): le policy RLS del cliente
-- confrontano user_id con auth.uid() e la web app filtra sempre per user_id; senza indice il planner
-- ripiegava su (status, submission_date) leggendo le righe del mese di tutti i clienti (22–35 ms a query).
-- Applicata in produzione dalla chat di progetto (versione 20261019185043,
-- nome "indice_daily_submissions_user_id_data"); questo file ne conserva il testo identico.
CREATE INDEX IF NOT EXISTS daily_submissions_user_id_date_idx
  ON public.daily_submissions (user_id, submission_date DESC);
