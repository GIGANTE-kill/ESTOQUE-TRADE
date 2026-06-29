const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://acaotrade:acaotrade123@localhost:15432/acaotrade'
});

async function main() {
  try {
    // Lista todas as tabelas e contagem de registros
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('=== TABELAS E CONTAGENS ===');
    for (const t of tables.rows) {
      const count = await pool.query(`SELECT COUNT(*) FROM "${t.tablename}"`);
      console.log(`${t.tablename}: ${count.rows[0].count} registros`);
    }

    // Verifica a tabela materials mais a fundo
    const mats = await pool.query(`SELECT * FROM materials LIMIT 20`);
    console.log('\n=== MATERIAIS (raw) ===');
    console.log(JSON.stringify(mats.rows, null, 2));

    // Verifica users cadastrados
    const users = await pool.query(`SELECT id, name, email, role FROM users`);
    console.log('\n=== USUARIOS ===');
    console.log(JSON.stringify(users.rows, null, 2));

  } catch (e) {
    console.error('ERRO:', e.message);
  } finally {
    await pool.end();
  }
}

main();
