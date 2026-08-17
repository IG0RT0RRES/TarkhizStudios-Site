import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase com as variáveis de ambiente da Vercel
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Libera CORS para aceitar requisições da Unity
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 405, message: 'Método não permitido' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ status: 400, message: 'Usuário e senha são obrigatórios' });
    }

    // 1. Consulta no Supabase fazendo INNER JOIN entre profiles e user_credentials
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_credentials!inner (
          password,
          authenticator,
          tokenfacebook
        )
      `)
      .eq('username', username)
      .single();

    // 2. Verifica se o usuário foi encontrado
    if (error || !profileData) {
      return res.status(404).json({ status: 404, message: 'Usuário não encontrado' });
    }

    // 3. Valida se a senha bate com a cadastrada na user_credentials
    const storedPassword = profileData.user_credentials?.password;
    if (storedPassword !== password) {
      return res.status(401).json({ status: 401, message: 'Senha incorreta' });
    }

    // 4. Remove o objeto de credenciais internas da resposta final
    const { user_credentials, ...profileResponse } = profileData;

    // Retorna o perfil validado para a Unity
    return res.status(200).json(profileResponse);

  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Erro interno no servidor', error: err.message });
  }
}