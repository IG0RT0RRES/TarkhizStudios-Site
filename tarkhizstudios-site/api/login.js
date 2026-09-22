import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Agora aceita tanto POST quanto GET
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ status: 405, message: 'Método não permitido' });
  }

  try {
    // Pega os dados do corpo (POST) OU da URL (GET / Query Parameters)
    const username = req.body?.username || req.query?.username;
    const password = req.body?.password || req.query?.password;

    if (!username || !password) {
      return res.status(400).json({ status: 400, message: 'Usuário e senha são obrigatórios' });
    }

    // 1. Busca o perfil pelo username na tabela 'profiles'
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (profileError || !profileData) {
      return res.status(404).json({ status: 404, message: 'Usuário não encontrado' });
    }

    const userId = profileData.id;

    // 2. Busca as credenciais na tabela 'user_credentials' para validar a senha
    const { data: credsData, error: credsError } = await supabase
      .from('user_credentials')
      .select('*')
      .eq('id', userId)
      .single();

    if (credsError || !credsData) {
      return res.status(404).json({ status: 404, message: 'Credenciais não encontradas para este usuário' });
    }

    if (credsData.password !== password) {
      return res.status(401).json({ status: 401, message: 'Senha incorreta' });
    }

    // 3. Busca em paralelo os dados das outras tabelas
    const [propertiesRes, unlocksRes, historyRes] = await Promise.all([
      supabase.from('user_properties').select('*').eq('user_id', userId),
      supabase.from('user_unlocks').select('*').eq('user_id', userId),
      supabase.from('user_history').select('*').eq('user_id', userId)
    ]);

    let propertiesData = null;
    if (propertiesRes.data) {
      if (Array.isArray(propertiesRes.data) && propertiesRes.data.length > 0) {
        propertiesData = propertiesRes.data[0];
      } else if (!Array.isArray(propertiesRes.data)) {
        propertiesData = propertiesRes.data;
      }
    }

    const profileResponse = {
      ...profileData,
      id: userId,
      password: credsData.password,
      authenticator: credsData.authenticator,
      tokenfacebook: credsData.tokenfacebook,
      properties: propertiesData,
      unlocks: unlocksRes.data || [],
      history: historyRes.data || []
    };

    return res.status(200).json(profileResponse);

  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Erro interno no servidor', error: err.message });
  }
}
