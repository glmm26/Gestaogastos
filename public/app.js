const telaSplash = document.getElementById('tela-splash');
const telaAutenticacao = document.getElementById('tela-autenticacao');
const telaVerificacao = document.getElementById('tela-verificacao');
const telaHome = document.getElementById('tela-home');
const botaoEntrarApp = document.getElementById('botao-entrar-app');
const barraProgressoSplash = document.getElementById('barra-progresso-splash');
const API_BASE_URL = (
  window.GESTAO_GASTOS_API_URL ||
  (window.Capacitor || window.location.protocol === 'capacitor:' ? 'http://172.18.40.13:3000' : '')
).replace(/\/$/, '');

const abaCadastro = document.getElementById('aba-cadastro');
const abaLogin = document.getElementById('aba-login');
const formularioCadastro = document.getElementById('formulario-cadastro');
const formularioLogin = document.getElementById('formulario-login');
const botaoEnviarCadastro = document.getElementById('botao-cadastro');
const botaoEnviarLogin = document.getElementById('botao-login');
const formularioVerificacaoEmail = document.getElementById('formulario-verificacao-email');
const mensagemAutenticacao = document.getElementById('mensagem-autenticacao');
const mensagemVerificacao = document.getElementById('mensagem-verificacao');
const campoEmailVerificacao = document.getElementById('email-verificacao');
const digitosOtp = Array.from(document.querySelectorAll('.digito-otp'));
const botaoVoltarLogin = document.getElementById('voltar-login');
const canvasParticulasAutenticacao = document.getElementById('particulas-autenticacao');

const perfilUsuarioBarraLateral = document.getElementById('perfil-usuario-barra-lateral');
const fotoUsuarioBarraLateral = document.getElementById('foto-usuario-barra-lateral');
const nomeUsuarioBarraLateral = document.getElementById('nome-usuario-barra-lateral');
const botaoAbrirPaginaPerfil = document.getElementById('abrir-pagina-perfil');
const botaoLogout = document.getElementById('botao-sair');
const botaoAtualizarDados = document.getElementById('atualizar-dados');
const tituloSecao = document.getElementById('titulo-secao');
const botoesNavegacao = Array.from(document.querySelectorAll('.botao-navegacao'));
const secoesAplicacao = Array.from(document.querySelectorAll('.secao-aplicacao'));

const totalEntradas = document.getElementById('total-entradas');
const totalSaidas = document.getElementById('total-saidas');
const totalSaldo = document.getElementById('total-saldo');
const listaUltimasMovimentacoes = document.getElementById('lista-ultimas-movimentacoes');
const campoMesDashboard = document.getElementById('mes-dashboard');
const overlayBoasVindas = document.getElementById('overlay-boas-vindas');
const tituloBoasVindas = document.getElementById('titulo-boas-vindas');
const subtituloBoasVindas = document.getElementById('subtitulo-boas-vindas');
const saldoBoasVindas = document.getElementById('saldo-boas-vindas');
const gastoBoasVindas = document.getElementById('gasto-boas-vindas');
const insightBoasVindas = document.getElementById('insight-boas-vindas');
const botaoFecharBoasVindas = document.getElementById('fechar-overlay-boas-vindas');

const formularioMovimentacao = document.getElementById('formulario-movimentacao');
const mensagemMovimentacao = document.getElementById('mensagem-movimentacao');
const categoriaMovimentacao = document.getElementById('categoria-movimentacao');
const linhaCategoriaPersonalizada = document.getElementById('linha-categoria-personalizada');
const campoCategoriaPersonalizada = document.getElementById('campo-categoria-personalizada');
const nomeNovaCategoria = document.getElementById('nome-nova-categoria');
const botaoAdicionarCategoria = document.getElementById('botao-adicionar-categoria');
const botaoSalvarMovimentacao = document.getElementById('botao-salvar-movimentacao');
const botaoCancelarEdicaoMovimentacao = document.getElementById('botao-cancelar-edicao-movimentacao');

const formularioFiltros = document.getElementById('formulario-filtros');
const botaoLimparFiltros = document.getElementById('botao-limpar-filtros');
const filtroTipo = document.getElementById('filtro-tipo');
const filtroCategoria = document.getElementById('filtro-categoria');
const filtroMes = document.getElementById('filtro-mes');
const filtroPeriodo = document.getElementById('filtro-periodo');
const filtroDataInicial = document.getElementById('filtro-data-inicial');
const filtroDataFinal = document.getElementById('filtro-data-final');
const listaMovimentacoes = document.getElementById('lista-movimentacoes');
const entradasFiltradas = document.getElementById('entradas-filtradas');
const saidasFiltradas = document.getElementById('saidas-filtradas');
const saldoFiltrado = document.getElementById('saldo-filtrado');
const quantidadeFiltrada = document.getElementById('quantidade-filtrada');

const formularioInvestimento = document.getElementById('formulario-investimento');
const mensagemInvestimento = document.getElementById('mensagem-investimento');
const totalInvestido = document.getElementById('total-investido');
const totalLucroPrejuizo = document.getElementById('total-lucro-prejuizo');
const totalValorAtual = document.getElementById('total-valor-atual');
const listaInvestimentos = document.getElementById('lista-investimentos');
const botaoSalvarInvestimento = document.getElementById('botao-salvar-investimento');
const botaoCancelarEdicaoInvestimento = document.getElementById('botao-cancelar-edicao-investimento');
const painelDetalhesInvestimento = document.getElementById('painel-detalhes-investimento');
const perfilInvestimentoSelecionado = document.getElementById('perfil-investimento-selecionado');
const valorInvestimentoSelecionado = document.getElementById('valor-investimento-selecionado');
const textoAnosInvestimentoSelecionado = document.getElementById('anos-investimento-selecionado');
const projecaoInvestimentoSelecionado = document.getElementById('projecao-investimento-selecionado');
const campoValorInvestimento = document.getElementById('valor-investimento');
const botoesPerfilRisco = Array.from(document.querySelectorAll('[data-perfil-risco]'));
const botoesAnosInvestimento = Array.from(document.querySelectorAll('[data-anos-investimento]'));
const ajudaPerfilRisco = document.getElementById('ajuda-perfil-risco');
const tituloInvestimento = document.getElementById('titulo-investimento');
const subtituloInvestimento = document.getElementById('subtitulo-investimento');
const formularioMeta = document.getElementById('formulario-meta');
const mensagemMeta = document.getElementById('mensagem-meta');
const botaoSalvarMeta = document.getElementById('botao-salvar-meta');
const botaoCancelarEdicaoMeta = document.getElementById('botao-cancelar-edicao-meta');
const filtroStatusMeta = document.getElementById('filtro-status-meta');
const formularioFiltrosMeta = document.getElementById('formulario-filtros-meta');
const botaoLimparFiltrosMeta = document.getElementById('botao-limpar-filtros-meta');
const listaMetas = document.getElementById('lista-metas');
const quantidadeTotalMetas = document.getElementById('quantidade-total-metas');
const quantidadeMetasConcluidas = document.getElementById('quantidade-metas-concluidas');
const quantidadeMetasNaoConcluidas = document.getElementById('quantidade-metas-nao-concluidas');
const tituloMetas = document.getElementById('titulo-metas');
const subtituloMetas = document.getElementById('subtitulo-metas');
const formularioImposto = document.getElementById('formulario-imposto');
const botaoLimparFormularioImposto = document.getElementById('botao-limpar-formulario-imposto');
const mensagemImposto = document.getElementById('mensagem-imposto');
const rendaAnualImposto = document.getElementById('renda-anual-imposto');
const rendaBaseImposto = document.getElementById('renda-base-imposto');
const faixaImposto = document.getElementById('faixa-imposto');
const impostoEstimado = document.getElementById('imposto-estimado');
const rendaLiquidaImposto = document.getElementById('renda-liquida-imposto');
const valorDestaqueImposto = document.getElementById('valor-destaque-imposto');
const feedbackPrimarioImposto = document.getElementById('feedback-primario-imposto');
const feedbackSecundarioImposto = document.getElementById('feedback-secundario-imposto');
const sugestoesImposto = document.getElementById('sugestoes-imposto');
const painelResultadosImposto = document.getElementById('painel-resultados-imposto');
const painelInsightsImposto = document.getElementById('painel-insights-imposto');
const painelGraficoImposto = document.getElementById('painel-grafico-imposto');
const modalAvisoImposto = document.getElementById('modal-aviso-imposto');
const caixaOcultarAvisoImposto = document.getElementById('ocultar-aviso-imposto');
const botaoContinuarAvisoImposto = document.getElementById('botao-continuar-aviso-imposto');
const botaoVoltarAvisoImposto = document.getElementById('botao-voltar-aviso-imposto');
const botaoAbrirDicasImposto = document.getElementById('botao-abrir-dicas-imposto');
const modalDicasImposto = document.getElementById('modal-dicas-imposto');
const botaoFecharDicasImposto = document.getElementById('botao-fechar-dicas-imposto');
const modalProgressoMeta = document.getElementById('modal-progresso-meta');
const formularioProgressoMeta = document.getElementById('formulario-progresso-meta');
const campoValorProgressoMeta = document.getElementById('valor-progresso-meta');
const tituloModalProgressoMeta = document.getElementById('titulo-modal-progresso-meta');
const textoModalProgressoMeta = document.getElementById('texto-modal-progresso-meta');
const valorPreviaProgressoMeta = document.getElementById('valor-previa-progresso-meta');
const botaoSalvarProgressoMeta = document.getElementById('botao-salvar-progresso-meta');
const botaoCancelarProgressoMeta = document.getElementById('botao-cancelar-progresso-meta');
const modalConfirmacaoAcao = document.getElementById('modal-confirmacao-acao');
const sobretituloConfirmacaoAcao = document.getElementById('sobretitulo-confirmacao-acao');
const tituloConfirmacaoAcao = document.getElementById('titulo-confirmacao-acao');
const textoConfirmacaoAcao = document.getElementById('texto-confirmacao-acao');
const botaoConfirmarAcao = document.getElementById('botao-confirmar-acao');
const botaoCancelarConfirmacao = document.getElementById('botao-cancelar-confirmacao');

