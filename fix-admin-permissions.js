const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://root:E5zkE4XyQBaT0LUXFF1rQCVVGybFHMH2@dpg-d591fkruibrs73b0tps0-a.singapore-postgres.render.com/snowcity_553z',
  ssl: { rejectUnauthorized: false }
});

async function fixAdminPermissions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure the admin role exists
    const { rows: adminRoles } = await client.query(
      "SELECT role_id FROM roles WHERE role_name = 'admin'"
    );

    if (adminRoles.length === 0) {
      console.log('❌ Admin role not found. Creating admin role...');
      const { rows: [newRole] } = await client.query(
        "INSERT INTO roles (role_name, description) VALUES ('admin', 'Administrator with full access') RETURNING role_id"
      );
      adminRoles.push(newRole);
    }
    const adminRoleId = adminRoles[0].role_id;

    // 2. Ensure the required permissions exist
    const requiredPermissions = [
      { key: 'attractions:read', desc: 'Read access to attractions' },
      { key: 'attractions:write', desc: 'Write access to attractions' }
    ];

    for (const perm of requiredPermissions) {
      const { rows: existing } = await client.query(
        'SELECT permission_id FROM permissions WHERE permission_key = $1',
        [perm.key]
      );

      if (existing.length === 0) {
        console.log(`🔄 Creating permission: ${perm.key}`);
        await client.query(
          'INSERT INTO permissions (permission_key, description) VALUES ($1, $2)',
          [perm.key, perm.desc]
        );
      }
    }

    // 3. Assign all permissions to admin role
    const { rows: permissions } = await client.query(
      'SELECT permission_id, permission_key FROM permissions WHERE permission_key = ANY($1)',
      [requiredPermissions.map(p => p.key)]
    );

    for (const perm of permissions) {
      const { rows: existing } = await client.query(
        'SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [adminRoleId, perm.permission_id]
      );

      if (existing.length === 0) {
        console.log(`🔑 Assigning permission ${perm.permission_key} to admin role`);
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [adminRoleId, perm.permission_id]
        );
      }
    }

    // 4. Assign admin role to the admin user if not already assigned
    const { rows: userRoles } = await client.query(
      'SELECT 1 FROM user_roles WHERE user_id = 20 AND role_id = $1',
      [adminRoleId]
    );

    if (userRoles.length === 0) {
      console.log('👤 Assigning admin role to user ID 20');
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [20, adminRoleId]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Permissions updated successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating permissions:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAdminPermissions().catch(console.error);
