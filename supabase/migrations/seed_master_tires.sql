-- Seed data for master_tires
-- Run this in the Supabase SQL Editor to populate the catalog

INSERT INTO public.master_tires (brand, model, size, load_index, speed_rating)
VALUES
  -- Michelin Pilot Sport 5
  ('Michelin', 'Pilot Sport 5', '205/55R16', '91', 'V'),
  ('Michelin', 'Pilot Sport 5', '215/55R17', '94', 'V'),
  ('Michelin', 'Pilot Sport 5', '225/45R17', '91', 'Y'),
  ('Michelin', 'Pilot Sport 5', '235/40R18', '95', 'Y'),
  ('Michelin', 'Pilot Sport 5', '245/40R18', '97', 'Y'),
  ('Michelin', 'Pilot Sport 5', '225/40R18', '92', 'Y'),

  -- Bridgestone Potenza Adrenalin RE004
  ('Bridgestone', 'Potenza Adrenalin RE004', '195/50R15', '82', 'V'),
  ('Bridgestone', 'Potenza Adrenalin RE004', '195/55R15', '85', 'W'),
  ('Bridgestone', 'Potenza Adrenalin RE004', '205/45R17', '88', 'W'),
  ('Bridgestone', 'Potenza Adrenalin RE004', '215/45R17', '91', 'W'),
  ('Bridgestone', 'Potenza Adrenalin RE004', '225/45R18', '95', 'W'),

  -- Yokohama Advan dB V552
  ('Yokohama', 'Advan dB V552', '215/60R16', '95', 'V'),
  ('Yokohama', 'Advan dB V552', '215/55R17', '94', 'V'),
  ('Yokohama', 'Advan dB V552', '225/55R17', '97', 'W'),
  ('Yokohama', 'Advan dB V552', '235/50R18', '97', 'W'),

  -- Maxxis I-PRO
  ('Maxxis', 'I-PRO', '195/50R15', '82', 'V'),
  ('Maxxis', 'I-PRO', '205/45R17', '88', 'V'),

  -- Otani KC2000
  ('Otani', 'KC2000', '195/55R15', '85', 'V'),
  ('Otani', 'KC2000', '215/45R17', '91', 'Y'),
  ('Otani', 'KC2000', '225/40R18', '92', 'Y'),

  -- Toyo Proxes TR1
  ('Toyo', 'Proxes TR1', '195/50R15', '82', 'V'),
  ('Toyo', 'Proxes TR1', '205/45R17', '88', 'W'),

  -- Kumho Ecsta PS31
  ('Kumho', 'Ecsta PS31', '195/55R15', '85', 'V'),
  ('Kumho', 'Ecsta PS31', '205/55R16', '91', 'V')

ON CONFLICT (brand, model, size) DO NOTHING;