const formularioRelatorio = document.getElementById('formulario-relatorio');
const campoMesRelatorio = document.getElementById('mes-relatorio');
const mensagemRelatorio = document.getElementById('mensagem-relatorio');
const botaoExportarRelatorio = document.getElementById('botao-exportar-relatorio');
const botaoExportarRelatorioPdf = document.getElementById('botao-exportar-relatorio-pdf');
const historicoRelatorios = document.getElementById('historico-relatorios');
const tituloRelatorio = document.getElementById('titulo-relatorio');
const entradaRelatorio = document.getElementById('entrada-relatorio');
const saidaRelatorio = document.getElementById('saida-relatorio');
const saldoRelatorio = document.getElementById('saldo-relatorio');
const quantidadeMovimentacoesRelatorio = document.getElementById('quantidade-movimentacoes-relatorio');
const categoriasPrincipaisRelatorio = document.getElementById('categorias-principais-relatorio');
const insightsRelatorio = document.getElementById('insights-relatorio');

let emailVerificacaoPendente = '';
let emailUsuarioAtual = '';
let nomeUsuarioAtual = '';
let cacheCategorias = [];
let mesDashboardSelecionado = new Date().toISOString().slice(0, 7);
let mesRelatorioSelecionado = new Date().toISOString().slice(0, 7);
let idMovimentacaoEdicao = null;
let idInvestimentoEdicao = null;
let idMetaEdicao = null;
let idVisualizacaoInvestimento = null;
let perfilRiscoSelecionado = 'low';
let anosInvestimentoSelecionados = 3;
let secaoPendenteAposAviso = null;
let progressoMetaPendente = null;
let resolvedorConfirmacaoPendente = null;
const instanciasGraficos = {};
let idAnimacaoParticulasAuth = null;
let estadoParticulasAuth = null;
let idTemporizadorSplash = null;
let inicioSplash = 0;
let idAnimacaoProgressoSplash = null;
let idTemporizadorBoasVindas = null;
let deveExibirBoasVindas = false;
let idUltimaMetaCelebrada = null;

const DURACAO_SPLASH_MS = 10000;

const CHAVE_ARMAZENAMENTO_AVISO_IMPOSTO = 'ocultarAvisoImposto';
const CHAVE_ARMAZENAMENTO_SESSAO = 'gestaoGastosSessao';
const DEDUCAO_DEPENDENTE = 2275.08;

const PERFIS_RISCO = {
  low: {
    label: 'Baixo risco',
    annualRate: 8,
    help: 'Baixo risco: pensado para quem prefere mais estabilidade. Exemplos: Tesouro Selic, CDB com liquidez diária e contas remuneradas. Estimativa de 8% ao ano.',
    examples: 'Tesouro Selic, CDB com liquidez diária e contas remuneradas',
  },
  medium: {
    label: 'Médio risco',
    annualRate: 12,
    help: 'Médio risco: equilíbrio entre segurança e crescimento. Exemplos: fundos multimercado, ETFs amplos e carteira mista. Estimativa de 12% ao ano.',
    examples: 'fundos multimercado, ETFs amplos e carteira mista',
  },
  high: {
    label: 'Alto risco',
    annualRate: 18,
    help: 'Alto risco: mais oscilação em troca de maior potencial. Exemplos: ações, fundos de ações e criptos para quem aceita variação maior. Estimativa de 18% ao ano.',
    examples: 'ações, fundos de ações e criptos',
  },
};

function showMessage(element, text, type = '') {
  element.textContent = text;
  element.className = type ? `mensagem-status ${type}` : 'mensagem-status';
}

function showAuthMessage(text, type = '') {
  showMessage(mensagemAutenticacao, text, type);
}

function showVerifyMessage(text, type = '') {
  showMessage(mensagemVerificacao, text, type);
}

function showTransactionMessage(text, type = '') {
  showMessage(mensagemMovimentacao, text, type);
}

function showInvestmentMessage(text, type = '') {
  showMessage(mensagemInvestimento, text, type);
}

function showReportMessage(text, type = '') {
  showMessage(mensagemRelatorio, text, type);
}

function showTaxMessage(text, type = '') {
  showMessage(mensagemImposto, text, type);
}

function showGoalMessage(text, type = '') {
  showMessage(mensagemMeta, text, type);
}

