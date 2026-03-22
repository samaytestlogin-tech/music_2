import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, '../.env');
const env = Object.fromEntries(
    readFileSync(envPath, 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => l.split('=').map(p => p.trim()))
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testInsert() {
    console.log("Testing insert...");
    const { data, error } = await supabase
        .from('results')
        .insert([{
            exam_id: 7,
            student_id: 'c1430c9f-0df3-4e62-848e-0e2028987ffd',
            criteria: [{ "name": "Test", "marks": 10, "comments": "" }],
            total_marks: 10
        }]);

    if (error) {
        console.error("Insert failed:", error);
    } else {
        console.log("Insert succeeded.");
    }
}

testInsert();
