import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables manually if dotenv isn't installed
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2].trim();
        // remove quotes if any
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
        }
      process.env[match[1].trim()] = val;
    }
  });
}

async function testResend() {
  const apiKey = process.env.VITE_RESENDAPIKEY;
  if (!apiKey) return { api: 'Resend', status: 'Failed', error: 'No API key found in .env' };

  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (res.ok) {
        return { api: 'Resend', status: 'Working' };
    } else {
        const data = await res.json();
        return { api: 'Resend', status: 'Failed', error: JSON.stringify(data) };
    }
  } catch (err) {
    return { api: 'Resend', status: 'Failed', error: err.message };
  }
}

async function testSupabase() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  console.log("Supabase URL in process.env:", url);
  console.log("Supabase Key in process.env:", key);

  if (!url || !key) return { api: 'Supabase', status: 'Failed', error: 'Missing URL or Key in .env' };

  try {
    // A simple request to the Supabase REST API root
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    if (res.ok) {
        return { api: 'Supabase', status: 'Working' };
    } else {
        const data = await res.json();
        return { api: 'Supabase', status: 'Failed', error: res.statusText + ' ' + JSON.stringify(data) };
    }
  } catch (err) {
    return { api: 'Supabase', status: 'Failed', error: err.message };
  }
}

async function runTests() {
  console.log('Testing APIs...');
  const resendResult = await testResend();
  console.log(`Resend API: ${resendResult.status}`, resendResult.error ? `- ${resendResult.error}` : '');

  const supabaseResult = await testSupabase();
  console.log(`Supabase API: ${supabaseResult.status}`, supabaseResult.error ? `- ${supabaseResult.error}` : '');
}

runTests();