function showScreen(screen) {
  [telaSplash, telaAutenticacao, telaVerificacao, telaHome].forEach((item) => item.classList.add('oculto'));
  screen.classList.remove('oculto');
  toggleAuthParticles(screen === telaAutenticacao);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function formatDate(dateString) {
  if (!dateString) return '--';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${dateString}T00:00:00`));
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function setButtonLoading(button, isLoading, loadingText) {
  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent;
  }
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : button.dataset.defaultText;
}

function saveSession(session) {
  window.localStorage.setItem(CHAVE_ARMAZENAMENTO_SESSAO, JSON.stringify(session));
}

function readSession() {
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE_ARMAZENAMENTO_SESSAO) || 'null');
  } catch (error) {
    return null;
  }
}

function clearSession() {
  window.localStorage.removeItem(CHAVE_ARMAZENAMENTO_SESSAO);
}

function montarUrlFotoBarraLateral(foto) {
  if (!foto) return '/avatar-default.svg';
  if (foto.includes('?')) return foto;
  return `${foto}?t=${Date.now()}`;
}

function atualizarPerfilBarraLateral(usuario = {}) {
  const nome = usuario.name || nomeUsuarioAtual || 'Usuario';
  const foto = montarUrlFotoBarraLateral(usuario.foto || usuario.photo || readSession()?.foto || '');
  nomeUsuarioAtual = usuario.name || nomeUsuarioAtual;
  emailUsuarioAtual = usuario.email || emailUsuarioAtual;
  nomeUsuarioBarraLateral.textContent = nome;
  fotoUsuarioBarraLateral.src = foto;
}

async function carregarPerfilBarraLateral() {
  if (!emailUsuarioAtual) return;
  const dados = await apiFetch(`/perfil?email=${encodeURIComponent(emailUsuarioAtual)}`);
  atualizarPerfilBarraLateral({
    name: dados.name,
    email: dados.email,
    foto: dados.foto,
  });
  const sessao = readSession() || {};
  saveSession({ ...sessao, name: dados.name, email: dados.email, foto: dados.foto });
}

function hideWelcomeOverlay() {
  if (idTemporizadorBoasVindas) {
    window.clearTimeout(idTemporizadorBoasVindas);
    idTemporizadorBoasVindas = null;
  }
  overlayBoasVindas.classList.add('oculto');
}

function showWelcomeOverlay(data, userName) {
  const displayName = userName || emailUsuarioAtual || 'Usuário';
  tituloBoasVindas.textContent = `Bem-vindo, ${displayName}`;
  subtituloBoasVindas.textContent = `Resumo rápido de ${data.label || 'seu mês atual'}.`;
  saldoBoasVindas.textContent = formatCurrency(data.summary?.balance || 0);
  gastoBoasVindas.textContent = formatCurrency(data.welcome?.totalExpenses || data.summary?.expense || 0);
  insightBoasVindas.textContent = data.welcome?.insight || 'Seu painel já está atualizado.';
  overlayBoasVindas.classList.remove('oculto');
  if (idTemporizadorBoasVindas) {
    window.clearTimeout(idTemporizadorBoasVindas);
  }
  idTemporizadorBoasVindas = window.setTimeout(() => {
    hideWelcomeOverlay();
  }, 2600);
}

function openAuth() {
  if (idTemporizadorSplash) {
    window.clearTimeout(idTemporizadorSplash);
    idTemporizadorSplash = null;
  }
  if (idAnimacaoProgressoSplash) {
    window.cancelAnimationFrame(idAnimacaoProgressoSplash);
    idAnimacaoProgressoSplash = null;
  }
  if (barraProgressoSplash) {
    barraProgressoSplash.style.width = '100%';
  }
  showScreen(telaAutenticacao);
}

function updateSplashProgress() {
  const elapsed = Date.now() - inicioSplash;
  const progress = Math.min(elapsed / DURACAO_SPLASH_MS, 1);
  barraProgressoSplash.style.width = `${progress * 100}%`;

  if (progress >= 1) {
    idAnimacaoProgressoSplash = null;
    return;
  }

  idAnimacaoProgressoSplash = window.requestAnimationFrame(updateSplashProgress);
}

function startSplashTimer() {
  inicioSplash = Date.now();
  barraProgressoSplash.style.width = '0%';
  if (idAnimacaoProgressoSplash) {
    window.cancelAnimationFrame(idAnimacaoProgressoSplash);
  }
  idAnimacaoProgressoSplash = window.requestAnimationFrame(updateSplashProgress);
  idTemporizadorSplash = window.setTimeout(() => {
    idTemporizadorSplash = null;
    openAuth();
  }, DURACAO_SPLASH_MS);
}

function createAuthParticlesState() {
  const ctx = canvasParticulasAutenticacao.getContext('2d');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCompactScreen = window.innerWidth < 768;
  const particleCount = prefersReducedMotion ? 16 : isCompactScreen ? 24 : 42;

  return {
    ctx,
    particles: Array.from({ length: particleCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() * 2.2 + 1,
      speedX: (Math.random() - 0.5) * (prefersReducedMotion ? 0.00008 : 0.00018),
      speedY: (Math.random() - 0.5) * (prefersReducedMotion ? 0.00008 : 0.00018),
      opacity: Math.random() * 0.35 + 0.08,
    })),
    pointer: { x: 0.5, y: 0.5, active: false },
    prefersReducedMotion,
  };
}

function resizeAuthParticlesCanvas() {
  if (!canvasParticulasAutenticacao) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
  canvasParticulasAutenticacao.width = Math.floor(telaAutenticacao.clientWidth * ratio);
  canvasParticulasAutenticacao.height = Math.floor(telaAutenticacao.clientHeight * ratio);
  canvasParticulasAutenticacao.style.width = `${telaAutenticacao.clientWidth}px`;
  canvasParticulasAutenticacao.style.height = `${telaAutenticacao.clientHeight}px`;
  if (estadoParticulasAuth?.ctx) {
    estadoParticulasAuth.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
}

function drawAuthParticles() {
  if (!estadoParticulasAuth || telaAutenticacao.classList.contains('oculto')) return;
  const { ctx, particles, pointer, prefersReducedMotion } = estadoParticulasAuth;
  const width = telaAutenticacao.clientWidth;
  const height = telaAutenticacao.clientHeight;

  ctx.clearRect(0, 0, width, height);

  particles.forEach((particle) => {
    const pointerOffsetX = prefersReducedMotion || !pointer.active ? 0 : (pointer.x - 0.5) * 0.3;
    const pointerOffsetY = prefersReducedMotion || !pointer.active ? 0 : (pointer.y - 0.5) * 0.3;

    particle.x += particle.speedX + pointerOffsetX * 0.0008;
    particle.y += particle.speedY + pointerOffsetY * 0.0008;

    if (particle.x < -0.05) particle.x = 1.05;
    if (particle.x > 1.05) particle.x = -0.05;
    if (particle.y < -0.05) particle.y = 1.05;
    if (particle.y > 1.05) particle.y = -0.05;

    const x = particle.x * width;
    const y = particle.y * height;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, particle.radius * 7);
    glow.addColorStop(0, `rgba(148, 163, 184, ${particle.opacity})`);
    glow.addColorStop(0.55, `rgba(56, 189, 248, ${particle.opacity * 0.42})`);
    glow.addColorStop(1, 'rgba(9, 20, 38, 0)');

    ctx.beginPath();
    ctx.fillStyle = glow;
    ctx.arc(x, y, particle.radius * 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = `rgba(226, 232, 240, ${particle.opacity * 0.9})`;
    ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  idAnimacaoParticulasAuth = window.requestAnimationFrame(drawAuthParticles);
}

function startAuthParticles() {
  if (!canvasParticulasAutenticacao || idAnimacaoParticulasAuth !== null) return;
  estadoParticulasAuth = createAuthParticlesState();
  resizeAuthParticlesCanvas();
  drawAuthParticles();
}

function stopAuthParticles() {
  if (idAnimacaoParticulasAuth !== null) {
    window.cancelAnimationFrame(idAnimacaoParticulasAuth);
    idAnimacaoParticulasAuth = null;
  }
}

function toggleAuthParticles(shouldRun) {
  if (shouldRun) {
    startAuthParticles();
    return;
  }
  stopAuthParticles();
}

function hideAuthForms() {
  formularioCadastro.classList.remove('ativo');
  formularioCadastro.classList.add('oculto');
  formularioLogin.classList.remove('ativo');
  formularioLogin.classList.add('oculto');
}

function showRegister() {
  abaCadastro.classList.add('ativo');
  abaLogin.classList.remove('ativo');
  hideAuthForms();
  formularioCadastro.classList.remove('oculto');
  formularioCadastro.classList.add('ativo');
  showAuthMessage('');
}

function showLogin() {
  abaLogin.classList.add('ativo');
  abaCadastro.classList.remove('ativo');
  hideAuthForms();
  formularioLogin.classList.remove('oculto');
  formularioLogin.classList.add('ativo');
  showAuthMessage('');
}

function clearOtpInputs() {
  digitosOtp.forEach((input) => {
    input.value = '';
  });
}

function getOtpCode() {
  return digitosOtp.map((input) => input.value).join('');
}

function showVerifyEmail(email) {
  emailVerificacaoPendente = email;
  campoEmailVerificacao.value = email;
  clearOtpInputs();
  showVerifyMessage('Digite o código de 6 dígitos para confirmar o cadastro.', 'success');
  showScreen(telaVerificacao);
  digitosOtp[0].focus();
}

function setActiveSection(sectionId) {
  secoesAplicacao.forEach((section) => {
    section.classList.toggle('oculto', section.id !== sectionId);
  });

  botoesNavegacao.forEach((button) => {
    const estaAtivo = button.dataset.section === sectionId;
    button.classList.toggle('ativo', estaAtivo);
    if (estaAtivo) tituloSecao.textContent = button.textContent;
  });
}

function hideTaxWarningModal() {
  modalAvisoImposto.classList.add('oculto');
}

function showTaxWarningModal() {
  caixaOcultarAvisoImposto.checked = getTaxWarningHiddenPreference();
  modalAvisoImposto.classList.remove('oculto');
}

function hideTaxTipsModal() {
  modalDicasImposto.classList.add('oculto');
}

function showTaxTipsModal() {
  modalDicasImposto.classList.remove('oculto');
}

function updateGoalProgressPreview() {
  const baseAmount = progressoMetaPendente?.currentAmount || 0;
  const increment = Number(campoValorProgressoMeta.value || 0);
  const nextTotal = Number.isFinite(increment) && increment > 0 ? baseAmount + increment : baseAmount;
  valorPreviaProgressoMeta.textContent = formatCurrency(nextTotal);
}

function hideGoalProgressModal() {
  progressoMetaPendente = null;
  formularioProgressoMeta.reset();
  valorPreviaProgressoMeta.textContent = formatCurrency(0);
  modalProgressoMeta.classList.add('oculto');
}

function showGoalProgressModal(goal) {
  progressoMetaPendente = goal;
  tituloModalProgressoMeta.textContent = `Adicionar valor em ${goal.name}`;
  textoModalProgressoMeta.textContent = `Informe quanto deseja adicionar ao progresso da meta "${goal.name}".`;
  campoValorProgressoMeta.value = '';
  valorPreviaProgressoMeta.textContent = formatCurrency(goal.currentAmount);
  modalProgressoMeta.classList.remove('oculto');
  window.setTimeout(() => campoValorProgressoMeta.focus(), 20);
}

function hideConfirmActionModal(confirmed = false) {
  const resolver = resolvedorConfirmacaoPendente;
  resolvedorConfirmacaoPendente = null;
  modalConfirmacaoAcao.classList.add('oculto');
  if (resolver) resolver(confirmed);
}

function requestConfirmAction({
  eyebrow = 'CONFIRMAR AÇÃO',
  title = 'Tem certeza?',
  text = 'Revise a ação antes de continuar.',
  confirmText = 'Confirmar',
} = {}) {
  sobretituloConfirmacaoAcao.textContent = eyebrow;
  tituloConfirmacaoAcao.textContent = title;
  textoConfirmacaoAcao.textContent = text;
  botaoConfirmarAcao.textContent = confirmText;
  modalConfirmacaoAcao.classList.remove('oculto');

  return new Promise((resolve) => {
    resolvedorConfirmacaoPendente = resolve;
  });
}

function getTaxWarningHiddenPreference() {
  return window.localStorage.getItem(CHAVE_ARMAZENAMENTO_AVISO_IMPOSTO) === 'true';
}

function saveTaxWarningPreference() {
  if (caixaOcultarAvisoImposto.checked) {
    window.localStorage.setItem(CHAVE_ARMAZENAMENTO_AVISO_IMPOSTO, 'true');
    return;
  }
  window.localStorage.removeItem(CHAVE_ARMAZENAMENTO_AVISO_IMPOSTO);
}

function openTaxesSection() {
  setActiveSection('secao-impostos');
}

function applyDefaultTransactionFilters() {
  formularioFiltros.reset();
  filtroMes.value = getCurrentMonthKey();
  filtroPeriodo.value = 'all';
  filtroDataInicial.value = '';
  filtroDataFinal.value = '';
}

function resetGoalForm() {
  formularioMeta.reset();
  document.getElementById('valor-atual-meta').value = 0;
  idMetaEdicao = null;
  botaoSalvarMeta.textContent = 'Salvar meta';
  botaoCancelarEdicaoMeta.classList.add('oculto');
}

function formatGoalStatus(status) {
  if (status === 'completed') return 'Meta concluída';
  if (status === 'failed') return 'Meta não concluída';
  return 'Em andamento';
}

function getGoalStatusClass(status) {
  if (status === 'completed') return 'status-concluido';
  if (status === 'failed') return 'status-nao-concluido';
  return 'status-em-andamento';
}

function openSectionWithGuard(sectionId) {
  if (sectionId !== 'secao-impostos') {
    secaoPendenteAposAviso = null;
    hideTaxWarningModal();
    setActiveSection(sectionId);
    return;
  }

  if (getTaxWarningHiddenPreference()) {
    secaoPendenteAposAviso = null;
    hideTaxWarningModal();
    openTaxesSection();
    return;
  }

  secaoPendenteAposAviso = sectionId;
  showTaxWarningModal();
}

function showHome(userOrEmail) {
  if (idTemporizadorSplash) {
    window.clearTimeout(idTemporizadorSplash);
    idTemporizadorSplash = null;
  }
  if (idAnimacaoProgressoSplash) {
    window.cancelAnimationFrame(idAnimacaoProgressoSplash);
    idAnimacaoProgressoSplash = null;
  }
  const user = typeof userOrEmail === 'string' ? { email: userOrEmail } : userOrEmail;
  emailUsuarioAtual = user.email;
  nomeUsuarioAtual = user.name || '';
  atualizarPerfilBarraLateral({
    name: user.name,
    email: user.email,
    foto: user.foto || user.photo || readSession()?.foto,
  });
  showScreen(telaHome);
  setActiveSection('secao-dashboard');
  mesDashboardSelecionado = getCurrentMonthKey();
  campoMesDashboard.value = mesDashboardSelecionado;
  resetTransactionForm();
  resetInvestmentForm();
  applyDefaultTransactionFilters();
  campoMesRelatorio.value = mesRelatorioSelecionado;
  loadAllData();
}

function destroyChart(key) {
  if (instanciasGraficos[key]) {
    instanciasGraficos[key].destroy();
    delete instanciasGraficos[key];
  }
}

function renderChart(key, canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  destroyChart(key);
  instanciasGraficos[key] = new Chart(canvas, config);
}

function renderList(container, items, emptyText, renderer) {
  container.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${emptyText}</span><strong>--</strong>`;
    container.appendChild(li);
    return;
  }
  items.forEach((item) => container.appendChild(renderer(item)));
}

