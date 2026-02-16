import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error("Missing VITE_SUPABASE_URL environment variable.");
  process.exit(1);
}
if (!supabaseServiceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable. This script requires the service role key to bypass RLS.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const popularTires = [
  // Michelin Pilot Sport 5
  { brand: 'Michelin', model: 'Pilot Sport 5', size: '205/55R16', load_index: '91', speed_rating: 'V' },
  { brand: 'Michelin', model: 'Pilot Sport 5', size: '215/55R17', load_index: '94', speed_rating: 'V' },
  { brand: 'Michelin', model: 'Pilot Sport 5', size: '225/45R17', load_index: '91', speed_rating: 'Y' },
  { brand: 'Michelin', model: 'Pilot Sport 5', size: '235/40R18', load_index: '95', speed_rating: 'Y' },
  { brand: 'Michelin', model: 'Pilot Sport 5', size: '245/40R18', load_index: '97', speed_rating: 'Y' },
  { brand: 'Michelin', model: 'Pilot Sport 5', size: '225/40R18', load_index: '92', speed_rating: 'Y' },

  // Bridgestone Potenza Adrenalin RE004
  { brand: 'Bridgestone', model: 'Potenza Adrenalin RE004', size: '195/50R15', load_index: '82', speed_rating: 'V' },
  { brand: 'Bridgestone', model: 'Potenza Adrenalin RE004', size: '195/55R15', load_index: '85', speed_rating: 'W' },
  { brand: 'Bridgestone', model: 'Potenza Adrenalin RE004', size: '205/45R17', load_index: '88', speed_rating: 'W' },
  { brand: 'Bridgestone', model: 'Potenza Adrenalin RE004', size: '215/45R17', load_index: '91', speed_rating: 'W' },
  { brand: 'Bridgestone', model: 'Potenza Adrenalin RE004', size: '225/45R18', load_index: '95', speed_rating: 'W' },

  // Yokohama Advan dB V552
  { brand: 'Yokohama', model: 'Advan dB V552', size: '215/60R16', load_index: '95', speed_rating: 'V' },
  { brand: 'Yokohama', model: 'Advan dB V552', size: '215/55R17', load_index: '94', speed_rating: 'V' },
  { brand: 'Yokohama', model: 'Advan dB V552', size: '225/55R17', load_index: '97', speed_rating: 'W' },
  { brand: 'Yokohama', model: 'Advan dB V552', size: '235/50R18', load_index: '97', speed_rating: 'W' },

  // Maxxis I-PRO
  { brand: 'Maxxis', model: 'I-PRO', size: '195/50R15', load_index: '82', speed_rating: 'V' },
  { brand: 'Maxxis', model: 'I-PRO', size: '205/45R17', load_index: '88', speed_rating: 'V' },

  // Otani KC2000
  { brand: 'Otani', model: 'KC2000', size: '195/55R15', load_index: '85', speed_rating: 'V' },
  { brand: 'Otani', model: 'KC2000', size: '215/45R17', load_index: '91', speed_rating: 'Y' },
  { brand: 'Otani', model: 'KC2000', size: '225/40R18', load_index: '92', speed_rating: 'Y' },

  // Toyo Proxes TR1
  { brand: 'Toyo', model: 'Proxes TR1', size: '195/50R15', load_index: '82', speed_rating: 'V' },
  { brand: 'Toyo', model: 'Proxes TR1', size: '205/45R17', load_index: '88', speed_rating: 'W' },

  // Kumho Ecsta PS31
  { brand: 'Kumho', model: 'Ecsta PS31', size: '195/55R15', load_index: '85', speed_rating: 'V' },
  { brand: 'Kumho', model: 'Ecsta PS31', size: '205/55R16', load_index: '91', speed_rating: 'V' }
];

async function seedMasterTires() {
  console.log(`Starting seed for ${popularTires.length} tires...`);

  let successCount = 0;
  let skipCount = 0;

  for (const tire of popularTires) {
    try {
      const { data, error } = await supabase
        .from('master_tires')
        .upsert(tire, { onConflict: 'brand,model,size', ignoreDuplicates: true })
        .select('id')
        .single();

      if (error) {
        // ignoreDuplicates returns no rows when skipped — not a real error
        if (error.code === 'PGRST116') {
          console.log(`Skipping existing: ${tire.brand} ${tire.model} ${tire.size}`);
          skipCount++;
        } else {
          console.error(`Error inserting ${tire.brand} ${tire.model}:`, error.message);
        }
      } else {
        successCount++;
      }
    } catch (err) {
      console.error(`Unexpected error for ${tire.brand}:`, err);
    }
  }

  console.log('-----------------------------------');
  console.log(`Seeding Finish!`);
  console.log(`Inserted: ${successCount}`);
  console.log(`Skipped: ${skipCount}`); //
}

seedMasterTires();
