import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
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
    // Captura o username via Query (GET) ou Body (POST)
    const username = req.query?.username || req.body?.username || req.body?.UserName;

    if (!username) {
      return res.status(400).json({ status: 400, message: 'O parâmetro username é obrigatório.' });
    }

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
      return res.status(404).send('0 results');
    }

    const userId = profileData.id;

    // 2. Busca em paralelo as credenciais e os dados das tabelas secundárias (igual ao login)
    const [credsRes, propertiesRes, unlocksRes, historyRes] = await Promise.all([
      supabase.from('user_credentials').select('*').eq('id', userId).maybeSingle(),
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

    // Extrai os unlocks de forma flexível para garantir que apanha a chave correta
    const unlocksList = Array.isArray(unlocksRes.data) 
      ? unlocksRes.data.map(u => u.unlock_key || u.key || u.name || JSON.stringify(u)) 
      : [];

    const historyList = Array.isArray(historyRes.data) 
      ? historyRes.data.map(h => h.event_name || h.description || JSON.stringify(h)) 
      : [];

    // 3. Monta o objeto exatamente igual ao endpoint de login
    const profileResponse = {
      id: userId,
      username: profileData.username || '',
      nickname: profileData.nickname || '',
      gender: Number(profileData.gender || 0),
      birthday: profileData.birthday || '',
      location: Number(profileData.location_id ?? profileData.location ?? 0),
      authenticator: Number(credsRes.data?.authenticator || 0),
      score: Number(profileData.score || 0),
      status: Number(profileData.status ?? 1),
      email: profileData.email || '',
      tokenfacebook: credsRes.data?.tokenfacebook || '000000000',
      properties: propertiesData ? {
        user_id: propertiesData.user_id || userId,
        handful: Number(propertiesData.handful || 0),
        bombs: Number(propertiesData.bombs || 0),
        university: Number(propertiesData.university || 0),
        energy: Number(propertiesData.energy || 0)
      } : null,
      avatar_id: profileData.avatar_id || '',
      unlocks: unlocksList,
      history: historyList,
      created_at: profileData.created_at || '',
      updated_at: profileData.updated_at || '',
      password: credsRes.data?.password || ''
    };

    return res.status(200).json(profileResponse);

  } catch (err) {
    return res.status(500).json({
      status: 500,
      message: 'Erro ao buscar perfil no Supabase',
      details: err.message
    });
  }
}
