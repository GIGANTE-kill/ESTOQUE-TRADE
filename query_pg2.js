const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://acaotrade:acaotrade123@localhost:15432/acaotrade' });

async function main() {
  try {
    const res = await pool.query(`
      SELECT 
        m.name as produto, 
        m.sku, 
        c.name as categoria, 
        m.quantity as quantidade, 
        m.status, 
        m.fornecedor, 
        m."nomeAcao" as acao 
      FROM materials m 
      LEFT JOIN categories c ON c.id = m."categoryId"
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error('ERRO:', e.message);
  } finally {
    pool.end();
  }
}

main();
