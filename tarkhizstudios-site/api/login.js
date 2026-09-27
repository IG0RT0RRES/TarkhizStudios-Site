import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ status: 405, message: 'Método não permitido' });
  }

  try {
    // Pega os dados do corpo (POST) OU da URL (GET / Query Parameters)
    const identifier = req.body?.username || req.body?.email || req.query?.username || req.query?.email;
    const password = req.body?.password || req.query?.password;

    if (!identifier || !password) {
      return res.status(400).json({ status: 400, message: 'Usuário/Email e senha são obrigatórios' });
    }

    let profileData = null;
    let userId = null;
    let credsData = null;

    // 1. Verifica se o identificador é um email (contém '@') ou um username
    const isEmail = identifier.includes('@');

    if (isEmail) {
      // Busca primeiro nas credenciais pelo email
      const { data: credsResult, error: credsSearchError } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('email', identifier)
        .maybeSingle();

      if (credsSearchError || !credsResult) {
        return res.status(404).json({ status: 404, message: 'Usuário não encontrado com este email' });
      }

      credsData = credsResult;
      userId = credsData.id;

      // Busca o perfil correspondente na tabela 'profiles'
      const { data: profileResult, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profileResult) {
        return res.status(404).json({ status: 404, message: 'Perfil não encontrado' });
      }

      profileData = profileResult;

    } else {
      // Busca pelo username na tabela 'profiles'
      const { data: profileResult, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', identifier)
        .maybeSingle();

      if (profileError || !profileResult) {
        return res.status(404).json({ status: 404, message: 'Usuário não encontrado' });
      }

      profileData = profileResult;
      userId = profileData.id;

      // Busca as credenciais correspondentes
      const { data: credsResult, error: credsError } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('id', userId)
        .single();

      if (credsError || !credsResult) {
        return res.status(404).json({ status: 404, message: 'Credenciais não encontradas para este usuário' });
      }

      credsData = credsResult;
    }

    // 2. Valida a senha
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

    // Mapeia o histórico garantindo o tratamento correto do campo is_conquest
    const formattedHistory = Array.isArray(historyRes.data) 
      ? historyRes.data.map(h => ({
          ...h,
          is_conquest: Boolean(h.is_conquest)
        })) 
      : [];

    // 4. Monta o objeto de resposta completo incluindo os campos customizados e a blindagem de location
    const profileResponse = {
      ...profileData,
      id: userId,
      email: credsData.email || '',
      password: credsData.password,
      authenticator: credsData.authenticator,
      tokenfacebook: credsData.tokenfacebook,
      is_admin: Boolean(profileData.is_admin), // Garante o booleano correto para o Unity
      nickname_updated_at: profileData.nickname_updated_at || null, // Garante o campo de data da edição do nickname
      
      // BLINDAGEM DE LOCATION: Garante que o Unity recebe sempre a propriedade "location" preenchida corretamente
      location: Number(profileData.location ?? profileData.location_id ?? 1),

      properties: propertiesData,
      unlocks: unlocksRes.data || [],
      history: formattedHistory
    };

    return res.status(200).json(profileResponse);

  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Erro interno no servidor', error: err.message });
  }
}
