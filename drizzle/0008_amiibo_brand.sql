-- The Funko Pop! section of the stock export also lists Nintendo amiibo
-- figures; 0006 branded them Funko. They are Nintendo products.
UPDATE products SET brand_id = 'brand-nintendo', updated_at = unixepoch() WHERE slug IN ('amiibo-super-mario-bros-wonder-captain-toad-talking', 'amiibo-super-mario-bros-wonder-poplin-prince', 'amiibo-super-mario-bros-wonder-elephant-mario', 'amiibo-splatoon-triple-pack-shiver-frye-big') AND EXISTS (SELECT 1 FROM brands WHERE id = 'brand-nintendo');
