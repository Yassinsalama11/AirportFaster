-- Add expression GIN indexes for MVP full-text search surfaces.
CREATE INDEX "airport_translations_search_gin_idx"
ON "airport_translations"
USING GIN (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("description", '')));

CREATE INDEX "service_translations_search_gin_idx"
ON "service_translations"
USING GIN (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("description", '')));
