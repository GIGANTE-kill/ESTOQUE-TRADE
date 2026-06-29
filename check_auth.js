const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({ connectionString: 'postgresql://acaotrade:acaotrade123@localhost:15432/acaotrade' });

async function main() {
  // Checa o usuário admin
  const res = await pool.query(
    'SELECT id, name, email, role, "passwordHash", "passwordSalt" FROM users WHERE email = $1',
    ['admin@admin.com']
  );

  if (res.rows.length === 0) {
    console.log('USUARIO NAO ENCONTRADO');
    await pool.end();
    return;
  }

  const u = res.rows[0];
  console.log('Usuario:', u.name, '|', u.email, '|', u.role);
  console.log('Tem hash:', !!u.passwordHash);
  console.log('Tem salt:', !!u.passwordSalt);

  if (u.passwordHash && u.passwordSalt) {
    // Testa a senha admin123
    const testPassword = 'admin123';
    const computed = crypto.createHash('sha256').update(testPassword + u.passwordSalt).digest('hex');
    const match = computed === u.passwordHash;
    console.log('Senha "admin123" bate:', match);

    if (!match) {
      console.log('Hash esperado:', u.passwordHash.substring(0, 30) + '...');
      console.log('Hash calculado:', computed.substring(0, 30) + '...');
    }
  } else {
    console.log('PROBLEMA: Usuario nao tem hash/salt de senha!');
    console.log('Raw hash:', u.passwordHash);
    console.log('Raw salt:', u.passwordSalt);
  }

  await pool.end();
}

main().catch(e => { console.error('ERRO:', e.message); pool.end(); });
