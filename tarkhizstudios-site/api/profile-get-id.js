import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // 1. Configuração de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Configuração ausente na Vercel (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).'
    });
  }

  const { username, password } = req.body || {};

  if (!username) {
    return res.status(400).json({ error: 'O parâmetro username é obrigatório.' });
  }

  try {
    // 1. Busca o perfil pelo username na tabela 'profiles'
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profileData) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }

    const userId = profileData.id;

    // 2. Busca em paralelo as credenciais e os dados das tabelas secundárias
    const [credsRes, propertiesRes, unlocksRes, historyRes] = await Promise.all([
      supabase.from('user_credentials').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_properties').select('*').eq('user_id', userId),
      supabase.from('user_unlocks').select('*').eq('user_id', userId),
      supabase.from('user_history').select('*').eq('user_id', userId)
    ]);

    const credsData = credsRes.data;

    // Se a password foi enviada na requisição, valida contra as credenciais reais
    if (password !== undefined && credsData && credsData.password !== password) {
      return res.status(401).json({ message: 'Palavra-passe incorreta.' });
    }

    let propertiesData = null;
    if (propertiesRes.data) {
      propertiesData = Array.isArray(propertiesRes.data) ? propertiesRes.data[0] : propertiesRes.data;
    }

    const formattedHistory = Array.isArray(historyRes.data) 
      ? historyRes.data.map(h => ({ ...h, is_conquest: Boolean(h.is_conquest) })) 
      : [];

    // Retorna formatado exatamente igual ao padrão do Unity
    return res.status(200).json(formatProfileObject(profileData, credsData, propertiesData, unlocksRes.data, formattedHistory));

  } catch (err) {
    return res.status(500).json({
      error: 'Erro ao processar requisição no Supabase',
      details: err.message
    });
  }
}

// Função de formatação atualizada com os novos campos e tabelas corretas
function formatProfileObject(profile, creds, properties, unlocks, history) {
  let props = null;
  if (properties) {
    props = {
      user_id: properties.user_id || profile.id,
      handful: Number(properties.handful || 0),
      bombs: Number(properties.bombs || 0),
      university: Number(properties.university || 0),
      energy: Number(properties.energy || 0)
    };
  }

  const unlocksList = Array.isArray(unlocks) ? unlocks : [];
  const historyList = Array.isArray(history) ? history : [];

  return {
    id: profile.id || '',
    username: profile.username || '',
    nickname: profile.nickname || '',
    gender: Number(profile.gender || 0),
    birthday: profile.birthday || '',
    location: Number(profile.location_id ?? profile.location ?? 0),
    authenticator: Number(creds?.authenticator || 0),
    score: Number(profile.score || 0),
    status: Number(profile.status ?? 1),
    email: creds?.email || '',
    tokenfacebook: creds?.tokenfacebook || '000000000',
    is_admin: Boolean(profile.is_admin),                     // <--- Incluído
    nickname_updated_at: profile.nickname_updated_at || '',   // <--- Incluído
    properties: props,
    avatar_id: profile.avatar_id || '',
    unlocks: unlocksList,
    history: historyList,
    created_at: profile.created_at || '',
    updated_at: profile.updated_at || '',
    password: creds?.password || ''
  };
}
