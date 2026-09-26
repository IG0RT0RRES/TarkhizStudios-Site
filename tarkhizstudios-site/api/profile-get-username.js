import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // 1. Configuração de CORS para chamadas da Unity / Front-end
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

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'Configuração ausente na Vercel (SUPABASE_URL/SUPABASE_ANON_KEY).'
    });
  }

  // 2. Captura do username via Query (GET) ou Body (POST)
  const username = req.query.username || req.body?.username || req.body?.UserName;

  if (!username) {
    return res.status(400).json({ error: 'O parâmetro username é obrigatório.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 3. Consulta ao Supabase buscando o perfil e fazendo JOIN com as tabelas secundárias
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_properties (*),
        user_unlocks (*),
        user_history (*)
      `)
      .eq('username', username)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!profile) {
      return res.status(404).send('0 results');
    }

    // 4. Retorna o objeto formatado exatamente no padrão padrão do login
    return res.status(200).json(formatProfileObject(profile));

  } catch (err) {
    return res.status(500).json({
      error: 'Erro ao buscar perfil no Supabase',
      details: err.message
    });
  }
}

// Função de formatação para corresponder exatamente à estrutura do ProfileData no Unity
function formatProfileObject(data) {
  // Como user_properties costuma ser um registo único por utilizador, pegamos no primeiro elemento se vier como array
  let props = null;
  if (data.user_properties) {
    if (Array.isArray(data.user_properties) && data.user_properties.length > 0) {
      props = data.user_properties[0];
    } else if (!Array.isArray(data.user_properties)) {
      props = data.user_properties;
    }
  }

  // Extrai as chaves dos unlocks e history para arrays de strings (ou ajusta conforme o teu DTO)
  const unlocksList = Array.isArray(data.user_unlocks) 
    ? data.user_unlocks.map(u => u.unlock_key || u.key || JSON.stringify(u)) 
    : [];

  const historyList = Array.isArray(data.user_history) 
    ? data.user_history.map(h => h.event_name || h.description || JSON.stringify(h)) 
    : [];

  return {
    id: data.id || '',
    username: data.username || '',
    nickname: data.nickname || '',
    gender: Number(data.gender || 0),
    birthday: data.birthday || '',
    location: Number(data.location_id ?? data.location ?? 0),
    authenticator: Number(data.authenticator || 0),
    score: Number(data.score || 0),
    status: Number(data.status ?? 1),
    email: data.email || '',
    tokenfacebook: data.tokenfacebook || '000000000',
    properties: props ? {
      user_id: props.user_id || data.id,
      handful: Number(props.handful || 0),
      bombs: Number(props.bombs || 0),
      university: Number(props.university || 0),
      energy: Number(props.energy || 0)
    } : null,
    avatar_id: data.avatar_id || '',
    unlocks: unlocksList,
    history: historyList,
    created_at: data.created_at || '',
    updated_at: data.updated_at || '',
    password: data.password || ''
  };
}
