import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // 1. Configuração de CORS
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

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      error: 'Configuração de serviço ausente na Vercel (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).'
    });
  }

  // 2. Captura de dados
  const body = req.body || {};
  const rawSql = body.sql || body.query || "";[cite: 10]
  const adminName = body.UserName || body.username || "Admin_Unknown";[cite: 10]

  if (!rawSql.trim()) {
    return res.status(400).json({ error: "Query vazia" });[cite: 10]
  }

  try {
    // Utiliza a SERVICE_ROLE_KEY para permissões administrativas
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Execução da instrução via Remote Procedure Call (RPC) no Supabase
    const { data, error } = await supabase.rpc('exec_sql', {
      query_text: rawSql
    });

    if (error) {
      return res.status(400).json({ error: error.message });[cite: 10]
    }

    // 4. Retorno de sucesso mantendo a paridade com o PHP[cite: 10]
    return res.status(200).json({
      status: "success",[cite: 10]
      message: "Query executada",[cite: 10]
      result: data ?? null
    });

  } catch (err) {
    return res.status(500).json({
      error: "Falha interna ao executar comando administrativo",
      details: err.message
    });
  }
}