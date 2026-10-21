-- Indici per le letture di "Peso e misure" dell'app cliente.
-- Entrambe le tabelle avevano solo l'indice di chiave primaria:
-- ogni lettura per cliente faceva una scansione sequenziale completa.
-- Le letture filtrano per client_id e ordinano per data decrescente.

create index if not exists idx_weight_logs_client_date
  on public.weight_logs (client_id, log_date desc);

create index if not exists idx_measurements_client_date
  on public.measurements (client_id, measurement_date desc);
