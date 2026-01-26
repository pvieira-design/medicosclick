const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.CLICK_REPLICA_DATABASE_URL,
  max: 1,
});

async function testAnamnese() {
  const client = await pool.connect();
  try {
    // Get one anamnese record with data
    const result = await client.query(
      `SELECT a.consulting_id, a.data FROM anamnese WHERE a.data IS NOT NULL LIMIT 1`
    );
    
    if (result.rows.length > 0) {
      console.log('Anamnese Data Structure:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('No anamnese records with data found');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

testAnamnese().catch(console.error);
