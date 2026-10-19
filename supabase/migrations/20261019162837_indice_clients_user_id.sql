-- 2026-10-19 · Indice su clients(user_id): la lettura dello stato all'avvio dell'app e le policy RLS
-- che confrontano user_id con auth.uid() facevano una scansione completa della tabella.
-- Applicata in produzione dalla chat di progetto (versione 20261019162837, nome "indice_clients_user_id");
-- questo file ne conserva il testo identico.
CREATE INDEX IF NOT EXISTS clients_user_id_idx ON public.clients (user_id);
