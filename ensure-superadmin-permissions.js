const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://root:E5zkE4XyQBaT0LUXFF1rQCVVGybFHMH2@dpg-d591fkruibrs73b0tps0-a.singapore-postgres.render.com/snowcity_553z',
  ssl: { rejectUnauthorized: false }
});

async function ensureSuperAdminPermissions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure superadmin role exists
    const { rows: superAdminRoles } = await client.query(`
      INSERT INTO roles (role_name, description)
      VALUES ('superadmin', 'Super Administrator with all permissions')
      ON CONFLICT (role_name) DO UPDATE 
      SET description = EXCLUDED.description
      RETURNING role_id
    `);
    const superAdminRoleId = superAdminRoles[0].role_id;

    // 2. Get or create all permissions
    const permissionGroups = ['attractions', 'bookings', 'users', 'roles', 'settings', 'reports'];
    const actions = ['create', 'read', 'update', 'delete', 'manage'];
    
    for (const group of permissionGroups) {
      for (const action of actions) {
        const permissionKey = `${group}:${action}`;
        await client.query(`
          INSERT INTO permissions (permission_key, description)
          VALUES ($1, $2)
          ON CONFLICT (permission_key) DO NOTHING
        `, [permissionKey, `Permission to ${action} ${group}`]);
      }
    }

    // 3. Grant all permissions to superadmin role
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT $1, permission_id 
      FROM permissions
      WHERE NOT EXISTS (
        SELECT 1 FROM role_permissions 
        WHERE role_id = $1 AND permission_id = permissions.permission_id
      )
    `, [superAdminRoleId]);

    // 4. Assign superadmin role to admin user (ID: 20)
    await client.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES (20, $1)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `, [superAdminRoleId]);

    await client.query('COMMIT');
    console.log('✅ Superadmin permissions ensured successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error ensuring superadmin permissions:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

ensureSuperAdminPermissions().catch(console.error);