function setTransactionEditMode(item = null) {
  idMovimentacaoEdicao = item ? item.id : null;
  botaoSalvarMovimentacao.textContent = item ? 'Salvar alterações' : 'Salvar movimentação';
  botaoCancelarEdicaoMovimentacao.classList.toggle('oculto', !item);
}

function setInvestmentEditMode(item = null) {
  idInvestimentoEdicao = item ? item.id : null;
  botaoSalvarInvestimento.textContent = item ? 'Salvar alterações' : 'Salvar simulação';
  botaoCancelarEdicaoInvestimento.classList.toggle('oculto', !item);
}

function resetTransactionForm() {
  formularioMovimentacao.reset();
  document.getElementById('data-movimentacao').value = new Date().toISOString().slice(0, 10);
  linhaCategoriaPersonalizada.classList.add('oculto');
  campoCategoriaPersonalizada.value = '';
  setTransactionEditMode();
}

function resetInvestmentForm() {
  formularioInvestimento.reset();
  perfilRiscoSelecionado = 'low';
  anosInvestimentoSelecionados = 3;
  syncInvestmentChoices();
  updateInvestmentPreview();
  setInvestmentEditMode();
}

function calculateInvestmentProjection(monthlyAmount, annualRate, years) {
  const parsedAmount = Number(monthlyAmount) > 0 ? Number(monthlyAmount) : 0;
  const parsedYears = Number(years) > 0 ? Number(years) : 1;
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  const totalMonths = parsedYears * 12;
  let total = 0;

  for (let month = 1; month <= totalMonths; month += 1) {
    total = (total + parsedAmount) * (1 + monthlyRate);
  }

  const invested = Number((parsedAmount * totalMonths).toFixed(2));
  return {
    invested,
    projectedValue: Number(total.toFixed(2)),
    gain: Number((total - invested).toFixed(2)),
  };
}

function syncInvestmentChoices() {
  botoesPerfilRisco.forEach((button) => {
    button.classList.toggle('ativo', button.dataset.perfilRisco === perfilRiscoSelecionado);
  });
  botoesAnosInvestimento.forEach((button) => {
    button.classList.toggle('ativo', Number(button.dataset.anosInvestimento) === anosInvestimentoSelecionados);
  });
  ajudaPerfilRisco.textContent = PERFIS_RISCO[perfilRiscoSelecionado].help;
}

function updateInvestmentPreview() {
  const monthlyAmount = Number(campoValorInvestimento.value || 0);
  const profile = PERFIS_RISCO[perfilRiscoSelecionado];
  const projection = calculateInvestmentProjection(monthlyAmount, profile.annualRate, anosInvestimentoSelecionados);

  tituloInvestimento.textContent = `Seu dinheiro pode crescer para ${formatCurrency(projection.projectedValue)} em ${anosInvestimentoSelecionados} ano${anosInvestimentoSelecionados > 1 ? 's' : ''}.`;
  subtituloInvestimento.textContent = monthlyAmount > 0
    ? `Investindo ${formatCurrency(monthlyAmount)} por mês, você pode juntar ${formatCurrency(projection.invested)} e buscar um crescimento estimado de ${formatCurrency(projection.gain)}. Para esse perfil, exemplos comuns seriam ${profile.examples}.`
    : `Investindo pouco por mês você já começa a construir resultado. Para esse perfil, exemplos comuns seriam ${profile.examples}.`;
}

function readMoneyInput(id) {
  return Number(document.getElementById(id).value || 0);
}

function calculateTaxes() {
  const monthlyIncome = readMoneyInput('renda-mensal-imposto');
  const otherIncome = readMoneyInput('outras-rendas-imposto');
  const dependents = Math.max(0, Number(document.getElementById('dependentes-imposto').value || 0));
  const healthExpenses = readMoneyInput('saude-imposto');
  const educationExpenses = readMoneyInput('educacao-imposto');
  const annualIncome = monthlyIncome * 12 + otherIncome;
  const deductions = dependents * DEDUCAO_DEPENDENTE + healthExpenses + educationExpenses;
  const baseIncome = Math.max(0, annualIncome - deductions);

  let rate = 0;
  let bracketLabel = 'Isento';

  if (baseIncome <= 22847) {
    rate = 0;
    bracketLabel = 'Isento';
  } else if (baseIncome <= 33919) {
    rate = 7.5;
    bracketLabel = 'Ate R$ 33.919';
  } else if (baseIncome <= 45012) {
    rate = 15;
    bracketLabel = 'Ate R$ 45.012';
  } else {
    rate = 27.5;
    bracketLabel = 'Acima de R$ 45.012';
  }

  const estimatedTax = Number((baseIncome * (rate / 100)).toFixed(2));
  const netIncome = Number((annualIncome - estimatedTax).toFixed(2));
  const taxPercentOfIncome = annualIncome > 0 ? Number(((estimatedTax / annualIncome) * 100).toFixed(1)) : 0;
  const netPercentOfIncome = annualIncome > 0 ? Number(((netIncome / annualIncome) * 100).toFixed(1)) : 0;

  return {
    annualIncome: Number(annualIncome.toFixed(2)),
    baseIncome: Number(baseIncome.toFixed(2)),
    deductions: Number(deductions.toFixed(2)),
    rate,
    bracketLabel,
    estimatedTax,
    netIncome,
    taxPercentOfIncome,
    netPercentOfIncome,
  };
}

function buildTaxSuggestions(result, input) {
  const suggestions = [];

  if (input.healthExpenses <= 0) {
    suggestions.push('Você pode reduzir seu imposto declarando despesas médicas, se tiver comprovantes.');
  }

  if (input.dependents <= 0) {
    suggestions.push('Adicionar dependentes pode diminuir o imposto quando isso fizer sentido na sua declaração.');
  }

  if (input.healthExpenses + input.educationExpenses < result.annualIncome * 0.05) {
    suggestions.push('Seus gastos dedutíveis estão baixos. Vale revisar saúde e educação para não esquecer nada.');
  }

  if (result.rate >= 15) {
    suggestions.push('Você está pagando imposto elevado em relação à sua renda. Organizar deduções pode ajudar.');
  }

  if (!suggestions.length) {
    suggestions.push('Sua simulação está equilibrada. Continue organizando comprovantes para declarar tudo corretamente.');
  }

  return suggestions.slice(0, 4);
}

