/**
 * db.mjs - Direct Supabase admin script
 * Usage: node scripts/db.mjs <command>
 * Commands:
 *   seed       - Insert mock data (exams, results, recordings)
 *   schema     - Print all tables, policies, and user profiles
 *   users      - List all users and their roles
 *   reset      - Delete all exams, results, and recordings (keeps users)
 *   set-admin <email> - Promote a user to admin role
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency needed)
const envPath = resolve(__dirname, '../.env');
const env = Object.fromEntries(
    readFileSync(envPath, 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => l.split('=').map(p => p.trim()))
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

// Admin client - bypasses all RLS
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

const [, , command, arg] = process.argv;

async function runCommand() {
    switch (command) {

        case 'users': {
            console.log('\n👤 All Users:\n');
            const { data, error } = await supabase.from('profiles').select('id, name, email, role');
            if (error) return console.error('Error:', error.message);
            console.table(data);
            break;
        }

        case 'schema': {
            console.log('\n📋 Tables & Policies:\n');
            // List profiles
            const { data: profiles } = await supabase.from('profiles').select('id, name, email, role');
            console.log('Profiles:');
            console.table(profiles || []);

            const { data: exams } = await supabase.from('exams').select('id, name, status, student_name, evaluator_name');
            console.log('\nExams:');
            console.table(exams || []);
            break;
        }

        case 'seed': {
            console.log('\n🌱 Seeding mock data...\n');

            const { data: student } = await supabase.from('profiles')
                .select('id, name').eq('role', 'student').limit(1).single();

            const { data: evaluator } = await supabase.from('profiles')
                .select('id, name').eq('role', 'evaluator').limit(1).single();

            if (!student || !evaluator) {
                console.error('❌ Need at least one Student and one Evaluator in profiles first!');
                console.log('Create them via the Admin Dashboard → Users tab.');
                process.exit(1);
            }

            console.log(`Found student: ${student.name}, evaluator: ${evaluator.name}`);

            // Scheduled exam (joinable soon)
            const now = new Date();
            const inFiveMin = new Date(now.getTime() + 5 * 60 * 1000);
            const timeStr = inFiveMin.toTimeString().substring(0, 8);

            const { error: e1 } = await supabase.from('exams').insert({
                name: 'Trial Carnatic Vocal',
                date: now.toISOString().substring(0, 10),
                time: timeStr,
                duration_minutes: 30,
                status: 'scheduled',
                student_id: student.id,
                evaluator_id: evaluator.id,
                student_name: student.name,
                evaluator_name: evaluator.name
            });
            if (e1) console.error('❌ Scheduled exam error:', e1.message);
            else console.log('✅ Scheduled exam created');

            // Completed exam
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
            const { data: completedExam, error: e2 } = await supabase.from('exams').insert({
                name: 'Grade 1 Violin',
                date: yesterday,
                time: '14:00:00',
                duration_minutes: 45,
                status: 'completed',
                student_id: student.id,
                evaluator_id: evaluator.id,
                student_name: student.name,
                evaluator_name: evaluator.name
            }).select().single();
            if (e2) { console.error('❌ Completed exam error:', e2.message); break; }
            console.log('✅ Completed exam created');

            // Results
            const { error: e3 } = await supabase.from('results').insert({
                exam_id: completedExam.id,
                student_id: student.id,
                total_marks: 88,
                criteria: [
                    { name: 'Tone', marks: 29, comments: 'Excellent' },
                    { name: 'Rhythm', marks: 29, comments: 'Precise' },
                    { name: 'Technique', marks: 30, comments: 'Flawless' }
                ]
            });
            if (e3) console.error('❌ Results error:', e3.message);
            else console.log('✅ Results inserted');

            // Recording
            const { error: e4 } = await supabase.from('recordings').insert({
                exam_id: completedExam.id,
                video_url: 'https://res.cloudinary.com/demo/video/upload/dog.mp4'
            });
            if (e4) console.error('❌ Recording error:', e4.message);
            else console.log('✅ Recording inserted');

            console.log('\n🎉 Done! Refresh your app to see the data.');
            break;
        }

        case 'reset': {
            console.log('\n🗑️  Resetting exam data (users kept)...\n');
            await supabase.from('recordings').delete().neq('id', 0);
            await supabase.from('results').delete().neq('id', 0);
            await supabase.from('exams').delete().neq('id', 0);
            console.log('✅ All exams, results, and recordings deleted.');
            break;
        }

        case 'set-admin': {
            if (!arg) { console.error('Usage: node scripts/db.mjs set-admin <email>'); break; }
            const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('email', arg);
            if (error) console.error('❌ Error:', error.message);
            else console.log(`✅ ${arg} is now an admin. They must log out and back in.`);
            break;
        }

        case 'set-inprogress': {
            console.log('\n▶️  Setting all scheduled exams to in-progress...\n');
            const { data, error } = await supabase
                .from('exams')
                .update({ status: 'in-progress' })
                .eq('status', 'scheduled')
                .select('id, name');
            if (error) console.error('❌ Error:', error.message);
            else {
                console.table(data);
                console.log(`✅ ${data.length} exam(s) are now joinable.`);
            }
            break;
        }

        default:
            console.log(`
Usage: node scripts/db.mjs <command>

Commands:
  users           - List all users and their roles
  schema          - Show tables and current data
  seed            - Insert mock exams, results, and recordings
  reset           - Delete all exams/results/recordings (keeps users)
  set-admin <email> - Promote a user to admin
            `);
    }
}

runCommand().catch(console.error);
