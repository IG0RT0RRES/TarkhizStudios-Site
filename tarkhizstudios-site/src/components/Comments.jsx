import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MessageSquare, Send, User, Clock, AlertCircle } from 'lucide-react';

export default function Comments() {
  const [comments, setComments] = useState([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  // Buscar comentários no banco
  const fetchComments = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro detalhado Supabase:', error);
      setError(error.message || 'Erro ao carregar comentários.');
    } else {
      setComments(data || []);
      setError(null);
    }
    setFetching(false);
  };

  useEffect(() => {
    fetchComments();
  }, []);

  // Enviar novo comentário
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase.from('comments').insert([
      {
        author,
        content,
        project_slug: 'general',
      },
    ]);

    if (error) {
      console.error('Erro ao inserir comentário:', error);
      setError(error.message || 'Erro ao publicar comentário.');
    } else {
      setAuthor('');
      setContent('');
      fetchComments(); // Recarrega a lista
    }
    setLoading(false);
  };

  return (
    <section id="comments" className="py-16 max-w-2xl mx-auto px-4">
      <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-2">
        <MessageSquare className="w-7 h-7 text-blue-400" />
        Comentários & Feedback
      </h2>

      {/* Formulário de Novo Comentário */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-slate-800 p-6 rounded-xl border border-slate-700 mb-10">
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Seu Nome / Dev</label>
          <input
            type="text"
            required
            placeholder="Ex: João Silva"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Comentário</label>
          <textarea
            required
            rows="3"
            placeholder="Deixe uma mensagem ou sugestão..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Publicando...' : <><Send className="w-4 h-4" /> Comentar</>}
        </button>

        {error && (
          <p className="text-red-400 text-sm flex items-center gap-2 mt-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </p>
        )}
      </form>

      {/* Lista de Comentários */}
      <div className="space-y-4">
        {fetching ? (
          <p className="text-center text-slate-500">Carregando comentários...</p>
        ) : comments.length === 0 ? (
          <p className="text-center text-slate-500">Seja o primeiro a deixar um comentário!</p>
        ) : (
          comments.map((item) => (
            <div key={item.id} className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-700/40 pb-2">
                <span className="font-semibold text-blue-400 flex items-center gap-1.5 text-sm">
                  <User className="w-4 h-4" /> {item.author}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(item.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{item.content}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}