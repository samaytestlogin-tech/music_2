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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function fixRLS() {
    console.log("Applying RLS fix for Evaluators...");

    // We can execute raw SQL using the Supabase REST API via a little known trick 
    // or by just calling an RPC if one exists, but usually we can't run DDL from pgrest.
    // However, if we can't run DDL, we can at least write an instruction or see if we can bypass it cleanly.

    // Wait, the previous SQL fix was:
    // CREATE POLICY "results_evaluator_insert" ON public.results FOR INSERT WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'evaluator');
    console.log("Since Supabase REST API doesn't allow raw DDL execution directly, please ask the user to run this SQL in their Supabase SQL Editor:");
    console.log(`
    CREATE POLICY "results_evaluator_insert" ON public.results FOR INSERT WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'evaluator'
    );
    `);
}

fixRLS();
