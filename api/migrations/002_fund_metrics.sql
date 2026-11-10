-- Pre-computed per-fund metrics (refreshed after every NAV import / publish and nightly)
CREATE TABLE fund_metrics (
  fund_id     text PRIMARY KEY REFERENCES funds(fund_id) ON DELETE CASCADE,
  nav         numeric(14,4),
  nav_date    date,
  r1 numeric(8,2), r3 numeric(8,2), r5 numeric(8,2), r10 numeric(8,2),
  vol3        numeric(8,2),
  sharpe3     numeric(8,2),
  since_2021  numeric(10,4),
  spark       jsonb NOT NULL DEFAULT '[]',
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nav_date_idx ON nav_history (nav_date);
