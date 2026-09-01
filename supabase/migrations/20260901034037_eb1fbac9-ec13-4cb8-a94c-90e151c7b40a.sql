ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS coordinator_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS office_location text;

UPDATE public.units
SET
  coordinator_name = COALESCE(coordinator_name, 'Unit Coordinator, ' || name),
  contact_phone = COALESCE(contact_phone, '+234 800 000 0000'),
  contact_email = COALESCE(contact_email, slug || '@dstveb-umutu.example.ng'),
  office_location = COALESCE(office_location, 'Delta State Vocational Center, Umutu — Workshop Block');