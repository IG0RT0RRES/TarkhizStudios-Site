import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Permitir GET, POST e DELETE para facilitar testes e integração
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Configuração ausente na Vercel (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).'
    });
  }

  // Captura o ID via Query String (GET) ou Body (POST/DELETE)
  const body = req.body || {};
  const id = req.query.id || body.id || body.ProfileId;

  if (!id) {
    return res.status(400).json({ error: 'O campo ID é obrigatório.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar os dados do perfil antes de deletar
    const { data: profile, error: searchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (searchError) {
      console.error("Erro ao buscar perfil:", searchError);
      return res.status(400).json({ error: 'Erro ao buscar perfil', details: searchError.message });
    }

    if (!profile) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    // 2. Limpar dependências nas sub-tabelas primeiro
    await supabase.from('questions').delete().eq('user_id', id);
    await supabase.from('user_properties').delete().eq('user_id', id);
    await supabase.from('user_unlocks').delete().eq('user_id', id);
    await supabase.from('user_history').delete().eq('user_id', id);
    await supabase.from('user_progress').delete().eq('user_id', id);

    // 3. Excluir o registo do utilizador na tabela profiles
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error("Erro ao deletar perfil no Supabase:", deleteError);
      return res.status(400).json({ error: 'Erro ao deletar perfil no Supabase', details: deleteError.message });
    }

    // 4. Retorna o objeto formatado
    return res.status(200).json(formatProfileObject(profile));

  } catch (err) {
    console.error("Erro interno no servidor:", err);
    return res.status(500).json({
      error: 'Erro interno ao processar a exclusão',
      details: err.message
    });
  }
}

function formatProfileObject(data) {
  return {
    ProfileId: data.id || 0,
    UserName: data.username || '',
    NickName: data.nickname || '',
    Email: data.email || '',
    Score: Number(data.score || 0),
    Status: Number(data.status ?? 1)
  };
}
