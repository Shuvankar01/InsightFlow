
-- 1. Normalize categories to lowercase
UPDATE public.analytics SET category = lower(category) WHERE category IS NOT NULL AND category <> lower(category);

-- 2. Cap extreme spikes per metric to the 95th percentile (keeps shape, removes outliers)
WITH caps AS (
  SELECT metric, percentile_cont(0.95) WITHIN GROUP (ORDER BY value) AS cap
  FROM public.analytics
  GROUP BY metric
)
UPDATE public.analytics a
SET value = caps.cap
FROM caps
WHERE a.metric = caps.metric AND a.value > caps.cap;
