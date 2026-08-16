import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // 1. Configuração de CORS para requisições externas/Unity
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

  // 2. Captura dos dados enviados (suporta JSON ou x-www-form-urlencoded)
  const body = req.body || {};
  const username = body.username || body.UserName || "";
  const nickname = body.nickname || body.NickName || "";
  const email = body.email || body.Email || "";
  const password = body.password || body.Password || "";
  const icon = body.icon || body.avatar_id || body.IconBase64 || "avatar-0";
  const gender = body.gender || body.Gender || "";
  const birthday = body.birthday || body.Birthday || "";
  const location = body.location || body.Location || "";
  const accountdate = body.accountdate || body.AccountDate || new Date().toISOString().split('T')[0];
  const authenticator = body.authenticator || body.Authenticator || "";
  const achievement = body.achievement || body.Achievement || "";
  const tokenfacebook = body.tokenfacebook || body.TokenFacebook || "";
  const score = parseInt(body.score || body.Score || 0, 10);

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

    // Se já existir, retorna os dados no formato PascalCase esperado
    if (existingProfile) {
      return res.status(200).json(formatProfileObject(existingProfile, icon));
    }

    // 4. Criar Novo Perfil se usuário, senha e e-mail forem informados
    if (!username || !password || !email) {
      return res.status(400).json({ 
        error: "Dados insuficientes para criação. Requer: username, password e email." 
      });
    }

    const newUserId = crypto.randomUUID();

    // Inserção na tabela public.profiles
    const { data: insertedProfile, error: insertError } = await supabase
      .from('profiles')
      .insert([
        {
          id: newUserId,
          username: username,
          nickname: nickname,
          score: score,
          avatar_id: icon,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Inicialização da tabela user_properties
    const { error: propsError } = await supabase
      .from('user_properties')
      .insert([
        {
          user_id: newUserId,
          handful: 0,
          bombs: 0,
          university: 0,
          energy: -1
        }
      ]);

    if (propsError) {
      console.warn("Aviso ao criar user_properties:", propsError.message);
    }

    // Retorna a estrutura exatamente no formato antigo formatProfileObject
    const newProfileData = {
      ...insertedProfile,
      gender,
      email,
      birthday,
      location,
      password,
      authenticator,
      accountdate,
      tokenfacebook,
      achievement,
      status: 1
    };

    return res.status(200).json(formatProfileObject(newProfileData, icon));

  } catch (err) {
    return res.status(500).json({
      error: "Erro ao processar requisição no Supabase",
      details: err.message
    });
  }
}

// Função para padronizar o JSON retornado conforme o método antigo PHP
function formatProfileObject(data, iconFallback) {
  return {
    ProfileId: data.id || 0,
    Status: data.status ?? 1,
    UserName: data.username || "",
    NickName: data.nickname || "",
    AccountDate: data.accountdate || data.created_at || "",
    Gender: data.gender || "",
    Email: data.email || "",
    Birthday: data.birthday || "",
    Location: data.location || "",
    Password: data.password || "",
    Authenticator: data.authenticator || "",
    Score: Number(data.score || 0),
    TokenFacebook: data.tokenfacebook || "",
    Achievement: data.achievement || "",
    ImgBase64: data.avatar_id || iconFallback || ""
  };
}