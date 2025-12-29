const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://root:E5zkE4XyQBaT0LUXFF1rQCVVGybFHMH2@dpg-d591fkruibrs73b0tps0-a.singapore-postgres.render.com/snowcity_553z',
  ssl: { rejectUnauthorized: false }
});

async function checkAdminPermissions() {
  try {
    console.log('🔍 Checking admin user permissions...');
    
    // Get all admin users
    const { rows: admins } = await pool.query(`
      SELECT u.user_id, u.email, u.name, 
             array_agg(DISTINCT r.role_name) as roles,
             array_agg(DISTINCT p.permission_key) as permissions
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.user_id
      LEFT JOIN roles r ON r.role_id = ur.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.role_id
      LEFT JOIN permissions p ON p.permission_id = rp.permission_id
      WHERE r.role_name IN ('admin', 'superadmin')
      GROUP BY u.user_id, u.email, u.name
    `);
    
    console.log('👥 Admin Users:');
    console.log('\n👤 Admin Users:');
    if (admins.length === 0) {
      console.log('No admin users found.');
    } else {
      console.table(admins.map(u => ({
        id: u.user_id,
        email: u.email,
        name: u.name,
        roles: Array.isArray(u.roles) ? u.roles.join(', ') : 'No roles',
        permissions: Array.isArray(u.permissions) ? u.permissions.filter(Boolean).join(', ') : 'No permissions',
        permissionCount: Array.isArray(u.permissions) ? u.permissions.filter(Boolean).length : 0
      })));
    }
    
    // Check attraction-related permissions
    const { rows: attractionPerms } = await pool.query(`
      SELECT p.permission_id, p.permission_key, p.description
      FROM permissions p
      WHERE p.permission_key LIKE 'attraction%'
      ORDER BY p.permission_key
    `);
    
    console.log('\n🔑 Attraction-related Permissions:');
    console.table(attractionPerms);
    
    // Check which roles have attraction:write permission
    const { rows: writeRoles } = await pool.query(`
      SELECT r.role_id, r.role_name, p.permission_key
      FROM roles r
      JOIN role_permissions rp ON rp.role_id = r.role_id
      JOIN permissions p ON p.permission_id = rp.permission_id
      WHERE p.permission_key = 'attractions:write'
    `);
    
    console.log('\n👥 Roles with attractions:write permission:');
    console.table(writeRoles);
    
  } catch (err) {
    console.error('❌ Error checking admin permissions:', err.message);
  } finally {
    await pool.end();
  }
}

checkAdminPermissions();
