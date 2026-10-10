import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
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
    // 1. Captura os dados enviados no corpo da requisição (do Unity)
    const {
      question,
      dificulty,
      reply_zero,
      reply_one,
      reply_two,
      reply_three,
      author,
      userid, // Pode ser o UUID do perfil ou o username, dependendo de como envia
      explication
    } = req.body || {};

    // 2. Validação básica de campos obrigatórios
    if (!question || !userid) {
      return res.status(400).json({ status: 400, message: 'A questão e o ID/Usuário do autor são obrigatórios.' });
    }

    // 3. Verifica se já existe uma questão idêntica cadastrada (evitar duplicadas, opcional)
    const { data: existingQuestion, error: checkError } = await supabase
      .from('questions')
      .select('id')
      .eq('question', question)
      .maybeSingle();

    if (existingQuestion) {
      return res.status(200).json({ 
        status: 200, 
        id: -1, 
        message: 'Essa questão já foi enviada para nossa base de dados.' 
      });
    }

    // 4. Prepara o objeto para inserção na tabela 'questions'
    const newQuestionData = {
      question: question,
      dificulty: Number(dificulty || 0),
      reply_zero: reply_zero || '',
      reply_one: reply_one || '',
      reply_two: reply_two || '',
      reply_three: reply_three || '',
      author: author || 'Desconhecido',
      user_id: userid, // Vincula à chave estrangeira da tabela profiles
      explication: explication || '',
      status: 0 // 0 = Pendente por padrão
    };

    // 5. Insere no Supabase
    const { data: insertResult, error: insertError } = await supabase
      .from('questions')
      .insert([newQuestionData])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 6. Retorna a resposta de sucesso com o ID gerado
    return res.status(200).json({
      status: 200,
      id: insertResult.id,
      message: 'Questão enviada com sucesso e aguardando aprovação!'
    });

  } catch (err) {
    return res.status(500).json({ 
      status: 500, 
      message: 'Erro interno ao salvar a questão', 
      error: err.message 
    });
  }
}
