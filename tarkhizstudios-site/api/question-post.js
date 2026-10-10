import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- GET: STATUS DAS QUESTÕES ---
  if (req.method === 'GET') {
    try {
      // Aceita variações de nome de parâmetro na query
      const userId = req.query?.userid || req.query?.userId || req.query?.UserID;

      if (!userId) {
        return res.status(400).json({ status: 400, message: 'ID do utilizador é obrigatório.' });
      }

      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const questionList = questions || [];

      // Remove questões rejeitadas (status = 2) após recuperar
      const rejectedIds = questionList.filter(q => q.status === 2).map(q => q.id);
      if (rejectedIds.length > 0) {
        await supabase.from('questions').delete().in('id', rejectedIds);
      }

      return res.status(200).json({
        status: 200,
        questions: questionList
      });

    } catch (err) {
      return res.status(500).json({ status: 500, message: 'Erro ao consultar questões', error: err.message });
    }
  }

  // --- POST: NOVA QUESTÃO ---
  if (req.method === 'POST') {
    try {
      const body = req.body || {};

      // Mapeamento flexível para aceitar PascalCase (Unity) e snake_case
      const question = body.Question || body.question;
      const dificulty = body.Dificulty ?? body.dificulty ?? 0;
      const reply_zero = body.ReplyZero || body.reply_zero || '';
      const reply_one = body.ReplyOne || body.reply_one || '';
      const reply_two = body.ReplyTwo || body.reply_two || '';
      const reply_three = body.ReplyThree || body.reply_three || '';
      const author = body.Author || body.author || 'Desconhecido';
      const userid = body.UserID || body.userid || body.user_id;
      const explication = body.Explication || body.explication || '';

      // Validação
      if (!question || !userid) {
        return res.status(400).json({ 
          status: 400, 
          message: 'A questão e o ID do utilizador são obrigatórios.',
          receivedData: body // Ajuda a depurar nos logs da Vercel
        });
      }

      // Verifica se a questão já existe
      const { data: existingQuestion } = await supabase
        .from('questions')
        .select('id')
        .eq('question', question)
        .maybeSingle();

      if (existingQuestion) {
        return res.status(200).json({ status: 200, id: -1, message: 'Esta questão já foi enviada.' });
      }

      // Inserção no Supabase
      const newQuestionData = {
        question: question,
        dificulty: Number(dificulty),
        reply_zero: reply_zero,
        reply_one: reply_one,
        reply_two: reply_two,
        reply_three: reply_three,
        author: author,
        user_id: userid,
        explication: explication,
        status: 0 // Pendente
      };

      const { data: insertResult, error: insertError } = await supabase
        .from('questions')
        .insert([newQuestionData])
        .select()
        .single();

      if (insertError) throw insertError;

      return res.status(200).json({
        status: 200,
        id: insertResult.id,
        message: 'Questão enviada com sucesso!'
      });

    } catch (err) {
      return res.status(500).json({ status: 500, message: 'Erro interno ao salvar questão', error: err.message });
    }
  }

  return res.status(405).json({ status: 405, message: 'Método não permitido' });
}
