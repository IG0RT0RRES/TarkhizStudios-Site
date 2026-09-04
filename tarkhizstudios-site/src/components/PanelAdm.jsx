import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialize o Supabase (substitua pelas suas variáveis ou use import.meta.env se estiver no Vite/Next)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'SUA_SUPABASE_URL',
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'SUA_SUPABASE_SERVICE_ROLE_KEY'
);

export default function GestorLicencas() {
  const [abaAtiva, setAbaAtiva] = useState('cadastro'); // 'cadastro' ou 'atualizacao'
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  // Estados para Cadastro
  const [formCadastro, setFormCadastro] = useState({
    matricula: '',
    nome: '',
    whatsapp: '',
    email: '',
    isDegustacao: false,
  });

  // Estados para Atualização
  const [formAtualizacao, setFormAtualizacao] = useState({
    matricula: '',
    dias: '30',
  });

  // Funções Auxiliares (Mesma lógica do backend/terminal)
  const gerarChave = () => {
    const letras = Array.from({ length: 4 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');
    const numeros = Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 10)
    ).join('');
    return `${letras}${numeros}`;
  };

  const enviarEmailJS = async (customerEmail, nome, licenseKey, dataValidadeFormatada, tipoStatus) => {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = import.meta.env.VITE_EMAILJS_PRIVATE_KEY || process.env.EMAILJS_PRIVATE_KEY;

    if (!serviceId || !templateId || !publicKey || !customerEmail) return;

    let configuracao = {
      cor_fundo: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      cor_borda: '#3b82f6',
      cor_texto: '#60a5fa',
      titulo_email: 'Acesso Liberado! 🚀',
      mensagem_corpo: 'Sua nova licença foi gerada com sucesso e já está pronta para uso no aplicativo.',
      conteudo_destaque: licenseKey,
      detalhe_rodape: `📅 Validade do Acesso: ${dataValidadeFormatada}`,
    };

    if (tipoStatus === 'renovacao') {
      configuracao = {
        cor_fundo: 'linear-gradient(135deg, #059669, #047857)',
        cor_borda: '#10b981',
        cor_texto: '#34d399',
        titulo_email: 'Licença Renovada! 🔄',
        mensagem_corpo: 'O seu pagamento foi confirmado e a validade da sua licença foi estendida com sucesso.',
        conteudo_destaque: licenseKey,
        detalhe_rodape: `🗓️ Nova Validade: ${dataValidadeFormatada}`,
      };
    } else if (tipoStatus === 'degustacao') {
      configuracao = {
        cor_fundo: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
        cor_borda: '#8b5cf6',
        cor_texto: '#a78bfa',
        titulo_email: 'Bem-vindo ao Teste Grátis! 🎁',
        mensagem_corpo: 'Seu período de degustação foi ativado com sucesso. Aproveite seus dias de acesso total!',
        conteudo_destaque: licenseKey,
        detalhe_rodape: `⏱️ Válido até: ${dataValidadeFormatada}`,
      };
    }

    try {
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          accessToken: privateKey,
          template_params: {
            to_email: customerEmail,
            to_name: nome,
            ...configuracao,
          },
        }),
      });
    } catch (err) {
      console.error('Erro EmailJS:', err);
    }
  };

  const enviarWebhookDiscord = async (licenseKey, customerEmail, nome, matriculaFormatada, whatsapp, dataAquisicao, dataValidade, isRenovacao, isDegustacao) => {
    const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    let titulo = 'Nova Licença Gerada (Painel Web)';
    let descricao = 'Um novo colaborador foi cadastrado via interface React.';
    let cor = 16711680;
    let conteudoBot = 'Novo acesso gerado via painel!';

    if (isDegustacao) {
      titulo = '🎁 Licença de Degustação Gerada (Painel Web)';
      descricao = 'Período de teste grátis ativado.';
      cor = 3447003;
      conteudoBot = '🎁 Novo teste grátis (Painel)!';
    } else if (isRenovacao) {
      titulo = 'Licença Renovada / Estendida (Painel Web)';
      descricao = 'A validade da chave foi estendida.';
      cor = 3066993;
      conteudoBot = 'Renovação concluída (Painel)!';
    }

    const tipoTexto = isDegustacao ? 'Degustação' : (isRenovacao ? 'Renovação' : 'Novo Colaborador');

    const fields = [
      { name: 'Tipo', value: tipoTexto, inline: true },
      { name: 'Colaborador', value: matriculaFormatada || nome, inline: false },
      { name: 'WhatsApp', value: whatsapp || 'Não informado', inline: true },
      { name: 'E-mail', value: customerEmail, inline: true },
      { name: 'Data da Operação', value: dataAquisicao, inline: true },
      { name: 'Código de Acesso', value: licenseKey, inline: true },
      { name: 'Válido até', value: dataValidade, inline: true },
    ];

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Gestor Painel Bot',
          content: conteudoBot,
          embeds: [{ title: titulo, description: descricao, color: cor, fields }],
        }),
      });
    } catch (err) {
      console.error('Erro Discord:', err);
    }
  };

  // Ação: Cadastrar Novo Usuário
  const handleCadastrar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultado(null);

    try {
      const { matricula, nome, whatsapp, email, isDegustacao } = formCadastro;
      const diasValidade = isDegustacao ? 3 : 30;
      const tipoLicenca = isDegustacao ? 'degustacao' : 'mensal';

      // 1. Verifica ou cria colaborador
      let colaboradorId = null;
      const filtros = [];
      if (matricula) filtros.push(`matricula.eq.${matricula.trim()}`);
      if (email) filtros.push(`email.eq.${email.trim().toLowerCase()}`);

      let colabExistente = null;
      if (filtros.length > 0) {
        const { data } = await supabase.from('colaboradores').select('id').or(filtros.join(','));
        if (data && data.length > 0) colabExistente = data[0];
      }

      if (colabExistente) {
        colaboradorId = colabExistente.id;
      } else {
        const novaMatricula = matricula ? matricula.trim() : `TEMP_${Date.now()}`;
        const { data: novoColab, error: errColab } = await supabase
          .from('colaboradores')
          .insert([{
            matricula: novaMatricula,
            nome: (nome || 'CLIENTE').toUpperCase(),
            email: email ? email.trim().toLowerCase() : null,
          }])
          .select('id')
          .single();

        if (errColab) throw new Error(errColab.message);
        colaboradorId = novoColab.id;
      }

      // 2. Verifica licença existente
      const { data: licencas } = await supabase
        .from('licencas')
        .select('*')
        .eq('colaborador_id', colaboradorId);

      const licencaExistente = licencas && licencas.length > 0 ? licencas[0] : null;

      const agora = new Date();
      agora.setHours(agora.getHours() - 3); // Fuso BR
      let novaDataValidade = new Date(agora);
      let chaveUso = '';
      let isRenovacao = false;

      if (licencaExistente) {
        isRenovacao = true;
        chaveUso = licencaExistente.chave;
        const dataValidadeAtual = new Date(licencaExistente.data_validade);
        const dataBase = dataValidadeAtual > agora ? dataValidadeAtual : agora;
        novaDataValidade = new Date(dataBase);
        novaDataValidade.setDate(novaDataValidade.getDate() + diasValidade);

        await supabase
          .from('licencas')
          .update({
            data_validade: novaDataValidade.toISOString(),
            status: 'ativa',
            tipo: tipoLicenca,
          })
          .eq('chave', chaveUso);
      } else {
        chaveUso = gerarChave();
        novaDataValidade.setDate(agora.getDate() + diasValidade);

        const { error: errLic } = await supabase.from('licencas').insert([{
          colaborador_id: colaboradorId,
          chave: chaveUso,
          data_aquisicao: agora.toISOString(),
          data_validade: novaDataValidade.toISOString(),
          status: 'ativa',
          tipo: tipoLicenca,
          whatsapp: whatsapp || null,
          admin: false,
        }]);

        if (errLic) throw new Error(errLic.message);
      }

      const dataAquisicaoFmt = agora.toLocaleDateString('pt-BR');
      const dataValidadeFmt = novaDataValidade.toLocaleDateString('pt-BR');
      const colabFmt = matricula ? `${matricula} - ${nome.toUpperCase()}` : nome.toUpperCase();
      const statusEmail = isDegustacao ? 'degustacao' : (isRenovacao ? 'renovacao' : 'novo');

      // Disparos
      await Promise.allSettled([
        enviarEmailJS(email, nome || 'Cliente', chaveUso, dataValidadeFmt, statusEmail),
        enviarWebhookDiscord(chaveUso, email || 'Não informado', nome || 'Cliente', colabFmt, whatsapp, dataAquisicaoFmt, dataValidadeFmt, isRenovacao, isDegustacao)
      ]);

      setResultado({
        sucesso: true,
        mensagem: 'Usuário e licença processados com sucesso!',
        chave: chaveUso,
        validade: dataValidadeFmt,
      });

      setFormCadastro({ matricula: '', nome: '', whatsapp: '', email: '', isDegustacao: false });
    } catch (err) {
      setResultado({ sucesso: false, mensagem: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Ação: Atualizar Licença
  const handleAtualizar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultado(null);

    try {
      const { matricula, dias } = formAtualizacao;
      const diasAdd = parseInt(dias) || 30;

      const { data: colabs } = await supabase
        .from('colaboradores')
        .select('id, matricula, nome, email')
        .eq('matricula', matricula.trim());

      if (!colabs || colabs.length === 0) throw new Error('Colaborador não encontrado com esta matrícula.');

      const colab = colabs[0];
      const { data: licencas } = await supabase
        .from('licencas')
        .select('*')
        .eq('colaborador_id', colab.id);

      if (!licencas || licencas.length === 0) throw new Error('Nenhuma licença encontrada para este colaborador.');

      const licenca = licencas[0];
      const chaveUso = licenca.chave;
      const dataValidadeAtual = new Date(licenca.data_validade);

      const agora = new Date();
      agora.setHours(agora.getHours() - 3);
      const dataBase = dataValidadeAtual > agora ? dataValidadeAtual : agora;
      const novaDataValidade = new Date(dataBase);
      novaDataValidade.setDate(novaDataValidade.getDate() + diasAdd);

      await supabase
        .from('licencas')
        .update({
          data_validade: novaDataValidade.toISOString(),
          status: 'ativa',
          tipo: 'mensal',
        })
        .eq('chave', chaveUso);

      const dataAquisicaoFmt = agora.toLocaleDateString('pt-BR');
      const dataValidadeFmt = novaDataValidade.toLocaleDateString('pt-BR');
      const colabFmt = `${colab.matricula} - ${colab.nome}`;

      if (colab.email) {
        await enviarEmailJS(colab.email, colab.nome, chaveUso, dataValidadeFmt, 'renovacao');
      }

      await enviarWebhookDiscord(chaveUso, colab.email || 'Não informado', colab.nome, colabFmt, licenca.whatsapp, dataAquisicaoFmt, dataValidadeFmt, true, false);

      setResultado({
        sucesso: true,
        mensagem: 'Licença estendida com sucesso!',
        chave: chaveUso,
        validade: dataValidadeFmt,
      });

      setFormAtualizacao({ matricula: '', dias: '30' });
    } catch (err) {
      setResultado({ sucesso: false, mensagem: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-xl bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
          <h1 className="text-2xl font-bold tracking-wide">Gestor de Licenças</h1>
          <p className="text-blue-100 text-sm mt-1">Painel Administrativo Rápido</p>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => { setAbaAtiva('cadastro'); setResultado(null); }}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              abaAtiva === 'cadastro' ? 'bg-slate-700/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1 - Novo Usuário
          </button>
          <button
            onClick={() => { setAbaAtiva('atualizacao'); setResultado(null); }}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              abaAtiva === 'atualizacao' ? 'bg-slate-700/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2 - Atualizar Licença
          </button>
        </div>

        {/* Formulários */}
        <div className="p-6">
          {abaAtiva === 'cadastro' ? (
            <form onSubmit={handleCadastrar} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Matrícula</label>
                <input
                  type="text"
                  required
                  value={formCadastro.matricula}
                  onChange={(e) => setFormCadastro({ ...formCadastro, matricula: e.target.value })}
                  placeholder="Ex: 12345"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formCadastro.nome}
                  onChange={(e) => setFormCadastro({ ...formCadastro, nome: e.target.value })}
                  placeholder="Ex: João da Silva"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={formCadastro.whatsapp}
                  onChange={(e) => setFormCadastro({ ...formCadastro, whatsapp: e.target.value })}
                  placeholder="Ex: 21999999999"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={formCadastro.email}
                  onChange={(e) => setFormCadastro({ ...formCadastro, email: e.target.value })}
                  placeholder="cliente@email.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="degustacao"
                  checked={formCadastro.isDegustacao}
                  onChange={(e) => setFormCadastro({ ...formCadastro, isDegustacao: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded bg-slate-900 border-slate-700"
                />
                <label htmlFor="degustacao" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Modo Degustação (3 dias grátis)
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-500 font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Cadastrar e Liberar Acesso'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAtualizar} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Matrícula do Colaborador</label>
                <input
                  type="text"
                  required
                  value={formAtualizacao.matricula}
                  onChange={(e) => setFormAtualizacao({ ...formAtualizacao, matricula: e.target.value })}
                  placeholder="Digite a matrícula cadastrada"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Estender em (Dias)</label>
                <input
                  type="number"
                  required
                  value={formAtualizacao.dias}
                  onChange={(e) => setFormAtualizacao({ ...formAtualizacao, dias: e.target.value })}
                  placeholder="30"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Atualizar Licença'}
              </button>
            </form>
          )}

          {/* Feedback Visual / Resultado */}
          {resultado && (
            <div className={`mt-6 p-4 rounded-xl border ${resultado.sucesso ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' : 'bg-rose-950/40 border-rose-500/50 text-rose-200'}`}>
              <p className="font-semibold">{resultado.mensagem}</p>
              {resultado.sucesso && resultado.chave && (
                <div className="mt-3 pt-3 border-t border-emerald-500/30 text-sm space-y-1">
                  <p>🔑 <strong className="text-white">Chave:</strong> {resultado.chave}</p>
                  <p>📅 <strong className="text-white">Válido até:</strong> {resultado.validade}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
