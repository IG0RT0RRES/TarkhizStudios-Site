import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL_GB || process.env.VITE_SUPABASE_URL_GB;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_SECRET_KEY_GB || process.env.VITE_SUPABASE_SECRET_KEY_GB;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function PanelAdm() {
  const [sessao, setSessao] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [erroLogin, setErroLogin] = useState('');

  const [abaAtiva, setAbaAtiva] = useState('cadastro');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  // Estados para a listagem
  const [licencasCadastradas, setLicencasCadastradas] = useState([]);
  const [loadingLista, setLoadingLista] = useState(false);
  const [filtroBusca, setFiltroBusca] = useState('');

  const [formCadastro, setFormCadastro] = useState({
    matricula: '',
    nome: '',
    whatsapp: '',
    email: '',
    isDegustacao: false,
  });

  const [formAtualizacao, setFormAtualizacao] = useState({
    matricula: '',
    dias: '30',
  });

  // Função para normalizar textos (remover acentos e padronizar minúsculas)
  const normalizarTexto = (texto) => {
    if (!texto) return '';
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  };

  useEffect(() => {
    async function verificarSessao() {
      const { data: { session } } = await supabase.auth.getSession();
      setSessao(session);
      if (session) {
        await checarSeEhAdmin(session.user.email);
      }
      setLoadingAuth(false);
    }
    verificarSessao();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSessao(session);
      if (session) {
        await checarSeEhAdmin(session.user.email);
      } else {
        setIsAdmin(false);
      }
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checarSeEhAdmin = async (email) => {
    try {
      const { data: colabData, error: colabError } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (colabError || !colabData) {
        setIsAdmin(false);
        setErroLogin('E-mail não encontrado na base de colaboradores.');
        await supabase.auth.signOut();
        return;
      }

      const { data: licencaData, error: licencaError } = await supabase
        .from('licencas')
        .select('admin')
        .eq('colaborador_id', colabData.id)
        .maybeSingle();

      if (licencaError || !licencaData || licencaData.admin !== true) {
        setIsAdmin(false);
        setErroLogin('Acesso negado: Conta sem privilégios de Administrador.');
        await supabase.auth.signOut();
        return;
      }

      setIsAdmin(true);
      setErroLogin('');
    } catch (err) {
      console.error('Exceção admin:', err);
      setIsAdmin(false);
      setErroLogin('Erro interno ao validar permissões.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingAuth(true);
    setErroLogin('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLogin.trim().toLowerCase(),
      password: senhaLogin,
    });

    if (error) {
      setErroLogin(`Erro Supabase: ${error.message}`);
      setLoadingAuth(false);
    } else {
      await checarSeEhAdmin(data.user.email);
      setLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setSessao(null);
  };

  const buscarLicencasDoBanco = async () => {
    setLoadingLista(true);
    try {
      const { data, error } = await supabase
        .from('licencas')
        .select(`
          id,
          chave,
          data_aquisicao,
          data_validade,
          status,
          tipo,
          whatsapp,
          colaborador_id,
          colaboradores (
            id,
            nome,
            matricula,
            email,
            equipe
          )
        `)
        .order('data_validade', { ascending: false });

      if (error) throw error;
      setLicencasCadastradas(data || []);
    } catch (err) {
      console.error('Erro ao buscar licenças:', err.message);
    } finally {
      setLoadingLista(false);
    }
  };

  useEffect(() => {
    if (abaAtiva === 'lista' && isAdmin) {
      buscarLicencasDoBanco();
    }
  }, [abaAtiva, isAdmin]);

  const gerarChave = () => {
    const letras = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
    const numeros = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
    return `${letras}${numeros}`;
  };

  const enviarEmailJS = async (customerEmail, nome, licenseKey, dataValidadeFormatada, tipoStatus) => {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    const privateKey = import.meta.env.VITE_EMAILJS_PRIVATE_KEY;

    if (!serviceId || !templateId || !publicKey || !customerEmail) return;

    let configuracao = {
      cor_fundo: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      titulo_email: 'Acesso Liberado! 🚀',
      mensagem_corpo: 'Sua nova licença foi gerada com sucesso e já está pronta para uso no aplicativo.',
      conteudo_destaque: licenseKey,
      detalhe_rodape: `📅 Validade do Acesso: ${dataValidadeFormatada}`,
    };

    if (tipoStatus === 'renovacao') {
      configuracao.titulo_email = 'Licença Renovada! 🔄';
      configuracao.mensagem_corpo = 'O seu pagamento foi confirmado e a validade da sua licença foi estendida.';
      configuracao.detalhe_rodape = `🗓️ Nova Validade: ${dataValidadeFormatada}`;
    } else if (tipoStatus === 'degustacao') {
      configuracao.titulo_email = 'Teste Grátis Ativado! 🎁';
      configuracao.mensagem_corpo = 'Seu período de degustação foi ativado com sucesso.';
      configuracao.detalhe_rodape = `⏱️ Válido até: ${dataValidadeFormatada}`;
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
          template_params: { to_email: customerEmail, to_name: nome, ...configuracao },
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
    let cor = 16711680;
    if (isDegustacao) { titulo = '🎁 Licença de Degustação Gerada'; cor = 3447003; }
    else if (isRenovacao) { titulo = 'Licença Renovada / Estendida'; cor = 3066993; }

    const fields = [
      { name: 'Tipo', value: isDegustacao ? 'Degustação' : (isRenovacao ? 'Renovação' : 'Novo Colaborador'), inline: true },
      { name: 'Colaborador', value: matriculaFormatada || nome, inline: false },
      { name: 'WhatsApp', value: whatsapp || 'Não informado', inline: true },
      { name: 'E-mail', value: customerEmail, inline: true },
      { name: 'Chave', value: licenseKey, inline: true },
      { name: 'Validade', value: dataValidade, inline: true },
    ];

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Gestor Painel Bot', embeds: [{ title: titulo, color: cor, fields }] }),
      });
    } catch (err) {
      console.error('Erro Discord:', err);
    }
  };

  const handleCadastrar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultado(null);

    try {
      const { matricula, nome, whatsapp, email, isDegustacao } = formCadastro;
      const diasValidade = isDegustacao ? 3 : 30;
      const tipoLicenca = isDegustacao ? 'degustacao' : 'mensal';

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
        await supabase.from('colaboradores').update({
          nome: (nome || 'CLIENTE').toUpperCase(),
          email: email ? email.trim().toLowerCase() : null,
        }).eq('id', colaboradorId);
      } else {
        const novaMatricula = matricula ? matricula.trim() : `TEMP_${Date.now()}`;
        const { data: novoColab, error: errColab } = await supabase.from('colaboradores').insert([{
          matricula: novaMatricula,
          nome: (nome || 'CLIENTE').toUpperCase(),
          email: email ? email.trim().toLowerCase() : null,
        }]).select('id').single();

        if (errColab) throw new Error(errColab.message);
        colaboradorId = novoColab.id;
      }

      const { data: licencas } = await supabase.from('licencas').select('*').eq('colaborador_id', colaboradorId);
      const licencaExistente = licencas && licencas.length > 0 ? licencas[0] : null;

      const agora = new Date();
      agora.setHours(agora.getHours() - 3);
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

        await supabase.from('licencas').update({
          data_validade: novaDataValidade.toISOString(),
          status: 'ativa',
          tipo: tipoLicenca,
          whatsapp: whatsapp || licencaExistente.whatsapp,
        }).eq('chave', chaveUso);
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

  const handleAtualizar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultado(null);

    try {
      const { matricula, dias } = formAtualizacao;
      const diasAdd = parseInt(dias) || 30;

      const { data: colabs } = await supabase.from('colaboradores').select('id, matricula, nome, email').eq('matricula', matricula.trim());
      if (!colabs || colabs.length === 0) throw new Error('Colaborador não encontrado com esta matrícula.');

      const colab = colabs[0];
      const { data: licencas } = await supabase.from('licencas').select('*').eq('colaborador_id', colab.id);
      if (!licencas || licencas.length === 0) throw new Error('Nenhuma licença encontrada para este colaborador.');

      const licenca = licencas[0];
      const chaveUso = licenca.chave;
      const dataValidadeAtual = new Date(licenca.data_validade);

      const agora = new Date();
      agora.setHours(agora.getHours() - 3);
      const dataBase = dataValidadeAtual > agora ? dataValidadeAtual : agora;
      const novaDataValidade = new Date(dataBase);
      novaDataValidade.setDate(novaDataValidade.getDate() + diasAdd);

      await supabase.from('licencas').update({
        data_validade: novaDataValidade.toISOString(),
        status: 'ativa',
        tipo: 'mensal',
      }).eq('chave', chaveUso);

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

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center font-sans">
        <p>Carregando autenticação...</p>
      </div>
    );
  }

  if (!sessao || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-center mb-1">Painel Restrito</h2>
          <p className="text-slate-400 text-sm text-center mb-6">Faça login com uma conta de Administrador</p>

          {erroLogin && (
            <div className="mb-4 p-3 bg-rose-950/40 border border-rose-500/50 text-rose-200 text-sm rounded-lg">
              {erroLogin}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">E-mail</label>
              <input
                type="email"
                required
                value={emailLogin}
                onChange={(e) => setEmailLogin(e.target.value)}
                placeholder="admin@email.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Senha</label>
              <input
                type="password"
                required
                value={senhaLogin}
                onChange={(e) => setSenhaLogin(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-3 rounded-lg transition duration-200"
            >
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filtragem utilizando a normalização de texto para ignorar acentos e letras maiúsculas/minúsculas
  const licencasFiltradas = licencasCadastradas.filter(item => {
    const nome = normalizarTexto(item.colaboradores?.nome);
    const matricula = normalizarTexto(item.colaboradores?.matricula);
    const chave = normalizarTexto(item.chave);
    const termo = normalizarTexto(filtroBusca);

    return nome.includes(termo) || matricula.includes(termo) || chave.includes(termo);
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 px-2">
        <span className="text-sm text-slate-400">Logado como: <strong className="text-slate-200">{sessao.user.email}</strong></span>
        <button
          onClick={handleLogout}
          className="text-xs bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-lg transition"
        >
          Sair
        </button>
      </div>

      <div className="w-full max-w-4xl bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
          <h1 className="text-2xl font-bold tracking-wide">Gestor de Licenças</h1>
          <p className="text-blue-100 text-sm mt-1">Painel Administrativo Completo</p>
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
          <button
            onClick={() => { setAbaAtiva('lista'); setResultado(null); }}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              abaAtiva === 'lista' ? 'bg-slate-700/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3 - Ver Licenças Cadastradas
          </button>
        </div>

        <div className="p-6">
          {abaAtiva === 'cadastro' && (
            <form onSubmit={handleCadastrar} className="space-y-4 max-w-xl mx-auto">
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
          )}

          {abaAtiva === 'atualizacao' && (
            <form onSubmit={handleAtualizar} className="space-y-4 max-w-xl mx-auto">
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

          {abaAtiva === 'lista' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <input
                  type="text"
                  value={filtroBusca}
                  onChange={(e) => setFiltroBusca(e.target.value)}
                  placeholder="Pesquisar por nome, matrícula ou chave..."
                  className="w-full sm:w-80 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={buscarLicencasDoBanco}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg transition"
                >
                  🔄 Atualizar Lista
                </button>
              </div>

              {loadingLista ? (
                <p className="text-center text-slate-400 py-8">Carregando licenças do banco...</p>
              ) : (
                <div className="overflow-x-auto border border-slate-700 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                      <tr>
                        <th className="p-3">Colaborador / Matrícula</th>
                        <th className="p-3">Chave</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Validade</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {licencasFiltradas.length > 0 ? (
                        licencasFiltradas.map((item) => {
                          const colab = item.colaboradores || {};
                          const dataVal = new Date(item.data_validade).toLocaleDateString('pt-BR');
                          const vencida = new Date(item.data_validade) < new Date();

                          return (
                            <tr key={item.id} className="hover:bg-slate-700/30">
                              <td className="p-3">
                                <div className="font-semibold text-white">{colab.nome || 'Sem Nome'}</div>
                                <div className="text-xs text-slate-400">Mat: {colab.matricula || 'N/A'}</div>
                              </td>
                              <td className="p-3 font-mono text-blue-400">{item.chave}</td>
                              <td className="p-3 capitalize">{item.tipo || 'mensal'}</td>
                              <td className="p-3">{dataVal}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  vencida ? 'bg-rose-950 text-rose-300 border border-rose-500/30' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {vencida ? 'Expirada' : (item.status || 'Ativa')}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center p-6 text-slate-400">Nenhuma licença encontrada.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {resultado && abaAtiva !== 'lista' && (
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