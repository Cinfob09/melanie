const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key on backend
);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { action, email, password } = JSON.parse(event.body);

    switch (action) {
      case 'login':
        // Authenticate with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError) {
          return {
            statusCode: 401,
            body: JSON.stringify({ success: false, error: 'Invalid credentials' })
          };
        }

        // Get user profile from your auth.users table or public.user_profiles
        const { data: userProfile, error: profileError } = await supabase
          .from('auth.users') // or 'user_profiles' if you create one in public schema
          .select('*')
          .eq('id', authData.user.id)
          .single();

        // Create a JWT token for frontend use
        const token = jwt.sign(
          { 
            userId: authData.user.id, 
            email: authData.user.email,
            role: userProfile?.role || 'user'
          },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            token,
            user: {
              id: authData.user.id,
              email: authData.user.email,
              role: userProfile?.role || 'user'
            }
          })
        };

      case 'register':
        // Handle registration
        const { data: newUser, error: regError } = await supabase.auth.signUp({
          email,
          password
        });

        if (regError) {
          return {
            statusCode: 400,
            body: JSON.stringify({ success: false, error: regError.message })
          };
        }

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true, user: newUser })
        };

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

  } catch (error) {
    console.error('Auth function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }