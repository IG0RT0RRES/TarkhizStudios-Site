import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // 1. Configuração de CORS para chamadas da Unity / Front-end
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'Configuração ausente na Vercel (SUPABASE_URL/SUPABASE_ANON_KEY).'
    });
  }

  // 2. Captura de todos os dados enviados pelo Unity
  const body = req.body || {};
  const username = body.username || body.UserName || "";
  const nickname = body.nickname || body.NickName || username;
  const email = body.email || body.Email || "";
  const password = body.password || body.Password || "";
  const icon = body.icon || body.avatar_id || "avatar-0";
  
  const birthday = body.birthday || body.Birthday || "";
  const gender = parseInt(body.gender ?? body.Gender ?? 0, 10);
  const location = parseInt(body.location ?? body.Location ?? 0, 10);
  const status = parseInt(body.status ?? body.Status ?? 1, 10);
  
  const authenticator = parseInt(body.authenticator || body.Authenticator || 0, 10);
  const tokenfacebook = body.tokenfacebook || body.TokenFacebook || "000000000";
  const score = parseInt(body.score || body.Score || 5000, 10); // Valor padrão inicial de bónus

  if (!username) {
    return res.status(400).json({ error: "O campo username é obrigatório." });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 3. Verificar se o perfil já existe
    const { data: existingProfile, error: searchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (searchError) {
      throw searchError;
    }

    if (existingProfile) {
      // Se já existe, busca as tabelas secundárias para retornar o perfil completo estruturado
      const [credsRes, propertiesRes, unlocksRes, historyRes] = await Promise.all([
        supabase.from('user_credentials').select('*').eq('id', existingProfile.id).maybeSingle(),
        supabase.from('user_properties').select('*').eq('user_id', existingProfile.id),
        supabase.from('user_unlocks').select('*').eq('user_id', existingProfile.id),
        supabase.from('user_history').select('*').eq('user_id', existingProfile.id)
      ]);

      return res.status(200).json(formatProfileObject(existingProfile, credsRes.data, propertiesRes.data, unlocksRes.data, historyRes.data));
    }

    // 4. Validar dados obrigatórios para criação
    if (!password || !email) {
      return res.status(400).json({ 
        error: "Dados insuficientes para criação. Requer: username, password e email." 
      });
    }

    const newUserId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // 5. Inserção na tabela principal 'profiles'
    const { data: insertedProfile, error: insertError } = await supabase
      .from('profiles')
      .insert([
        {
          id: newUserId,
          username: username,
          nickname: nickname,
          email: email,
          score: score,
          avatar_id: icon,
          gender: gender,
          birthday: birthday,
          location_id: location, // Ajustado para location_id conforme a sua estrutura SQL
          status: status,
          created_at: nowIso,
          updated_at: nowIso
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 6. Inserção paralela nas tabelas secundárias (Credenciais, Propriedades e Histórico Inicial)
    const [credsInsert, propsInsert, historyInsert] = await Promise.all([
      // Tabela user_credentials
      supabase.from('user_credentials').insert([
        {
          id: newUserId,
          password: password,
          authenticator: authenticator,
          tokenfacebook: tokenfacebook,
          updated_at: nowIso
        }
      ]).select().single(),

      // Tabela user_properties (com valores iniciais)
      supabase.from('user_properties').insert([
        {
          user_id: newUserId,
          handful: score,
          bombs: 0,
          university: 0,
          energy: 0
        }
      ]).select(),

      // Tabela user_history (com a conquista inicial NewUser marcada como is_conquest = true)
      supabase.from('user_history').insert([
        {
          user_id: newUserId,
          event_name: 'NewUser',
          description: 'Registrou-se com sucesso na plataforma.',
          icon_name: 'NewPlayer',
          is_conquest: true,
          created_at: nowIso
        }
      ]).select()
    ]);

    let propertiesData = null;
    if (propsInsert.data) {
      propertiesData = Array.isArray(propsInsert.data) ? propsInsert.data[0] : propsInsert.data;
    }

    const formattedHistory = Array.isArray(historyInsert.data) 
      ? historyInsert.data.map(h => ({ ...h, is_conquest: Boolean(h.is_conquest) }))
      : [];

    // 7. Retorna a estrutura completa esperada pelo Unity
    return res.status(200).json(formatProfileObject(
      insertedProfile, 
      credsInsert.data, 
      propertiesData, 
      [], 
      formattedHistory
    ));

  } catch (err) {
    return res.status(500).json({
      error: "Erro ao processar requisição no Supabase",
      details: err.message
    });
  }
}

// Função de formatação padronizada para o Unity
function formatProfileObject(profile, creds, properties, unlocks, history) {
  return {
    id: profile.id || "",
    username: profile.username || "",
    nickname: profile.nickname || "",
    gender: Number(profile.gender || 0),
    birthday: profile.birthday || "",
    location: Number(profile.location_id ?? profile.location ?? 0),
    authenticator: Number(creds?.authenticator || 0),
    score: Number(profile.score || 0),
    status: Number(profile.status ?? 1),
    email: profile.email || "",
    tokenfacebook: creds?.tokenfacebook || "000000000",
    properties: properties ? {
      user_id: properties.user_id || profile.id,
      handful: Number(properties.handful || 0),
      bombs: Number(properties.bombs || 0),
      university: Number(properties.university || 0),
      energy: Number(properties.energy || 0)
    } : null,
    avatar_id: profile.avatar_id || "avatar-0",
    unlocks: unlocks || [],
    history: history ? history.map(h => ({ ...h, is_conquest: Boolean(h.is_conquest) })) : [],
    created_at: profile.created_at || "",
    updated_at: profile.updated_at || "",
    password: creds?.password || ""
  };
}
