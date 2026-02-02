-- Tilføj title kolonne til bulletin_posts
ALTER TABLE bulletin_posts 
ADD COLUMN title TEXT NOT NULL DEFAULT '';

-- Opdater eksisterende posts med overskrift baseret på beskedens første linje
UPDATE bulletin_posts 
SET title = CASE 
  WHEN position(chr(10) in message) > 0 
  THEN left(message, position(chr(10) in message) - 1)
  ELSE left(message, 50)
END
WHERE title = '';