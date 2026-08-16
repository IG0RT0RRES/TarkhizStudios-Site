import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

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

  // 2. Captura de todos os dados enviados pelo Unity (suporta JSON e x-www-form-urlencoded)
  const body = req.body || {};
  const username = body.username || body.UserName || "";
  const nickname = body.nickname || body.NickName || "";
  const email = body.email || body.Email || "";
  const password = body.password || body.Password || "";
  const icon = body.icon || body.avatar_id || body.IconBase64 || "avatar-0";
  
  // Tratamento dos novos campos solicitados:
  const birthday = body.birthday || body.Birthday || "";
  const gender = parseInt(body.gender ?? body.Gender ?? 0, 10); // 0: Masculino, 1: Feminino, 2: Non-binary
  const location = parseInt(body.location ?? body.Location ?? 0, 10); // 0 a 15 (Índices dos países/bandeiras)
  const status = parseInt(body.status ?? body.Status ?? 1, 10); // 0: Ativo, 1: Aprovado, 2: Rejeitado
  
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

    if (existingProfile) {
      return res.status(200).json(formatProfileObject(existingProfile, icon));
    }

    // 4. Validar dados obrigatórios para criação
    if (!username || !password || !email) {
      return res.status(400).json({ 
        error: "Dados insuficientes para criação. Requer: username, password e email." 
      });
    }

    const newUserId = crypto.randomUUID();

    // 5. Inserção com todos os campos na tabela profiles
    const { data: insertedProfile, error: insertError } = await supabase
      .from('profiles')
      .insert([
        {
          id: newUserId,
          username: username,
          nickname: nickname,
          score: score,
          avatar_id: icon,
          gender: gender,
          birthday: birthday,
          location: location,
          status: status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 6. Inicialização das propriedades adicionais do jogador
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

    // 7. Retorna a estrutura no formato PascalCase esperada pelo Unity
    const newProfileData = {
      ...insertedProfile,
      email,
      password,
      accountdate,
      authenticator,
      tokenfacebook,
      achievement
    };

    return res.status(200).json(formatProfileObject(newProfileData, icon));

  } catch (err) {
    return res.status(500).json({
      error: "Erro ao processar requisição no Supabase",
      details: err.message
    });
  }
}

// Função de formatação para manter paridade com o C# do Unity
function formatProfileObject(data, iconFallback) {
  return {
    ProfileId: data.id || 0,
    Status: Number(data.status ?? 1),
    UserName: data.username || "",
    NickName: data.nickname || "",
    AccountDate: data.accountdate || data.created_at || "",
    Gender: Number(data.gender ?? 0),
    Email: data.email || "",
    Birthday: data.birthday || "",
    Location: Number(data.location ?? 0),
    Password: data.password || "",
    Authenticator: data.authenticator || "",
    Score: Number(data.score || 0),
    TokenFacebook: data.tokenfacebook || "",
    Achievement: data.achievement || "",
    ImgBase64: data.avatar_id || iconFallback || ""
  };
}