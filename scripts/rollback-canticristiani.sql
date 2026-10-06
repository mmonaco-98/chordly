DELETE FROM songs WHERE tags::jsonb ? 'canticristiani';
DELETE FROM transpositions WHERE song_id NOT IN (SELECT id FROM songs);
UPDATE playlists SET song_ids = (
  SELECT COALESCE(jsonb_agg(v), '[]'::jsonb)::text
  FROM jsonb_array_elements(song_ids::jsonb) v
  WHERE (v #>> '{}') IN (SELECT id FROM songs)
);
