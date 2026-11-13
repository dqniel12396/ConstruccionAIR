-- Opcional. Aplicar antes de la primera ingesta en servicios con TimescaleDB.
BEGIN;
SET LOCAL search_path TO public;
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('public.mediciones_telemetria', 'timestamp_utc',
    chunk_time_interval => INTERVAL '7 days', if_not_exists => TRUE);
COMMIT;
