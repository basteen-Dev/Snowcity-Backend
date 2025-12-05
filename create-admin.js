// Direct database admin creation
const { Pool } = require('pg');

// Use the correct database configuration from DATABASE_URL
const pool = new Pool({
  connectionString: 'postgresql://root:dx7EmsRrAs61b8RG2h1o9XJXIA1XNnD6@dpg-d4kmfc24d50c73djp580-a.singapore-postgres.render.com/snow_nixg',
  ssl: { rejectUnauthorized: false },
  application_name: 'snowcity-admin-setup'
});

async function createAdminUsers() {
  try {
    console.log('🎭 Creating admin users...');
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create roles
      console.log('📋 Creating roles...');
      const roles = [
        { name: 'admin', description: 'Full admin access to all dashboard modules' },
        { name: 'sub_admin', description: 'Limited admin access for specific modules' },
        { name: 'user', description: 'Normal user with basic access' }
      ];

      const createdRoles = {};
      for (const role of roles) {
        const result = await client.query(
          `INSERT INTO roles (role_name, description)
           VALUES ($1, $2)
           ON CONFLICT (role_name) DO UPDATE SET description = EXCLUDED.description
           RETURNING role_id`,
          [role.name, role.description]
        );
        createdRoles[role.name] = result.rows[0].role_id;
        console.log(`✅ Created role: ${role.name}`);
      }

      // Create permissions
      console.log('🔐 Creating permissions...');
      const permissions = [
        'attractions.view', 'attractions.create', 'attractions.update', 'attractions.delete',
        'combos.view', 'combos.create', 'combos.update', 'combos.delete',
        'bookings.view', 'bookings.update', 'bookings.delete', 'bookings.export',
        'users.view', 'users.create', 'users.update', 'users.delete', 'users.manage_roles',
        'analytics.view', 'analytics.export', 'reports.view', 'reports.export',
        'blogs.view', 'blogs.create', 'blogs.update', 'blogs.delete',
        'pages.view', 'pages.create', 'pages.update', 'pages.delete',
        'gallery.view', 'gallery.create', 'gallery.update', 'gallery.delete',
        'offers.view', 'offers.create', 'offers.update', 'offers.delete',
        'coupons.view', 'coupons.create', 'coupons.update', 'coupons.delete',
        'settings.view', 'settings.update', 'notifications.view', 'notifications.send',
        'slots.view', 'slots.create', 'slots.update', 'slots.delete',
        'holidays.view', 'holidays.create', 'holidays.update', 'holidays.delete'
      ];

      const createdPermissions = {};
      for (const permission of permissions) {
        const result = await client.query(
          `INSERT INTO permissions (permission_key, description)
           VALUES ($1, $2)
           ON CONFLICT (permission_key) DO NOTHING
           RETURNING permission_id`,
          [permission, `Permission for ${permission}`]
        );
        if (result.rows.length > 0) {
          createdPermissions[permission] = result.rows[0].permission_id;
        }
      }
      console.log(`✅ Created ${Object.keys(createdPermissions).length} permissions`);

      // Grant all permissions to admin role
      console.log('👑 Granting permissions to admin role...');
      const adminPermissionIds = Object.values(createdPermissions);
      for (const permissionId of adminPermissionIds) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [createdRoles.admin, permissionId]
        );
      }

      // Grant limited permissions to sub_admin role
      console.log('🔑 Granting limited permissions to sub_admin role...');
      const subAdminPermissions = [
        'attractions.view', 'combos.view', 'bookings.view', 'analytics.view',
        'blogs.view', 'pages.view', 'gallery.view', 'offers.view', 'coupons.view',
        'slots.view', 'holidays.view', 'reports.view'
      ];
      
      for (const permission of subAdminPermissions) {
        if (createdPermissions[permission]) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
            [createdRoles.sub_admin, createdPermissions[permission]]
          );
        }
      }

      // Grant basic permissions to user role
      console.log('👤 Granting basic permissions to user role...');
      const userPermissions = ['attractions.view', 'combos.view', 'offers.view', 'coupons.view'];
      for (const permission of userPermissions) {
        if (createdPermissions[permission]) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
            [createdRoles.user, createdPermissions[permission]]
          );
        }
      }

      // Create admin users with simple password hashes
      console.log('👥 Creating admin users...');
      
      // Main admin user
      const adminHash = '$2b$10$.U4Oq6zz79hnK81SPjKm5O.cm1BrTZgq3/b2zkK53h.a7mebOh2iW'; // hash of "Snowcity@123"
      const adminRes = await client.query(
        `INSERT INTO users (name, email, password_hash, otp_verified)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash
         RETURNING user_id, email`,
        ['Super Admin', 'admin@snowcity.local', adminHash]
      );
      const adminUserId = adminRes.rows[0].user_id;

      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [adminUserId, createdRoles.admin]
      );

      // Sub admin user
      const subAdminHash = '$2b$10$GnQdjWaPDl3mCLtPqejAx.CJyEHgcFz2U/BFgLrP/7gB7zeuT/GE6'; // hash of "SubAdmin@123"
      const subAdminRes = await client.query(
        `INSERT INTO users (name, email, password_hash, otp_verified)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash
         RETURNING user_id, email`,
        ['Sub Admin', 'subadmin@snowcity.local', subAdminHash]
      );
      const subAdminUserId = subAdminRes.rows[0].user_id;

      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [subAdminUserId, createdRoles.sub_admin]
      );

      await client.query('COMMIT');
      
      console.log('🎉 Admin users created successfully:');
      console.log('   👑 Admin: admin@snowcity.local / Snowcity@123');
      console.log('   🔑 Sub Admin: subadmin@snowcity.local / SubAdmin@123');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Failed to create admin users:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdminUsers();
