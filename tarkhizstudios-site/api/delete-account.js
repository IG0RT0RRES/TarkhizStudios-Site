import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // 1. Configuração de CORS para requisições externas/Unity
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'Configuração ausente na Vercel (SUPABASE_URL/SUPABASE_ANON_KEY).'
    });
  }

  // 2. Captura do ID via Body ou Query String
  const body = req.body || {};
  const id = body.id || body.ProfileId || req.query.id;[cite: 5]

  if (!id) {
    return res.status(400).json({ error: 'O campo ID é obrigatório.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 3. Buscar os dados do perfil antes de deletar
    const { data: profile, error: searchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (searchError) {
      throw searchError;
    }

    if (!profile) {
      return res.status(404).json({ error: 'Perfil não encontrado' });[cite: 5]
    }

    // 4. Excluir o registro do usuário na tabela profiles[cite: 5]
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    // 5. Opcional: Limpar propriedades vinculadas na tabela user_properties
    await supabase
      .from('user_properties')
      .delete()
      .eq('user_id', id);

    // 6. Retorna o objeto do perfil deletado exatamente na estrutura do PHP[cite: 5]
    return res.status(200).json(formatProfileObject(profile));

  } catch (err) {
    return res.status(500).json({
      error: 'Erro ao processar a exclusão física ou no banco',[cite: 5]
      details: err.message
    });
  }
}

// Formatação do perfil em PascalCase conforme o método do PHP antigo[cite: 5]
function formatProfileObject(data) {
  return {
    ProfileId: data.id || 0,[cite: 5]
    UserName: data.username || '',[cite: 5]
    NickName: data.nickname || '',[cite: 5]
    Email: data.email || '',[cite: 5]
    Score: Number(data.score || 0),[cite: 5]
    Status: Number(data.status ?? 1)[cite: 5]
  };
}