function renderTaxSimulation(result) {
  const input = {
    dependents: Math.max(0, Number(document.getElementById('dependentes-imposto').value || 0)),
    healthExpenses: readMoneyInput('saude-imposto'),
    educationExpenses: readMoneyInput('educacao-imposto'),
  };
  const suggestions = buildTaxSuggestions(result, input);

  painelResultadosImposto.classList.remove('oculto');
  painelInsightsImposto.classList.remove('oculto');
  rendaAnualImposto.textContent = formatCurrency(result.annualIncome);
  rendaBaseImposto.textContent = formatCurrency(result.baseIncome);
  faixaImposto.textContent = result.bracketLabel;
  impostoEstimado.textContent = formatCurrency(result.estimatedTax);
  rendaLiquidaImposto.textContent = formatCurrency(result.netIncome);
  valorDestaqueImposto.textContent = formatCurrency(result.estimatedTax);

  if (result.rate === 0) {
    feedbackPrimarioImposto.textContent = 'Você está isento de imposto.';
    feedbackSecundarioImposto.textContent = 'Pela estimativa simplificada, hoje você não teria imposto a pagar.';
  } else if (result.rate >= 27.5) {
    feedbackPrimarioImposto.textContent = 'Você está na faixa mais alta de imposto (27,5%).';
    feedbackSecundarioImposto.textContent = 'Você já paga um valor considerável de imposto.';
  } else if (result.rate >= 15) {
    feedbackPrimarioImposto.textContent = 'Você está em uma faixa intermediária de imposto.';
    feedbackSecundarioImposto.textContent = 'Sua alíquota já merece atenção para não perder deduções importantes.';
  } else {
    feedbackPrimarioImposto.textContent = `Sua alíquota é ${result.rate.toFixed(1)}%.`;
    feedbackSecundarioImposto.textContent = 'Você está em uma faixa menor, mas ainda pode melhorar sua declaração com deduções.';
  }

  sugestoesImposto.innerHTML = '';
  suggestions.forEach((suggestion) => {
    const li = document.createElement('li');
    li.textContent = suggestion;
    sugestoesImposto.appendChild(li);
  });
  sugestoesImposto.classList.remove('oculto');

  renderChart('taxSummary', 'grafico-imposto', {
    type: 'bar',
    data: {
      labels: [
        'Renda total (100%)',
        `Imposto (${result.taxPercentOfIncome}%)`,
        `Valor liquido (${result.netPercentOfIncome}%)`,
      ],
      datasets: [
        {
          label: 'Estimativa',
          data: [result.annualIncome, result.estimatedTax, result.netIncome],
          backgroundColor: ['#38bdf8', '#ef4444', '#22c55e'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      ...chartBaseOptions(),
      scales: {
        x: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
        y: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
      },
    },
  });
}

function resetTaxSimulation() {
  formularioImposto.reset();
  document.getElementById('dependentes-imposto').value = 0;
  painelResultadosImposto.classList.add('oculto');
  painelInsightsImposto.classList.add('oculto');
  rendaAnualImposto.textContent = formatCurrency(0);
  rendaBaseImposto.textContent = formatCurrency(0);
  faixaImposto.textContent = 'Isento';
  impostoEstimado.textContent = formatCurrency(0);
  rendaLiquidaImposto.textContent = formatCurrency(0);
  valorDestaqueImposto.textContent = formatCurrency(0);
  feedbackPrimarioImposto.textContent = 'Você está isento.';
  feedbackSecundarioImposto.textContent = 'Preencha os campo para ver sua estimativa.';
  sugestoesImposto.innerHTML = '';
  sugestoesImposto.classList.add('oculto');
  showTaxMessage('');
  renderChart('taxSummary', 'grafico-imposto', {
    type: 'bar',
    data: {
      labels: ['Renda total (100%)', 'Imposto (0%)', 'Valor liquido (0%)'],
      datasets: [
        {
          label: 'Estimativa',
          data: [0, 0, 0],
          backgroundColor: ['#38bdf8', '#ef4444', '#22c55e'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      ...chartBaseOptions(),
      scales: {
        x: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
        y: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
      },
    },
  });
}

function buildItemActions(onEdit, onDelete) {
  const actions = document.createElement('div');
  actions.className = 'acoes-item';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'botao-secundario';
  editButton.textContent = 'Editar';
  editButton.addEventListener('click', onEdit);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'botao-perigo';
  deleteButton.textContent = 'Excluir';
  deleteButton.addEventListener('click', onDelete);

  actions.appendChild(editButton);
  actions.appendChild(deleteButton);
  return actions;
}

function getInvestmentDetailAction(onView) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'botao-secundario';
  button.textContent = 'Ver detalhes';
  button.addEventListener('click', onView);
  return button;
}

function buildTransactionItem(item) {
  const li = document.createElement('li');
  const sign = item.type === 'income' ? '+' : '-';
  const cls = item.type === 'income' ? 'positivo' : 'negativo';
  const note = item.notes ? `<small>${item.notes}</small>` : '';
  li.innerHTML = `
    <div>
      <strong>${item.category}</strong>
      <span>${formatDate(item.date)} • ${item.type === 'income' ? 'Entrada' : 'Saida'}</span>
      ${note}
    </div>
    <div>
      <strong class="${cls}">${sign} ${formatCurrency(item.amount)}</strong>
    </div>
  `;
  li.lastElementChild.appendChild(
    buildItemActions(
      () => startTransactionEdit(item),
      () => deleteTransaction(item.id)
    )
  );
  return li;
}

function buildInvestmentItem(item) {
  const li = document.createElement('li');
  const resultValue = (item.amount * item.profitability) / 100;
  const cls = resultValue >= 0 ? 'positivo' : 'negativo';
  li.innerHTML = `
    <div>
      <strong>${item.type}</strong>
      <span>${formatDate(item.date)} • Rentabilidade ${item.profitability.toFixed(2)}%</span>
    </div>
    <div>
      <strong class="${cls}">${formatCurrency(item.amount + resultValue)}</strong>
    </div>
  `;
  li.lastElementChild.appendChild(
    buildItemActions(
      () => startInvestmentEdit(item),
      () => deleteInvestment(item.id)
    )
  );
  return li;
}

function buildInvestmentSimulationItem(item) {
  const li = document.createElement('li');
  li.classList.toggle('selecionado', item.id === idVisualizacaoInvestimento);
  li.innerHTML = `
    <div>
      <strong>${item.riskLabel}</strong>
      <span>${formatCurrency(item.monthlyAmount)} por mês • ${item.years} ano${item.years > 1 ? 's' : ''}</span>
      <small>Estimativa simples de ${item.annualRate}% ao ano</small>
    </div>
    <div>
      <strong class="positivo">${formatCurrency(item.projectedValue)}</strong>
      <small>Pode virar ${formatCurrency(item.projectedValue)}</small>
    </div>
  `;
  li.lastElementChild.appendChild(getInvestmentDetailAction(() => {
    idVisualizacaoInvestimento = item.id;
    renderInvestments(ultimoPayloadInvestimentos);
  }));
  li.lastElementChild.appendChild(
    buildItemActions(
      () => startInvestmentEdit(item),
      () => deleteInvestment(item.id)
    )
  );
  return li;
}

function startGoalEdit(item) {
  document.getElementById('nome-meta').value = item.name;
  document.getElementById('valor-alvo-meta').value = item.targetAmount;
  document.getElementById('valor-atual-meta').value = item.currentAmount;
  document.getElementById('prazo-meta').value = item.deadline;
  document.getElementById('categoria-meta').value = item.category || '';
  idMetaEdicao = item.id;
  botaoSalvarMeta.textContent = 'Salvar alterações';
  botaoCancelarEdicaoMeta.classList.remove('oculto');
  formularioMeta.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteGoal(id) {
  const confirmed = await requestConfirmAction({
    eyebrow: 'EXCLUIR META',
    title: 'Excluir esta meta?',
    text: 'Essa ação remove a meta da sua lista e não pode ser desfeita.',
    confirmText: 'Excluir meta',
  });
  if (!confirmed) return;

  try {
    const data = await apiFetch(`/api/goals/${id}?email=${encodeURIComponent(emailUsuarioAtual)}`, {
      method: 'DELETE',
    });
    if (idMetaEdicao === id) resetGoalForm();
    showGoalMessage(data.message, 'success');
    await loadGoals();
  } catch (error) {
    showGoalMessage(error.message, 'error');
  }
}

async function updateGoalStatus(goal, status) {
  try {
    const data = await apiFetch(`/api/goals/${goal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailUsuarioAtual,
        status,
      }),
    });
    idUltimaMetaCelebrada = status === 'completed' ? goal.id : null;
    showGoalMessage(data.message, 'success');
    await loadGoals();
  } catch (error) {
    showGoalMessage(error.message, 'error');
  }
}

async function addGoalProgress(goal) {
  const amount = Number(String(campoValorProgressoMeta.value).replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) {
    showGoalMessage('Digite um valor válido para somar à meta.', 'error');
    return;
  }

  try {
    const data = await apiFetch(`/api/goals/${goal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailUsuarioAtual,
        currentAmount: Number((goal.currentAmount + amount).toFixed(2)),
      }),
    });
    hideGoalProgressModal();
    showGoalMessage(data.message, 'success');
    await loadGoals();
  } catch (error) {
    showGoalMessage(error.message, 'error');
  }
}

function buildGoalCard(goal) {
  const card = document.createElement('article');
  card.className = `cartao-meta ${getGoalStatusClass(goal.status)}`;
  const progressWidth = goal.status === 'completed' ? 100 : Math.min(100, goal.progress);
  if (idUltimaMetaCelebrada === goal.id && goal.status === 'completed') {
    card.classList.add('celebrando');
    window.setTimeout(() => {
      card.classList.remove('celebrando');
    }, 2400);
    idUltimaMetaCelebrada = null;
  }

  card.innerHTML = `
    <div class="cabecalho-meta">
      <div>
        <h4>${goal.name}</h4>
        <p class="detalhes-meta">${goal.category || 'Sem categoria'} • Prazo ${formatDate(goal.deadline)}</p>
      </div>
      <span class="status-meta">${formatGoalStatus(goal.status)}</span>
    </div>
    <div class="progresso-meta">
      <strong>${formatCurrency(goal.currentAmount)} de ${formatCurrency(goal.targetAmount)} • ${goal.progress.toFixed(1)}%</strong>
      <div class="barra-progresso-meta"><div class="preenchimento-progresso-meta" style="width: ${progressWidth}%"></div></div>
    </div>
  `;

  const actions = document.createElement('div');
  actions.className = 'acoes-meta';

  const progressButton = document.createElement('button');
  progressButton.type = 'button';
  progressButton.className = 'acao-primaria-meta';
  progressButton.textContent = 'Somar progresso';
  progressButton.addEventListener('click', () => showGoalProgressModal(goal));

  const completedButton = document.createElement('button');
  completedButton.type = 'button';
  completedButton.textContent = '✔ Cumprida';
  completedButton.addEventListener('click', () => updateGoalStatus(goal, 'completed'));

  const failedButton = document.createElement('button');
  failedButton.type = 'button';
    failedButton.className = 'botao-secundario';
  failedButton.textContent = '✖ Não cumprida';
  failedButton.addEventListener('click', () => updateGoalStatus(goal, 'failed'));

  const activeButton = document.createElement('button');
  activeButton.type = 'button';
  activeButton.className = 'botao-secundario';
  activeButton.textContent = 'Retomar';
  activeButton.addEventListener('click', () => updateGoalStatus(goal, 'active'));

  actions.appendChild(progressButton);
  actions.appendChild(completedButton);
  actions.appendChild(failedButton);
  actions.appendChild(activeButton);
  actions.appendChild(buildItemActions(() => startGoalEdit(goal), () => deleteGoal(goal.id)));

  card.appendChild(actions);
  return card;
}

function startTransactionEdit(item) {
  document.getElementById('tipo-movimentacao').value = item.type;
  document.getElementById('valor-movimentacao').value = item.amount;
  document.getElementById('data-movimentacao').value = item.date;

  if (cacheCategorias.includes(item.category)) {
    categoriaMovimentacao.value = item.category;
    linhaCategoriaPersonalizada.classList.add('oculto');
    campoCategoriaPersonalizada.value = '';
  } else {
    categoriaMovimentacao.value = '__custom__';
    linhaCategoriaPersonalizada.classList.remove('oculto');
    campoCategoriaPersonalizada.value = item.category;
  }

  document.getElementById('observacoes-movimentacao').value = item.notes || '';
  setTransactionEditMode(item);
  formularioMovimentacao.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function startInvestmentEdit(item) {
  campoValorInvestimento.value = item.monthlyAmount;
  idVisualizacaoInvestimento = item.id;
  perfilRiscoSelecionado = item.riskProfile;
  anosInvestimentoSelecionados = item.years;
  syncInvestmentChoices();
  updateInvestmentPreview();
  setInvestmentEditMode(item);
  formularioInvestimento.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteTransaction(id) {
  const confirmed = await requestConfirmAction({
    eyebrow: 'EXCLUIR MOVIMENTAÇÃO',
    title: 'Excluir esta movimentação?',
    text: 'A movimentação será removida do histórico e dos resumos financeiros.',
    confirmText: 'Excluir movimentação',
  });
  if (!confirmed) return;

  try {
    const data = await apiFetch(`/api/transactions/${id}?email=${encodeURIComponent(emailUsuarioAtual)}`, {
      method: 'DELETE',
    });
    if (idMovimentacaoEdicao === id) resetTransactionForm();
    showTransactionMessage(data.message, 'success');
    await loadAllData({ clearMessages: false });
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
}

async function deleteInvestment(id) {
  const confirmed = await requestConfirmAction({
    eyebrow: 'EXCLUIR SIMULAÇÃO',
    title: 'Excluir esta simulação?',
    text: 'A simulação será removida e deixará de aparecer nos detalhes de investimento.',
    confirmText: 'Excluir simulação',
  });
  if (!confirmed) return;

  try {
    const data = await apiFetch(`/api/investments/${id}?email=${encodeURIComponent(emailUsuarioAtual)}`, {
      method: 'DELETE',
    });
    if (idInvestimentoEdicao === id) resetInvestmentForm();
    if (idVisualizacaoInvestimento === id) idVisualizacaoInvestimento = null;
    showInvestmentMessage(data.message, 'success');
    await loadAllData({ clearMessages: false });
  } catch (error) {
    showInvestmentMessage(error.message, 'error');
  }
}

function renderCategoryOptions(categories) {
  const options = categories.map((category) => `<option value="${category}">${category}</option>`).join('');
  categoriaMovimentacao.innerHTML = `${options}<option value="__custom__">Personalizada</option>`;
  filtroCategoria.innerHTML = `<option value="all">Todas</option>${options}`;
}

async function apiFetch(url, options = {}) {
  const response = await fetch(buildApiUrl(url), options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Erro inesperado.');
  }
  return data;
}

function buildApiUrl(url) {
  if (/^https?:\/\//i.test(url) || !API_BASE_URL) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

async function loadCategories() {
  const data = await apiFetch(`/api/categories?email=${encodeURIComponent(emailUsuarioAtual)}`);
  cacheCategorias = data.categories;
  renderCategoryOptions(cacheCategorias);
}

function buildCategoryChartData(items) {
  const labels = items.map((item) => item.category);
  const values = items.map((item) => item.total);
  const colors = ['#0ea5e9', '#f97316', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];
  return {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: labels.map((_, index) => colors[index % colors.length]),
        borderWidth: 0,
      },
    ],
  };
}

function truncateChartLabel(text, maxLength = 14) {
  const normalized = String(text || '').trim();
  if (!normalized) return 'Sem categoria';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function buildDashboardTransactionChartData(items) {
  if (!items.length) {
    return {
      labels: [['Sem', 'movimentacoes']],
      datasets: [
        { label: 'Entradas', data: [0], backgroundColor: '#22c55e' },
        { label: 'Saidas', data: [0], backgroundColor: '#ef4444' },
      ],
    };
  }

  return {
    labels: items.map((item) => [formatDate(item.date), truncateChartLabel(item.category)]),
    datasets: [
      {
        label: 'Entradas',
        data: items.map((item) => (item.type === 'income' ? item.amount : null)),
        backgroundColor: '#22c55e',
      },
      {
        label: 'Saidas',
        data: items.map((item) => (item.type === 'expense' ? item.amount : null)),
        backgroundColor: '#ef4444',
      },
    ],
  };
}

function chartBaseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#dbe7ff' } } },
  };
}

function renderDashboard(data) {
  totalEntradas.textContent = formatCurrency(data.summary.income);
  totalSaidas.textContent = formatCurrency(data.summary.expense);
  totalSaldo.textContent = formatCurrency(data.summary.balance);
  renderList(listaUltimasMovimentacoes, data.latestTransactions, 'Nenhuma movimentação cadastrada ainda.', buildTransactionItem);

  renderChart('dashboardCategory', 'grafico-categoria', {
    type: 'doughnut',
    data: buildCategoryChartData(data.categoryBreakdown.length ? data.categoryBreakdown : [{ category: 'Sem despesas', total: 1 }]),
    options: chartBaseOptions(),
  });

  renderChart('dashboardMonthly', 'grafico-mensal', {
    type: 'bar',
    data: buildDashboardTransactionChartData(data.transactionSeries || []),
    options: {
      ...chartBaseOptions(),
      plugins: {
        ...chartBaseOptions().plugins,
        tooltip: {
          callbacks: {
            title(context) {
              const item = data.transactionSeries?.[context[0]?.dataIndex];
              if (!item) return 'Sem movimentacoes';
              return `${formatDate(item.date)} - ${item.category}`;
            },
            label(context) {
              const item = data.transactionSeries?.[context.dataIndex];
              if (!item) return `${context.dataset.label}: ${formatCurrency(context.parsed.y || 0)}`;
              const tipo = item.type === 'income' ? 'Entrada' : 'Saida';
              const observacao = item.notes ? ` | ${item.notes}` : '';
              return `${tipo}: ${formatCurrency(item.amount)}${observacao}`;
            },
          },
        },
      },
      scales: {
        x: { ticks: { color: '#b7c8e2', autoSkip: true, maxRotation: 0 }, grid: { color: 'rgba(255,255,255,0.08)' } },
        y: { beginAtZero: true, ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
      },
    },
  });

  if (deveExibirBoasVindas) {
    showWelcomeOverlay(data, nomeUsuarioAtual);
    deveExibirBoasVindas = false;
  }
}

async function loadDashboard() {
  renderDashboard(
    await apiFetch(
      `/api/dashboard?email=${encodeURIComponent(emailUsuarioAtual)}&month=${encodeURIComponent(mesDashboardSelecionado)}`
    )
  );
}

function readTransactionFilters() {
  const hasSelectedMonth = Boolean(filtroMes.value);
  return new URLSearchParams({
    email: emailUsuarioAtual,
    type: filtroTipo.value || 'all',
    category: filtroCategoria.value || 'all',
    month: filtroMes.value || '',
    period: hasSelectedMonth ? 'all' : filtroPeriodo.value || 'all',
    startDate: hasSelectedMonth ? '' : filtroDataInicial.value || '',
    endDate: hasSelectedMonth ? '' : filtroDataFinal.value || '',
  });
}

function renderFilteredTransactions(data) {
  entradasFiltradas.textContent = formatCurrency(data.summary.income);
  saidasFiltradas.textContent = formatCurrency(data.summary.expense);
  saldoFiltrado.textContent = formatCurrency(data.summary.balance);
  quantidadeFiltrada.textContent = String(data.totalCount);
  renderList(listaMovimentacoes, data.transactions, 'Nenhuma movimentação para os filtros escolhidos.', buildTransactionItem);

  renderChart('filteredCategory', 'grafico-categoria-filtrado', {
    type: 'pie',
    data: buildCategoryChartData(data.categoryBreakdown.length ? data.categoryBreakdown : [{ category: 'Sem despesas', total: 1 }]),
    options: chartBaseOptions(),
  });
}

async function loadTransactions() {
  const data = await apiFetch(`/api/transactions?${readTransactionFilters().toString()}`);
  renderFilteredTransactions(data);
}

let ultimoPayloadInvestimentos = null;

function renderInvestments(data) {
  ultimoPayloadInvestimentos = data;
  totalInvestido.textContent = formatCurrency(data.summary.totalInvested);
  totalLucroPrejuizo.textContent = formatCurrency(data.summary.profitLoss);
  totalValorAtual.textContent = formatCurrency(data.summary.currentValue);

  if (!data.investments.length) {
    idVisualizacaoInvestimento = null;
    painelDetalhesInvestimento.classList.add('oculto');
  } else if (!data.investments.some((item) => item.id === idVisualizacaoInvestimento)) {
    idVisualizacaoInvestimento = data.investments[0].id;
  }

  renderList(listaInvestimentos, data.investments, 'Nenhuma simulação salva ainda.', buildInvestmentSimulationItem);

  const selectedInvestment = data.investments.find((item) => item.id === idVisualizacaoInvestimento) || data.investments[0];

  if (selectedInvestment) {
    painelDetalhesInvestimento.classList.remove('oculto');
    perfilInvestimentoSelecionado.textContent = selectedInvestment.riskLabel;
    valorInvestimentoSelecionado.textContent = formatCurrency(selectedInvestment.monthlyAmount);
    textoAnosInvestimentoSelecionado.textContent = `${selectedInvestment.years} ano${selectedInvestment.years > 1 ? 's' : ''}`;
    projecaoInvestimentoSelecionado.textContent = formatCurrency(selectedInvestment.projectedValue);
  }

  renderChart('investments', 'grafico-investimento', {
    type: 'line',
    data: {
      labels: selectedInvestment ? selectedInvestment.yearlyPoints.map((item) => `${item.year} ano${item.year > 1 ? 's' : ''}`) : data.evolution.map((item) => item.label),
      datasets: [
        {
          label: 'Seu dinheiro pode crescer',
          data: selectedInvestment ? selectedInvestment.yearlyPoints.map((item) => item.value) : data.evolution.map((item) => item.currentValue),
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.18)',
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      ...chartBaseOptions(),
      scales: {
        x: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
        y: { ticks: { color: '#b7c8e2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
      },
    },
  });
}

async function loadInvestments() {
  renderInvestments(await apiFetch(`/api/investments?email=${encodeURIComponent(emailUsuarioAtual)}`));
}

function renderGoals(data) {
  quantidadeTotalMetas.textContent = String(data.summary.total);
  quantidadeMetasConcluidas.textContent = String(data.summary.completed);
  quantidadeMetasNaoConcluidas.textContent = String(data.summary.failed);

  if (!data.goals.length) {
    listaMetas.innerHTML = '<article class="cartao-meta"><p>Nenhuma meta encontrada para este filtro.</p></article>';
    tituloMetas.textContent = 'Toda meta começa com um plano claro.';
    subtituloMetas.textContent = 'Crie uma meta para acompanhar sua evolução financeira.';
    return;
  }

  const completedCount = data.goals.filter((goal) => goal.status === 'completed').length;
  tituloMetas.textContent = completedCount
    ? `Você já concluiu ${completedCount} meta${completedCount > 1 ? 's' : ''}.`
    : 'Você está construindo seus objetivos.';
  subtituloMetas.textContent = 'Atualize o progresso e ajuste o status sempre que sua situação mudar.';

  listaMetas.innerHTML = '';
  data.goals.forEach((goal) => {
    listaMetas.appendChild(buildGoalCard(goal));
  });
}

async function loadGoals() {
  const status = filtroStatusMeta.value || 'all';
  renderGoals(await apiFetch(`/api/goals?email=${encodeURIComponent(emailUsuarioAtual)}&status=${encodeURIComponent(status)}`));
}

function renderReports(data) {
  const report = data.selectedReport;
  mesRelatorioSelecionado = report.month;
  campoMesRelatorio.value = report.month;
  tituloRelatorio.textContent = `Relatorio de ${report.label}`;
  entradaRelatorio.textContent = formatCurrency(report.summary.income);
  saidaRelatorio.textContent = formatCurrency(report.summary.expense);
  saldoRelatorio.textContent = formatCurrency(report.summary.balance);
  quantidadeMovimentacoesRelatorio.textContent = String(report.transactionsCount);

  historicoRelatorios.innerHTML = '';
  data.reports.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `botao-historico${item.month === report.month ? ' ativo' : ''}`;
    button.textContent = item.label;
    button.addEventListener('click', () => loadReports(item.month));
    historicoRelatorios.appendChild(button);
  });

  categoriasPrincipaisRelatorio.innerHTML = '';
  const topCategories = report.topCategories.length ? report.topCategories : [{ category: 'Sem dados', total: 0, percentage: 0 }];
  topCategories.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = `${item.category}: ${formatCurrency(item.total)} (${item.percentage}%)`;
    categoriasPrincipaisRelatorio.appendChild(li);
  });

  insightsRelatorio.innerHTML = '';
  report.insights.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    insightsRelatorio.appendChild(li);
  });

  renderChart('reportCategory', 'grafico-categoria-relatorio', {
    type: 'pie',
    data: buildCategoryChartData(report.categoryBreakdown.length ? report.categoryBreakdown : [{ category: 'Sem despesas', total: 1 }]),
    options: chartBaseOptions(),
  });
}

function getChartImage(chartKey) {
  const chart = instanciasGraficos[chartKey];
  if (!chart || typeof chart.toBase64Image !== 'function') return '';
  return chart.toBase64Image();
}

async function downloadReportPdf() {
  if (!emailUsuarioAtual) return;

  setButtonLoading(botaoExportarRelatorioPdf, true, 'Gerando PDF...');
  try {
    const response = await fetch(buildApiUrl('/relatorios/pdf'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailUsuarioAtual,
        month: campoMesRelatorio.value,
        charts: {
          category: getChartImage('reportCategory') || getChartImage('dashboardCategory'),
          cashFlow: getChartImage('dashboardMonthly'),
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Nao foi possivel exportar o PDF.');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const monthKey = campoMesRelatorio.value || mesRelatorioSelecionado || getCurrentMonthKey();
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `relatorio_financeiro_${monthKey}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(downloadUrl);
    showReportMessage('PDF gerado com sucesso.', 'success');
  } catch (error) {
    showReportMessage(error.message, 'error');
  } finally {
    setButtonLoading(botaoExportarRelatorioPdf, false, 'Gerando PDF...');
  }
}

async function loadReports(month = mesRelatorioSelecionado) {
  renderReports(await apiFetch(`/api/reports?email=${encodeURIComponent(emailUsuarioAtual)}&month=${encodeURIComponent(month)}`));
}

async function loadAllData({ clearMessages = true } = {}) {
  if (!emailUsuarioAtual) return;
  try {
    await Promise.all([loadCategories(), carregarPerfilBarraLateral()]);
    await Promise.all([loadDashboard(), loadTransactions(), loadInvestments(), loadGoals(), loadReports(mesRelatorioSelecionado)]);
    if (clearMessages) {
      showTransactionMessage('');
      showInvestmentMessage('');
      showGoalMessage('');
      showReportMessage('');
    }
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
}

function setupOtpInputs() {
  digitosOtp.forEach((input, index) => {
    input.addEventListener('input', (event) => {
      const numeric = event.target.value.replace(/\D/g, '');
      event.target.value = numeric.slice(-1);
      if (event.target.value && index < digitosOtp.length - 1) {
        digitosOtp[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && index > 0) digitosOtp[index - 1].focus();
    });

    input.addEventListener('paste', (event) => {
      event.preventDefault();
      const pasted = (event.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((digit, digitIndex) => {
        if (digitosOtp[digitIndex]) digitosOtp[digitIndex].value = digit;
      });
      digitosOtp[Math.min(pasted.length, digitosOtp.length - 1)].focus();
    });
  });
}

startSplashTimer();
botaoEntrarApp.addEventListener('click', openAuth);
abaCadastro.addEventListener('click', showRegister);
abaLogin.addEventListener('click', showLogin);
botaoVoltarLogin.addEventListener('click', () => {
  showScreen(telaAutenticacao);
  showLogin();
});

botoesNavegacao.forEach((button) => {
  button.addEventListener('click', () => openSectionWithGuard(button.dataset.section));
});

botaoAtualizarDados.addEventListener('click', loadAllData);
botaoFecharBoasVindas.addEventListener('click', hideWelcomeOverlay);

botaoAbrirPaginaPerfil.addEventListener('click', () => {
  window.location.href = '/perfil.html';
});

perfilUsuarioBarraLateral.addEventListener('click', () => {
  window.location.href = '/perfil.html';
});

perfilUsuarioBarraLateral.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    window.location.href = '/perfil.html';
  }
});

campoMesDashboard.addEventListener('change', async () => {
  mesDashboardSelecionado = campoMesDashboard.value || getCurrentMonthKey();
  campoMesDashboard.value = mesDashboardSelecionado;
  try {
    await loadDashboard();
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
});

categoriaMovimentacao.addEventListener('change', () => {
  const isCustom = categoriaMovimentacao.value === '__custom__';
  linhaCategoriaPersonalizada.classList.toggle('oculto', !isCustom);
  if (!isCustom) campoCategoriaPersonalizada.value = '';
});

botaoAdicionarCategoria.addEventListener('click', async () => {
  const name = nomeNovaCategoria.value.trim();
  if (!name) {
    showTransactionMessage('Digite o nome da nova categoria.', 'error');
    return;
  }

  try {
    const data = await apiFetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailUsuarioAtual, name }),
    });
    cacheCategorias = data.categories;
    renderCategoryOptions(cacheCategorias);
    categoriaMovimentacao.value = name;
    nomeNovaCategoria.value = '';
    showTransactionMessage('Categoria adicionada com sucesso.', 'success');
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
});

formularioCadastro.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('nome-cadastro').value.trim();
  const email = document.getElementById('email-cadastro').value.trim();
  const password = document.getElementById('senha-cadastro').value;
  const confirmPassword = document.getElementById('confirmar-senha-cadastro').value;

  if (!name) {
    showAuthMessage('Informe seu nome completo.', 'error');
    return;
  }

  if (password.length < 6) {
    showAuthMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showAuthMessage('A confirmação de senha precisa ser igual à senha.', 'error');
    return;
  }

  setButtonLoading(botaoEnviarCadastro, true, 'Enviando OTP...');
  try {
    const data = await apiFetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password,
        confirmPassword,
      }),
    });
    formularioCadastro.reset();
    showVerifyEmail(email);
    showVerifyMessage(data.message, 'success');
    if (data.devOtp) {
      showVerifyMessage(`OTP de cadastro para desenvolvimento: ${data.devOtp}`, 'success');
    }
  } catch (error) {
    showAuthMessage(error.message, 'error');
  } finally {
    setButtonLoading(botaoEnviarCadastro, false, 'Enviando OTP...');
  }
});

formularioVerificacaoEmail.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = campoEmailVerificacao.value.trim();
  const otp = getOtpCode();
  if (otp.length !== 6) {
    showVerifyMessage('Digite os 6 dígitos do código.', 'error');
    return;
  }

  try {
    await apiFetch('/api/email-verificacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    emailVerificacaoPendente = '';
    showScreen(telaAutenticacao);
    showLogin();
    document.getElementById('email-login').value = email;
    showAuthMessage('Cadastro confirmado. Agora você pode fazer login.', 'success');
  } catch (error) {
    showVerifyMessage(error.message, 'error');
  }
});

formularioLogin.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('email-login').value.trim();
  setButtonLoading(botaoEnviarLogin, true, 'Entrando...');
  try {
    const data = await apiFetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: document.getElementById('senha-login').value,
      }),
    });
    saveSession({
      email: data.user?.email || email,
      name: data.user?.name || '',
      token: data.token || '',
      loggedAt: new Date().toISOString(),
    });
    deveExibirBoasVindas = true;
    formularioLogin.reset();
    showHome(data.user || { email });
  } catch (error) {
    showAuthMessage(error.message, 'error');
  } finally {
    setButtonLoading(botaoEnviarLogin, false, 'Entrando...');
  }
});

botaoLogout.addEventListener('click', () => {
  emailUsuarioAtual = '';
  nomeUsuarioAtual = '';
  emailVerificacaoPendente = '';
  cacheCategorias = [];
  atualizarPerfilBarraLateral({ name: 'Usuario', email: '', foto: '/avatar-default.svg' });
  hideWelcomeOverlay();
  clearSession();
  showScreen(telaAutenticacao);
  showLogin();
});

formularioMovimentacao.addEventListener('submit', async (event) => {
  event.preventDefault();
  const category = categoriaMovimentacao.value === '__custom__' ? campoCategoriaPersonalizada.value.trim() : categoriaMovimentacao.value;
  try {
    const data = await apiFetch(idMovimentacaoEdicao ? `/api/transactions/${idMovimentacaoEdicao}` : '/api/transactions', {
      method: idMovimentacaoEdicao ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailUsuarioAtual,
        type: document.getElementById('tipo-movimentacao').value,
        amount: Number(document.getElementById('valor-movimentacao').value),
        date: document.getElementById('data-movimentacao').value,
        category,
        notes: document.getElementById('observacoes-movimentacao').value.trim(),
      }),
    });
    resetTransactionForm();
    showTransactionMessage(data.message, 'success');
    await loadAllData({ clearMessages: false });
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
});

formularioFiltros.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await loadTransactions();
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
});

botaoLimparFiltros.addEventListener('click', async () => {
  applyDefaultTransactionFilters();
  try {
    await loadTransactions();
  } catch (error) {
    showTransactionMessage(error.message, 'error');
  }
});

formularioMeta.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await apiFetch(idMetaEdicao ? `/api/goals/${idMetaEdicao}` : '/api/goals', {
      method: idMetaEdicao ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailUsuarioAtual,
        name: document.getElementById('nome-meta').value.trim(),
        targetAmount: Number(document.getElementById('valor-alvo-meta').value),
        currentAmount: Number(document.getElementById('valor-atual-meta').value || 0),
        deadline: document.getElementById('prazo-meta').value,
        category: document.getElementById('categoria-meta').value.trim(),
      }),
    });
    resetGoalForm();
    showGoalMessage(data.message, 'success');
    await loadGoals();
  } catch (error) {
    showGoalMessage(error.message, 'error');
  }
});

botaoCancelarEdicaoMeta.addEventListener('click', () => {
  resetGoalForm();
  showGoalMessage('Edição da meta cancelada.', 'success');
});

formularioFiltrosMeta.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await loadGoals();
  } catch (error) {
    showGoalMessage(error.message, 'error');
  }
});

botaoLimparFiltrosMeta.addEventListener('click', async () => {
  filtroStatusMeta.value = 'all';
  try {
    await loadGoals();
  } catch (error) {
    showGoalMessage(error.message, 'error');
  }
});

filtroMes.addEventListener('change', () => {
  if (!filtroMes.value) return;
  filtroPeriodo.value = 'all';
  filtroDataInicial.value = '';
  filtroDataFinal.value = '';
});

[filtroPeriodo, filtroDataInicial, filtroDataFinal].forEach((input) => {
  input.addEventListener('change', () => {
    const hasCustomPeriod = filtroPeriodo.value !== 'all' || filtroDataInicial.value || filtroDataFinal.value;
    if (hasCustomPeriod) {
      filtroMes.value = '';
    }
  });
});

formularioInvestimento.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await apiFetch(idInvestimentoEdicao ? `/api/investments/${idInvestimentoEdicao}` : '/api/investments', {
      method: idInvestimentoEdicao ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailUsuarioAtual,
        monthlyAmount: Number(campoValorInvestimento.value),
        riskProfile: perfilRiscoSelecionado,
        years: anosInvestimentoSelecionados,
      }),
    });
    resetInvestmentForm();
    showInvestmentMessage(data.message, 'success');
    await loadAllData({ clearMessages: false });
  } catch (error) {
    showInvestmentMessage(error.message, 'error');
  }
});

botaoCancelarEdicaoMovimentacao.addEventListener('click', () => {
  resetTransactionForm();
    showTransactionMessage('Edição cancelada.', 'success');
});

botaoCancelarEdicaoInvestimento.addEventListener('click', () => {
  resetInvestmentForm();
    showInvestmentMessage('Edição cancelada.', 'success');
});

formularioImposto.addEventListener('submit', (event) => {
  event.preventDefault();
  const result = calculateTaxes();
  renderTaxSimulation(result);
  showTaxMessage('Estimativa atualizada com sucesso.', 'success');
});

botaoLimparFormularioImposto.addEventListener('click', () => {
  resetTaxSimulation();
});

botaoAbrirDicasImposto.addEventListener('click', () => {
  showTaxTipsModal();
});

botaoFecharDicasImposto.addEventListener('click', () => {
  hideTaxTipsModal();
});

botaoCancelarProgressoMeta.addEventListener('click', () => {
  hideGoalProgressModal();
});

campoValorProgressoMeta.addEventListener('input', () => {
  updateGoalProgressPreview();
});

modalProgressoMeta.addEventListener('click', (event) => {
  if (event.target === modalProgressoMeta) {
    hideGoalProgressModal();
  }
});

formularioProgressoMeta.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!progressoMetaPendente) return;
  setButtonLoading(botaoSalvarProgressoMeta, true, 'Adicionando...');
  try {
    await addGoalProgress(progressoMetaPendente);
  } finally {
    setButtonLoading(botaoSalvarProgressoMeta, false, 'Adicionando...');
  }
});

botaoCancelarConfirmacao.addEventListener('click', () => {
  hideConfirmActionModal(false);
});

botaoConfirmarAcao.addEventListener('click', () => {
  hideConfirmActionModal(true);
});

modalConfirmacaoAcao.addEventListener('click', (event) => {
  if (event.target === modalConfirmacaoAcao) {
    hideConfirmActionModal(false);
  }
});

botaoContinuarAvisoImposto.addEventListener('click', () => {
  saveTaxWarningPreference();
  hideTaxWarningModal();
  if (secaoPendenteAposAviso === 'secao-impostos') {
    openTaxesSection();
  }
  secaoPendenteAposAviso = null;
});

botaoVoltarAvisoImposto.addEventListener('click', () => {
  secaoPendenteAposAviso = null;
  hideTaxWarningModal();
  caixaOcultarAvisoImposto.checked = getTaxWarningHiddenPreference();
});

botoesPerfilRisco.forEach((button) => {
  button.addEventListener('click', () => {
    perfilRiscoSelecionado = button.dataset.perfilRisco;
    syncInvestmentChoices();
    updateInvestmentPreview();
  });
});

botoesAnosInvestimento.forEach((button) => {
  button.addEventListener('click', () => {
    anosInvestimentoSelecionados = Number(button.dataset.anosInvestimento);
    syncInvestmentChoices();
    updateInvestmentPreview();
  });
});

campoValorInvestimento.addEventListener('input', updateInvestmentPreview);

window.addEventListener('resize', () => {
  if (!telaAutenticacao.classList.contains('oculto')) {
    estadoParticulasAuth = createAuthParticlesState();
    resizeAuthParticlesCanvas();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  if (!modalProgressoMeta.classList.contains('oculto')) {
    hideGoalProgressModal();
  }

  if (!modalConfirmacaoAcao.classList.contains('oculto')) {
    hideConfirmActionModal(false);
  }
});

telaAutenticacao.addEventListener('pointermove', (event) => {
  if (!estadoParticulasAuth) return;
  const rect = telaAutenticacao.getBoundingClientRect();
  estadoParticulasAuth.pointer.x = (event.clientX - rect.left) / rect.width;
  estadoParticulasAuth.pointer.y = (event.clientY - rect.top) / rect.height;
  estadoParticulasAuth.pointer.active = true;
});

telaAutenticacao.addEventListener('pointerleave', () => {
  if (!estadoParticulasAuth) return;
  estadoParticulasAuth.pointer.active = false;
});

formularioRelatorio.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await apiFetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailUsuarioAtual, month: campoMesRelatorio.value }),
    });
    showReportMessage(data.message, 'success');
    mesRelatorioSelecionado = campoMesRelatorio.value;
    await loadReports(mesRelatorioSelecionado);
  } catch (error) {
    showReportMessage(error.message, 'error');
  }
});

botaoExportarRelatorio.addEventListener('click', () => {
  if (!emailUsuarioAtual) return;
  window.open(
    buildApiUrl(`/api/reports/export?email=${encodeURIComponent(emailUsuarioAtual)}&month=${encodeURIComponent(campoMesRelatorio.value)}`),
    '_blank',
    'noopener'
  );
});

botaoExportarRelatorioPdf.addEventListener('click', async () => {
  await downloadReportPdf();
});

resetTransactionForm();
resetInvestmentForm();
resetTaxSimulation();
caixaOcultarAvisoImposto.checked = getTaxWarningHiddenPreference();
hideTaxTipsModal();
campoMesDashboard.value = mesDashboardSelecionado;
applyDefaultTransactionFilters();
resetGoalForm();
campoMesRelatorio.value = mesRelatorioSelecionado;

setupOtpInputs();
const storedSession = readSession();
if (storedSession?.email) {
  showHome(storedSession);
} else {
  showRegister();
}




