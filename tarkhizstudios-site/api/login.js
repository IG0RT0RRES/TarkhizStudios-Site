import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase com as variáveis de ambiente corretas da Vercel
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
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

    // 1. Busca o perfil pelo username na tabela 'profiles'
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    // 2. Verifica se o perfil foi encontrado
    if (profileError || !profileData) {
      return res.status(404).json({ status: 404, message: 'Usuário não encontrado' });
    }

    const userId = profileData.id;

    // 3. Busca as credenciais na tabela 'user_credentials' para validar a senha
    const { data: credsData, error: credsError } = await supabase
      .from('user_credentials')
      .select('*')
      .eq('id', userId)
      .single();

    if (credsError || !credsData) {
      return res.status(404).json({ status: 404, message: 'Credenciais não encontradas para este usuário' });
    }

    // 4. Valida se a senha bate com a cadastrada
    if (credsData.password !== password) {
      return res.status(401).json({ status: 401, message: 'Senha incorreta' });
    }

    // 5. Senha correta: Busca em paralelo os dados de todas as outras tabelas relacionadas ao id do usuário
    const [propertiesRes, unlocksRes, historyRes] = await Promise.all([
      supabase.from('user_properties').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_unlocks').select('*').eq('user_id', userId),
      supabase.from('user_history').select('*').eq('user_id', userId)
    ]);

    // 6. Monta o objeto unificado incluindo o id, a password e as credenciais/relações
    const profileResponse = {
      ...profileData,
      id: userId,                // Garante que o ID vai explícito no JSON
      password: credsData.password, // Inclui a senha no JSON de resposta
      authenticator: credsData.authenticator,
      tokenfacebook: credsData.tokenfacebook,
      properties: propertiesRes.data || null,
      unlocks: unlocksRes.data || [],
      history: historyRes.data || []
    };

    // Retorna todos os dados consolidados para a Unity
    return res.status(200).json(profileResponse);

  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Erro interno no servidor', error: err.message });
  }
}
