import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase com as variáveis de ambiente corretas da Vercel (sem VITE_)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
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

    // 3. Busca as credenciais correspondentes na tabela 'user_credentials' usando o ID do perfil
    const { data: credsData, error: credsError } = await supabase
      .from('user_credentials')
      .select('password, authenticator, tokenfacebook')
      .eq('id', profileData.id)
      .single();

    if (credsError || !credsData) {
      return res.status(404).json({ status: 404, message: 'Credenciais não encontradas para este usuário' });
    }

    // 4. Valida se a senha bate com a cadastrada
    if (credsData.password !== password) {
      return res.status(401).json({ status: 401, message: 'Senha incorreta' });
    }

    // 5. Adiciona os dados de credenciais necessários na resposta (opcional, se o Unity precisar)
    const profileResponse = {
      ...profileData,
      Authenticator: credsData.authenticator,
      TokenFacebook: credsData.tokenfacebook
    };

    // Retorna o perfil validado para a Unity
    return res.status(200).json(profileResponse);

  } catch (err) {
    return res.status(500).json({ status: 500, message: 'Erro interno no servidor', error: err.message });
  }
}
