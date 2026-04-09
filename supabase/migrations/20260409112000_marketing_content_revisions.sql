-- Add lightweight revision history for marketing CMS blocks.

ALTER TABLE public.marketing_content_blocks
ADD COLUMN IF NOT EXISTS revisions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill existing rows with one initial revision if history is empty.
UPDATE public.marketing_content_blocks
SET revisions = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'created_at', now(),
    'actor_id', updated_by,
    'action', 'publish',
    'snapshot', COALESCE(published, draft, '{}'::jsonb)
  )
)
WHERE jsonb_typeof(revisions) = 'array'
  AND jsonb_array_length(revisions) = 0;
