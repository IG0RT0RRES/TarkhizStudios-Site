import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
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
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Configuração ausente na Vercel (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).'
    });
  }

  const body = req.body || {};
  // Identificador do usuário (pode enviar 'id', 'username' ou 'UserName')
  const userId = body.id || body.Id || "";
  const username = body.username || body.UserName || "";

  if (!userId && !username) {
    return res.status(400).json({ error: "É obrigatório fornecer o 'id' ou o 'username' para identificar o perfil a atualizar." });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // 1. Descobre o ID do usuário caso tenha enviado apenas o username
    let targetUserId = userId;
    if (!targetUserId && username) {
      const { data: profileCheck, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (checkError || !profileCheck) {
        return res.status(404).json({ error: "Usuário não encontrado para atualização." });
      }
      targetUserId = profileCheck.id;
    }

    const nowIso = new Date().toISOString();

    // 2. Prepara os dados para atualizar na tabela 'profiles'
    const profileUpdates = { updated_at: nowIso };
    
    if (body.nickname !== undefined || body.NickName !== undefined) {
      profileUpdates.nickname = body.nickname || body.NickName;
      // Se alterou o nickname, atualiza automaticamente a data de alteração se não foi enviada explicitamente
      profileUpdates.nickname_updated_at = body.nickname_updated_at || body.NickNameUpdatedAt || nowIso;
    }
    if (body.nickname_updated_at !== undefined || body.NickNameUpdatedAt !== undefined) {
      profileUpdates.nickname_updated_at = body.nickname_updated_at || body.NickNameUpdatedAt;
    }
    if (body.is_admin !== undefined || body.IsAdmin !== undefined) {
      profileUpdates.is_admin = Boolean(body.is_admin ?? body.IsAdmin);
    }
    if (body.score !== undefined || body.Score !== undefined) {
      profileUpdates.score = parseInt(body.score ?? body.Score ?? 0, 10);
    }
    if (body.avatar_id !== undefined || body.icon !== undefined) {
      profileUpdates.avatar_id = body.avatar_id || body.icon;
    }
    if (body.gender !== undefined || body.Gender !== undefined) {
      profileUpdates.gender = parseInt(body.gender ?? body.Gender ?? 0, 10);
    }
    if (body.location !== undefined || body.Location !== undefined || body.location_id !== undefined) {
      profileUpdates.location_id = parseInt(body.location ?? body.Location ?? body.location_id ?? 1, 10);
    }
    if (body.status !== undefined || body.Status !== undefined) {
      profileUpdates.status = parseInt(body.status ?? body.Status ?? 1, 10);
    }

    // Tratamento de data de nascimento (caso venha DD/MM/YYYY)
    let birthday = body.birthday || body.Birthday;
    if (birthday !== undefined) {
      if (birthday && typeof birthday === 'string' && birthday.includes('/')) {
        const parts = birthday.split('/');
        if (parts.length === 3) {
          if (parts[0].length === 2 && parts[2].length === 4) {
            birthday = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
      }
      profileUpdates.birthday = birthday || null;
    }

    // Executa o update em 'profiles' se houver alterações
    let updatedProfile = null;
    if (Object.keys(profileUpdates).length > 1) {
      const { data, error: profileUpdateError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', targetUserId)
        .select()
        .single();

      if (profileUpdateError) {
        throw new Error(`Erro ao atualizar profiles: ${profileUpdateError.message}`);
      }
      updatedProfile = data;
    } else {
      const { data } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
      updatedProfile = data;
    }

    // 3. Prepara os dados para atualizar na tabela 'user_credentials'
    const credsUpdates = { updated_at: nowIso };
    if (body.email !== undefined || body.Email !== undefined) {
      credsUpdates.email = body.email || body.Email;
    }
    if (body.password !== undefined || body.Password !== undefined) {
      credsUpdates.password = body.password || body.Password;
    }
    if (body.authenticator !== undefined || body.Authenticator !== undefined) {
      credsUpdates.authenticator = parseInt(body.authenticator || body.Authenticator || 0, 10);
    }
    if (body.tokenfacebook !== undefined || body.TokenFacebook !== undefined) {
      credsUpdates.tokenfacebook = body.tokenfacebook || body.TokenFacebook;
    }

    let updatedCreds = null;
    if (Object.keys(credsUpdates).length > 1) {
      const { data, error: credsUpdateError } = await supabase
        .from('user_credentials')
        .update(credsUpdates)
        .eq('id', targetUserId)
        .select()
        .maybeSingle();

      if (credsUpdateError) {
        throw new Error(`Erro ao atualizar user_credentials: ${credsUpdateError.message}`);
      }
      updatedCreds = data;
    } else {
      const { data } = await supabase.from('user_credentials').select('*').eq('id', targetUserId).maybeSingle();
      updatedCreds = data;
    }

    // 4. Busca os dados complementares
    const [propertiesRes, unlocksRes, historyRes] = await Promise.all([
      supabase.from('user_properties').select('*').eq('user_id', targetUserId),
      supabase.from('user_unlocks').select('*').eq('user_id', targetUserId),
      supabase.from('user_history').select('*').eq('user_id', targetUserId)
    ]);

    let propertiesData = null;
    if (propertiesRes.data) {
      propertiesData = Array.isArray(propertiesRes.data) ? propertiesRes.data[0] : propertiesRes.data;
    }

    const formattedHistory = Array.isArray(historyRes.data) 
      ? historyRes.data.map(h => ({ ...h, is_conquest: Boolean(h.is_conquest) })) 
      : [];

    // 5. Retorna o perfil completo atualizado
    return res.status(200).json(formatProfileObject(
      updatedProfile,
      updatedCreds,
      propertiesData,
      unlocksRes.data || [],
      formattedHistory
    ));

  } catch (err) {
    return res.status(500).json({
      error: "Erro ao processar atualização no Supabase",
      details: err.message
    });
  }
}

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
    email: creds?.email || "",
    tokenfacebook: creds?.tokenfacebook || "000000000",
    is_admin: Boolean(profile.is_admin),                     // <--- Mapeado com segurança para booleano
    nickname_updated_at: profile.nickname_updated_at || "",   // <--- Mapeado para string de data/hora
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
