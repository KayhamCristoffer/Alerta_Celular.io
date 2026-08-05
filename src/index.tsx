import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  FCM_SERVER_KEY: string
  FIREBASE_PROJECT_ID: string
  VAPID_PUBLIC_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())
app.use('/static/*', serveStatic({ root: './' }))

// ─── API: Enviar notificação FCM ────────────────────────────
app.post('/api/send-notification', async (c) => {
  try {
    const body = await c.req.json() as {
      token?: string
      topic?: string
      tokens?: string[]
      title: string
      message: string
      serverKey: string
    }
    const { token, topic, title, message, tokens, serverKey } = body

    if (!serverKey) {
      return c.json({ success: false, error: 'Server Key não informada' }, 400)
    }

    const fcmUrl = 'https://fcm.googleapis.com/fcm/send'
    let fcmBody: Record<string, unknown>

    const notification = {
      title,
      body: message,
      sound: 'default',
    }

    const android = {
      priority: 'high',
      notification: {
        channel_id: 'event_alerts',
        sound: 'default',
        default_sound: true,
        default_vibrate_timings: true,
        notification_priority: 'PRIORITY_HIGH',
        visibility: 'PUBLIC',
      }
    }

    if (topic) {
      fcmBody = { to: `/topics/${topic}`, notification, android, priority: 'high',
        data: { type: 'EVENT_ALERT', timestamp: new Date().toISOString() } }
    } else if (tokens && tokens.length > 0) {
      fcmBody = { registration_ids: tokens.slice(0, 500), notification, android, priority: 'high',
        data: { type: 'EVENT_ALERT', timestamp: new Date().toISOString() } }
    } else {
      fcmBody = { to: token, notification, android, priority: 'high',
        data: { type: 'EVENT_ALERT', timestamp: new Date().toISOString() } }
    }

    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${serverKey}`,
      },
      body: JSON.stringify(fcmBody),
    })

    const result = await response.json() as Record<string, unknown>

    if (!response.ok) {
      return c.json({ success: false, error: 'Erro FCM', details: result }, 400)
    }

    return c.json({ success: true, message: 'Notificação enviada!', result })
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500)
  }
})

// ─── Página Principal ────────────────────────────────────────
app.get('/', (c) => {
  return c.html(getHTML())
})

function getHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🔔 Painel de Alertas — Evento</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <!-- Firebase SDK -->
  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
    import {
      getAuth, signInWithPopup, signOut,
      GoogleAuthProvider, onAuthStateChanged
    } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

    const firebaseConfig = {
      apiKey: "AIzaSyB_GjviAQDdLvpkFg-TvkH9hvYNaL5pMxo",
      authDomain: "alertateste-1a1b4.firebaseapp.com",
      projectId: "alertateste-1a1b4",
      storageBucket: "alertateste-1a1b4.firebasestorage.app",
      messagingSenderId: "904401618741",
      appId: "1:904401618741:android:94dbcf3594253a4be42e7c"
    };

    const fbApp  = initializeApp(firebaseConfig);
    const auth   = getAuth(fbApp);
    const provider = new GoogleAuthProvider();

    // Login
    window.doLogin = async () => {
      try {
        setLoginLoading(true);
        await signInWithPopup(auth, provider);
      } catch (e) {
        showLoginError('Falha no login: ' + e.message);
        setLoginLoading(false);
      }
    };

    // Logout
    window.doLogout = async () => {
      await signOut(auth);
    };

    // Observar estado de auth
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const allowed = getAllowedEmails();
        if (!allowed.includes(user.email)) {
          showLoginError('Acesso negado. Seu e-mail (' + user.email + ') não está autorizado.');
          signOut(auth);
          return;
        }
        window._currentUser = user;
        showApp(user);
      } else {
        window._currentUser = null;
        showLogin();
      }
    });
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
    body { background: linear-gradient(135deg,#0a0a1a 0%,#0f1630 50%,#0a1628 100%); min-height:100vh; }

    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 1rem; }
    .card-glow { box-shadow: 0 0 30px rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.2); }

    .btn-primary { background: linear-gradient(135deg,#6366f1,#8b5cf6); transition: all .25s; }
    .btn-primary:hover { filter: brightness(1.15); transform: translateY(-1px); box-shadow: 0 8px 25px rgba(99,102,241,0.4); }

    .btn-danger { background: linear-gradient(135deg,#dc2626,#b91c1c); transition: all .25s; }
    .btn-danger:hover { filter: brightness(1.15); transform: translateY(-1px); box-shadow: 0 8px 25px rgba(239,68,68,0.45); }

    .btn-google { background: #fff; color: #333; border: 1px solid #ddd; transition: all .25s; }
    .btn-google:hover { background: #f5f5f5; box-shadow: 0 4px 15px rgba(0,0,0,0.15); }

    .tab-active { background: rgba(99,102,241,0.2); border-bottom: 2px solid #6366f1; color: #a5b4fc; }
    .template-card { cursor:pointer; transition:all .2s; }
    .template-card:hover { border-color:#6366f1!important; background:rgba(99,102,241,0.07)!important; transform:translateY(-2px); }

    .pulse-dot { width:9px;height:9px;border-radius:50%;background:#22c55e;display:inline-block;animation:blink 1.2s infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }

    .phone-wrap { background:linear-gradient(145deg,#1c1c1e,#2c2c2e); border:2px solid #3a3a3c; border-radius:2rem; }
    .notif-slide { animation:slideDown .4s ease forwards; }
    @keyframes slideDown { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }

    .login-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
    .login-glow { box-shadow: 0 0 60px rgba(99,102,241,0.2); }

    /* scrollbar */
    ::-webkit-scrollbar { width:6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius:3px; }
  </style>
</head>
<body class="text-white">

<!-- ═══════════════════════════ TELA DE LOGIN ═══════════════════════════ -->
<div id="screen-login" class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <!-- Logo / Título -->
    <div class="text-center mb-8">
      <div class="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
                  flex items-center justify-center text-4xl mb-4"
           style="box-shadow:0 0 40px rgba(99,102,241,0.4)">🔔</div>
      <h1 class="text-2xl font-bold">Painel de Alertas</h1>
      <p class="text-white/40 text-sm mt-1">Sistema de Notificações do Evento</p>
    </div>

    <!-- Card login -->
    <div class="login-card login-glow rounded-2xl p-8">
      <h2 class="text-lg font-semibold text-center mb-2">Acesso Restrito</h2>
      <p class="text-sm text-white/50 text-center mb-6">
        Apenas usuários autorizados podem acessar este painel.
      </p>

      <div id="login-error" class="hidden mb-4 p-3 rounded-xl bg-red-900/40 border border-red-500/40 text-red-300 text-sm"></div>

      <button id="btn-google-login" onclick="doLogin()"
              class="btn-google w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-3 text-sm">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5" alt="Google">
        <span id="login-btn-text">Entrar com Google</span>
      </button>

      <p class="text-xs text-white/25 text-center mt-5">
        <i class="fas fa-shield-halved mr-1 text-green-400/60"></i>
        Somente e-mails pré-autorizados têm acesso
      </p>
    </div>

    <!-- Footer -->
    <p class="text-center text-xs text-white/20 mt-6">
      Firebase Cloud Messaging · alertateste-1a1b4
    </p>
  </div>
</div>

<!-- ═══════════════════════════ APP PRINCIPAL ═══════════════════════════ -->
<div id="screen-app" class="hidden min-h-screen flex flex-col">

  <!-- Header -->
  <header class="sticky top-0 z-40 border-b border-white/10 backdrop-blur-md"
          style="background:rgba(10,12,30,0.92)">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg">🔔</div>
        <div>
          <h1 class="font-bold text-sm leading-tight">Painel de Alertas do Evento</h1>
          <p class="text-xs text-indigo-300/70">Firebase Cloud Messaging</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="hidden sm:flex items-center gap-2 text-xs">
          <span class="pulse-dot"></span>
          <span class="text-green-400 font-medium">Online</span>
        </div>
        <!-- User menu -->
        <div class="flex items-center gap-2">
          <img id="user-avatar" src="" alt="" class="w-8 h-8 rounded-full border border-white/20 hidden">
          <div class="hidden sm:block text-right">
            <p id="user-name" class="text-xs font-medium leading-tight"></p>
            <p id="user-email" class="text-xs text-white/40 leading-tight"></p>
          </div>
          <button onclick="doLogout()" title="Sair"
                  class="ml-1 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-red-900/30
                         hover:border-red-500/40 transition-all text-white/50 hover:text-red-400 text-xs">
            <i class="fas fa-right-from-bracket"></i>
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Main -->
  <main class="flex-1 max-w-6xl mx-auto w-full px-4 py-6">

    <!-- Aviso server key -->
    <div id="key-warning" class="mb-5 p-4 rounded-xl border border-amber-500/30 bg-amber-500/8 flex items-start gap-3 text-sm">
      <i class="fas fa-triangle-exclamation text-amber-400 mt-0.5 flex-shrink-0"></i>
      <div class="flex-1">
        <p class="font-semibold text-amber-300">Configure a Server Key do Firebase</p>
        <p class="text-amber-200/60 mt-0.5 text-xs">Necessária para enviar notificações reais.</p>
      </div>
      <button onclick="showTab('config');document.getElementById('key-warning').style.display='none'"
              class="text-xs border border-amber-500/40 bg-amber-500/15 rounded-lg px-3 py-1.5
                     hover:bg-amber-500/25 transition-colors whitespace-nowrap">
        Configurar →
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

      <!-- ── COLUNA PRINCIPAL ──────────────────────────────── -->
      <div class="lg:col-span-2 space-y-4">

        <!-- Tabs -->
        <div class="flex border-b border-white/10 gap-1 overflow-x-auto">
          <button id="tab-btn-send"    onclick="showTab('send')"    class="tab-active tab-btn px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-all"><i class="fas fa-paper-plane mr-1.5"></i>Enviar Alerta</button>
          <button id="tab-btn-config"  onclick="showTab('config')"  class="tab-btn px-4 py-2.5 text-sm font-medium text-white/45 rounded-t-lg whitespace-nowrap transition-all hover:text-white/70"><i class="fas fa-gear mr-1.5"></i>Configurações</button>
          <button id="tab-btn-users"   onclick="showTab('users')"   class="tab-btn px-4 py-2.5 text-sm font-medium text-white/45 rounded-t-lg whitespace-nowrap transition-all hover:text-white/70"><i class="fas fa-users mr-1.5"></i>Acesso</button>
          <button id="tab-btn-flutter" onclick="showTab('flutter')" class="tab-btn px-4 py-2.5 text-sm font-medium text-white/45 rounded-t-lg whitespace-nowrap transition-all hover:text-white/70"><i class="fas fa-mobile-screen mr-1.5"></i>App Flutter</button>
          <button id="tab-btn-tutorial" onclick="showTab('tutorial')" class="tab-btn px-4 py-2.5 text-sm font-medium text-white/45 rounded-t-lg whitespace-nowrap transition-all hover:text-white/70"><i class="fas fa-book mr-1.5"></i>Tutorial</button>
        </div>

        <!-- ════ ABA ENVIAR ════════════════════════════════ -->
        <div id="tab-send" class="space-y-4">

          <!-- Templates -->
          <div class="card card-glow p-5">
            <p class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              <i class="fas fa-bolt mr-1.5 text-yellow-400"></i>Templates Rápidos
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div class="template-card card p-3 text-center" onclick="setTemplate('🎉 ATENÇÃO!','Em 10 min começa o SORTEIO no palco principal. Corra!')">
                <div class="text-2xl mb-1">🎉</div><div class="text-xs font-semibold">Sorteio</div>
              </div>
              <div class="template-card card p-3 text-center" onclick="setTemplate('⏰ Próxima Palestra','Em 5 minutos começa a palestra no Auditório Principal. Garanta seu lugar!')">
                <div class="text-2xl mb-1">⏰</div><div class="text-xs font-semibold">Palestra</div>
              </div>
              <div class="template-card card p-3 text-center" onclick="setTemplate('🍽️ Hora do Almoço!','O almoço está servido! Siga para a área de alimentação. Retorno às 14h.')">
                <div class="text-2xl mb-1">🍽️</div><div class="text-xs font-semibold">Almoço</div>
              </div>
              <div class="template-card card p-3 text-center" onclick="setTemplate('🚨 AVISO URGENTE','Atenção a todos! Por favor, dirija-se à saída principal imediatamente.')">
                <div class="text-2xl mb-1">🚨</div><div class="text-xs font-semibold">Urgente</div>
              </div>
            </div>
          </div>

          <!-- Formulário -->
          <div class="card card-glow p-5">
            <p class="font-semibold mb-4"><i class="fas fa-bell mr-2 text-indigo-400"></i>Compor Notificação</p>

            <!-- Modo envio -->
            <div class="mb-4">
              <label class="block text-xs text-white/50 mb-1.5">Modo de Envio</label>
              <div class="grid grid-cols-3 gap-2">
                <button id="mode-topic"    onclick="setMode('topic')"    class="mode-btn-active text-xs py-2.5 rounded-lg border transition-all"><i class="fas fa-broadcast-tower block text-base mb-1"></i>Tópico (Todos)</button>
                <button id="mode-token"    onclick="setMode('token')"    class="mode-btn text-xs py-2.5 rounded-lg border border-white/10 bg-white/5 text-white/55 transition-all hover:border-white/20"><i class="fas fa-mobile-screen block text-base mb-1"></i>Token Único</button>
                <button id="mode-multiple" onclick="setMode('multiple')" class="mode-btn text-xs py-2.5 rounded-lg border border-white/10 bg-white/5 text-white/55 transition-all hover:border-white/20"><i class="fas fa-users block text-base mb-1"></i>Múltiplos</button>
              </div>
            </div>

            <!-- Destino dinâmico -->
            <div id="dest-topic" class="mb-4">
              <label class="block text-xs text-white/50 mb-1.5">Nome do Tópico</label>
              <div class="relative">
                <i class="fas fa-hashtag absolute left-3 top-3 text-white/25 text-sm"></i>
                <input id="topic-input" type="text" value="evento2026"
                       class="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                       placeholder="evento2026">
              </div>
              <p class="text-xs text-white/25 mt-1"><i class="fas fa-info-circle mr-1"></i>Todos inscritos neste tópico recebem o alerta</p>
            </div>
            <div id="dest-token" class="mb-4 hidden">
              <label class="block text-xs text-white/50 mb-1.5">Token FCM</label>
              <textarea id="token-input" rows="3" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-mono resize-none" placeholder="Cole o token FCM do dispositivo..."></textarea>
            </div>
            <div id="dest-multiple" class="mb-4 hidden">
              <label class="block text-xs text-white/50 mb-1.5">Lista de Tokens (um por linha)</label>
              <textarea id="multiple-input" rows="5" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-mono resize-none" placeholder="Token1&#10;Token2&#10;Token3..."></textarea>
            </div>

            <!-- Título / Mensagem -->
            <div class="mb-3">
              <label class="block text-xs text-white/50 mb-1.5">Título</label>
              <input id="notif-title" type="text" oninput="updatePreview()"
                     class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                     placeholder="🎉 ATENÇÃO PARTICIPANTES!">
            </div>
            <div class="mb-5">
              <label class="block text-xs text-white/50 mb-1.5">Mensagem</label>
              <textarea id="notif-message" rows="3" oninput="updatePreview()"
                        class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
                        placeholder="Texto que aparecerá no celular dos participantes..."></textarea>
              <div class="flex justify-between mt-1">
                <span class="text-xs text-white/25">Emojis aumentam o engajamento 🔥</span>
                <span id="char-count" class="text-xs text-white/25">0/200</span>
              </div>
            </div>

            <!-- Botões -->
            <div class="flex gap-2">
              <button onclick="sendNotification()" class="btn-primary flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm">
                <i class="fas fa-paper-plane" id="send-icon"></i>
                <span id="send-label">Enviar Notificação</span>
              </button>
              <button onclick="sendEmergency()" title="Emergência" class="btn-danger px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm">
                <i class="fas fa-triangle-exclamation"></i>
                <span class="hidden sm:inline">Emergência</span>
              </button>
            </div>
          </div>

          <!-- Histórico -->
          <div class="card card-glow p-5">
            <p class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              <i class="fas fa-clock-rotate-left mr-1.5"></i>Últimos Envios
            </p>
            <div id="history-list">
              <p class="text-sm text-white/25 text-center py-6">
                <i class="fas fa-inbox block text-3xl mb-2 opacity-30"></i>Nenhum alerta enviado ainda
              </p>
            </div>
          </div>
        </div>

        <!-- ════ ABA CONFIG ════════════════════════════════ -->
        <div id="tab-config" class="hidden space-y-4">
          <div class="card card-glow p-6">
            <p class="font-semibold mb-1"><i class="fas fa-key mr-2 text-yellow-400"></i>Server Key do Firebase</p>
            <p class="text-xs text-white/40 mb-4">Console Firebase → Configurações do Projeto → Cloud Messaging → <strong class="text-indigo-300">Chave do servidor</strong></p>
            <div class="mb-3">
              <label class="block text-xs text-white/50 mb-1.5">FCM Server Key</label>
              <div class="relative">
                <input id="server-key" type="password"
                       class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500/50 transition-all pr-10"
                       placeholder="AAAA...">
                <button onclick="toggleVisible('server-key','eye-1')" class="absolute right-3 top-2.5 text-white/30 hover:text-white/60">
                  <i id="eye-1" class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            <div class="mb-3">
              <label class="block text-xs text-white/50 mb-1.5">VAPID Public Key (Web Push)</label>
              <div class="relative">
                <input id="vapid-key" type="password"
                       class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500/50 transition-all pr-10"
                       placeholder="BPTqvjN8...">
                <button onclick="toggleVisible('vapid-key','eye-2')" class="absolute right-3 top-2.5 text-white/30 hover:text-white/60">
                  <i id="eye-2" class="fas fa-eye"></i>
                </button>
              </div>
              <p class="text-xs text-white/25 mt-1">Já detectada: <span class="text-indigo-300 font-mono">BPTqvjN8Rhb5tI...</span></p>
            </div>
            <div class="mb-4">
              <label class="block text-xs text-white/50 mb-1.5">Project ID</label>
              <input id="project-id" type="text" value="alertateste-1a1b4"
                     class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                     placeholder="alertateste-1a1b4">
            </div>
            <button onclick="saveConfig()" class="btn-primary w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              <i class="fas fa-floppy-disk"></i>Salvar Configurações
            </button>
            <p class="text-xs text-white/20 text-center mt-2"><i class="fas fa-lock mr-1 text-green-400/50"></i>Salvo apenas no seu navegador (localStorage)</p>
          </div>

          <!-- Como obter -->
          <div class="card card-glow p-6">
            <p class="font-semibold mb-4"><i class="fas fa-list-check mr-2 text-green-400"></i>Como obter a Server Key</p>
            <ol class="space-y-3">
              ${[
                ['1','Acesse <a href="https://console.firebase.google.com" target="_blank" class="text-indigo-400 hover:underline">console.firebase.google.com</a>'],
                ['2','Selecione o projeto <strong class="text-white">alertateste-1a1b4</strong>'],
                ['3','Clique em ⚙️ <strong class="text-white">Configurações do projeto</strong>'],
                ['4','Vá na aba <strong class="text-white">Cloud Messaging</strong>'],
                ['5','Copie a <strong class="text-white">Chave do servidor</strong>'],
              ].map(([n,t]) => `
              <li class="flex gap-3 text-sm">
                <span class="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xs font-bold flex-shrink-0">${n}</span>
                <span class="text-white/60">${t}</span>
              </li>`).join('')}
            </ol>
          </div>
        </div>

        <!-- ════ ABA ACESSO / USUÁRIOS ═══════════════════ -->
        <div id="tab-users" class="hidden space-y-4">

          <!-- Owner fixo -->
          <div class="card card-glow p-5">
            <p class="font-semibold mb-4"><i class="fas fa-crown mr-2 text-yellow-400"></i>Proprietário do Projeto</p>
            <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">K</div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold">Kayham Cristoffer</p>
                <p class="text-xs text-white/40">kayhamoliveira98@gmail.com</p>
              </div>
              <span class="text-xs bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 rounded-full px-2.5 py-0.5">Proprietário</span>
            </div>
          </div>

          <!-- Adicionar e-mail -->
          <div class="card card-glow p-5">
            <p class="font-semibold mb-4"><i class="fas fa-user-plus mr-2 text-green-400"></i>E-mails com Acesso ao Painel</p>
            <p class="text-xs text-white/40 mb-4">Apenas e-mails nessa lista conseguem fazer login. O e-mail deve ter uma conta Google ativa.</p>

            <div class="flex gap-2 mb-4">
              <input id="new-email" type="email" placeholder="novo@email.com"
                     class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                     onkeydown="if(event.key==='Enter')addEmail()">
              <button onclick="addEmail()" class="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5">
                <i class="fas fa-plus"></i>Adicionar
              </button>
            </div>

            <div id="email-list" class="space-y-2"></div>
          </div>

          <!-- Aviso -->
          <div class="card p-4 border-indigo-500/20 bg-indigo-500/5">
            <p class="text-xs text-white/50 flex items-start gap-2">
              <i class="fas fa-circle-info text-indigo-400 mt-0.5 flex-shrink-0"></i>
              A lista de e-mails fica salva no <strong class="text-white">localStorage do navegador</strong>.
              Para compartilhar o painel com outra pessoa, ela deve acessar o mesmo URL e você adiciona o e-mail dela aqui.
              Em uma versão futura, isso pode ser salvo no Firestore para sincronização entre dispositivos.
            </p>
          </div>
        </div>

        <!-- ════ ABA FLUTTER ══════════════════════════════ -->
        <div id="tab-flutter" class="hidden space-y-4">
          <div class="card card-glow p-6">
            <p class="font-semibold mb-4"><i class="fas fa-mobile-screen mr-2 text-blue-400"></i>Código do App Flutter</p>
            <p class="text-xs text-white/40 mb-4">Copie e cole no seu projeto Flutter para receber alertas.</p>

            <div class="mb-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-white/35 font-mono">pubspec.yaml</span>
                <button onclick="copyBlock('pubspec')" class="text-xs text-indigo-400 hover:text-indigo-300"><i class="fas fa-copy mr-1"></i>Copiar</button>
              </div>
              <pre id="pubspec" class="bg-black/40 rounded-xl p-4 text-xs font-mono text-green-300 overflow-x-auto border border-white/5"><code>dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^3.6.0
  firebase_messaging: ^15.1.3
  flutter_local_notifications: ^17.2.2</code></pre>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-white/35 font-mono">main.dart</span>
                <button onclick="copyBlock('maindart')" class="text-xs text-indigo-400 hover:text-indigo-300"><i class="fas fa-copy mr-1"></i>Copiar</button>
              </div>
              <pre id="maindart" class="bg-black/40 rounded-xl p-4 text-xs font-mono text-green-300 overflow-x-auto border border-white/5 max-h-80"><code>import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

@pragma('vm:entry-point')
Future&lt;void&gt; bgHandler(RemoteMessage msg) async {
  await Firebase.initializeApp();
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(bgHandler);
  runApp(const EventoApp());
}

class EventoApp extends StatelessWidget {
  const EventoApp({super.key});
  @override
  Widget build(BuildContext context) =&gt; MaterialApp(
    title: 'Alertas Evento',
    theme: ThemeData(colorScheme: ColorScheme.fromSeed(
      seedColor: Colors.indigo, brightness: Brightness.dark)),
    home: const AlertScreen(),
  );
}

class AlertScreen extends StatefulWidget {
  const AlertScreen({super.key});
  @override
  State&lt;AlertScreen&gt; createState() =&gt; _AlertScreenState();
}

class _AlertScreenState extends State&lt;AlertScreen&gt; {
  String _token = 'Carregando...';
  final List&lt;String&gt; _msgs = [];

  @override
  void initState() {
    super.initState();
    _setup();
  }

  Future&lt;void&gt; _setup() async {
    final fcm = FirebaseMessaging.instance;
    await fcm.requestPermission(alert: true, badge: true, sound: true);

    // Inscrever no tópico do evento
    await fcm.subscribeToTopic('evento2026');

    final token = await fcm.getToken();
    setState(() =&gt; _token = token ?? 'Erro');

    // Mensagens em foreground
    FirebaseMessaging.onMessage.listen((msg) {
      final t = msg.notification?.title ?? '';
      final b = msg.notification?.body ?? '';
      setState(() =&gt; _msgs.insert(0, '\$t: \$b'));
    });
  }

  @override
  Widget build(BuildContext context) =&gt; Scaffold(
    backgroundColor: const Color(0xFF0F1428),
    appBar: AppBar(
      title: const Text('🔔 Alertas do Evento'),
      backgroundColor: const Color(0xFF1A1A3E),
    ),
    body: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        // Token Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.indigo.withOpacity(.12),
            border: Border.all(color: Colors.indigo.withOpacity(.35)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Token FCM:', style: TextStyle(color: Colors.white60, fontSize: 11)),
            const SizedBox(height: 4),
            SelectableText(_token, style: const TextStyle(
              fontSize: 10, fontFamily: 'monospace', color: Colors.greenAccent)),
          ]),
        ),
        const SizedBox(height: 12),
        const Align(alignment: Alignment.centerLeft,
          child: Text('Alertas Recebidos:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white))),
        const SizedBox(height: 8),
        Expanded(
          child: _msgs.isEmpty
            ? const Center(child: Text('Aguardando...', style: TextStyle(color: Colors.white30)))
            : ListView.builder(
                itemCount: _msgs.length,
                itemBuilder: (_, i) =&gt; Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(.05),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(_msgs[i], style: const TextStyle(fontSize: 13, color: Colors.white70)),
                ),
              ),
        ),
      ]),
    ),
  );
}</code></pre>
            </div>
          </div>
        </div>

        <!-- ════ ABA TUTORIAL ═════════════════════════════ -->
        <div id="tab-tutorial" class="hidden space-y-4">

          <div class="card card-glow p-6">
            <p class="font-bold text-lg mb-1">📖 Tutorial Completo</p>
            <p class="text-xs text-white/40 mb-6">Do zero ao primeiro alerta funcionando</p>

            <div class="space-y-6">

              <div>
                <div class="flex items-center gap-3 mb-3">
                  <span class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
                  <h3 class="font-semibold">Obter a Server Key do Firebase</h3>
                </div>
                <div class="ml-11 text-sm text-white/60 space-y-1.5">
                  <p>→ Acesse <a href="https://console.firebase.google.com" target="_blank" class="text-indigo-400 hover:underline">console.firebase.google.com</a></p>
                  <p>→ Projeto <strong class="text-white">alertateste-1a1b4</strong> → ⚙️ Configurações do projeto</p>
                  <p>→ Aba <strong class="text-white">Cloud Messaging</strong></p>
                  <p>→ Copie a <strong class="text-white">Chave do servidor</strong></p>
                  <p>→ Cole na aba ⚙️ Configurações deste painel</p>
                </div>
              </div>

              <div>
                <div class="flex items-center gap-3 mb-3">
                  <span class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
                  <h3 class="font-semibold">Configurar o App Flutter</h3>
                </div>
                <div class="ml-11 text-sm text-white/60 space-y-1.5">
                  <p>→ Baixe o <code class="text-green-300 bg-white/10 px-1.5 py-0.5 rounded text-xs">google-services.json</code> do Firebase Console</p>
                  <p>→ Coloque em <code class="text-green-300 bg-white/10 px-1.5 py-0.5 rounded text-xs">android/app/google-services.json</code></p>
                  <p>→ Copie o código da aba 📱 App Flutter deste painel</p>
                  <p>→ Execute <code class="text-green-300 bg-white/10 px-1.5 py-0.5 rounded text-xs">flutter pub get</code> e rode no celular</p>
                </div>
              </div>

              <div>
                <div class="flex items-center gap-3 mb-3">
                  <span class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-sm flex-shrink-0">3</span>
                  <h3 class="font-semibold">Configurar o build.gradle (Android)</h3>
                </div>
                <div class="ml-11 space-y-2">
                  <p class="text-xs text-white/40">android/build.gradle (nível raiz):</p>
                  <pre class="bg-black/40 rounded-xl p-3 text-xs font-mono text-green-300 border border-white/5 overflow-x-auto"><code>plugins {
  id("com.google.gms.google-services") version "4.5.0" apply false
}</code></pre>
                  <p class="text-xs text-white/40 mt-2">android/app/build.gradle (nível app):</p>
                  <pre class="bg-black/40 rounded-xl p-3 text-xs font-mono text-green-300 border border-white/5 overflow-x-auto"><code>plugins {
  id("com.android.application")
  id("com.google.gms.google-services")
}
dependencies {
  implementation(platform("com.google.firebase:firebase-bom:34.17.0"))
  implementation("com.google.firebase:firebase-messaging")
}</code></pre>
                </div>
              </div>

              <div>
                <div class="flex items-center gap-3 mb-3">
                  <span class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-sm flex-shrink-0">4</span>
                  <h3 class="font-semibold">Inscrever no Tópico</h3>
                </div>
                <div class="ml-11 text-sm text-white/60 space-y-1.5">
                  <p>→ O código Flutter já inclui <code class="text-green-300 bg-white/10 px-1.5 py-0.5 rounded text-xs">subscribeToTopic('evento2026')</code></p>
                  <p>→ Todos os apps instalados se inscrevem automaticamente</p>
                  <p>→ No painel, selecione modo <strong class="text-white">Tópico (Todos)</strong> e use <code class="text-green-300 bg-white/10 px-1.5 py-0.5 rounded text-xs">evento2026</code></p>
                </div>
              </div>

              <div>
                <div class="flex items-center gap-3 mb-3">
                  <span class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-bold text-sm flex-shrink-0">✓</span>
                  <h3 class="font-semibold text-green-400">Enviar o Primeiro Alerta!</h3>
                </div>
                <div class="ml-11 text-sm text-white/60 space-y-1.5">
                  <p>→ Vá na aba <strong class="text-white">Enviar Alerta</strong></p>
                  <p>→ Clique em um template rápido (ex: 🎉 Sorteio)</p>
                  <p>→ Clique em <strong class="text-white">Enviar Notificação</strong></p>
                  <p>→ Em segundos todos os celulares recebem o alerta! 🎉</p>
                </div>
              </div>

            </div>
          </div>

          <!-- VAPID -->
          <div class="card card-glow p-5">
            <p class="font-semibold mb-3"><i class="fas fa-globe mr-2 text-blue-400"></i>Web Push (Notificações no Navegador)</p>
            <div class="text-sm text-white/60 space-y-2">
              <p>Sua VAPID Key já está configurada no Firebase:</p>
              <code class="block bg-black/30 rounded-lg p-3 text-xs font-mono text-green-300 break-all border border-white/5">BPTqvjN8Rhb5tIchYbQ1xlTmc8mr06ZJRbnjmZDMOefWu8CHkaVBkpKTwmrMoQvuhmjijluuYbU3ZJLICKDOrQk</code>
              <p class="text-xs text-white/30 mt-2">Use-a para enviar notificações para usuários que acessam pelo navegador (Chrome/Edge/Firefox).</p>
            </div>
          </div>
        </div>

      </div>

      <!-- ── COLUNA DIREITA ──────────────────────────────── -->
      <div class="space-y-4">

        <!-- Preview celular -->
        <div class="card card-glow p-5">
          <p class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            <i class="fas fa-eye mr-1.5"></i>Preview
          </p>
          <div class="phone-wrap p-3 mx-auto rounded-3xl" style="max-width:240px">
            <div class="flex justify-between px-1 py-1 mb-2 text-xs text-white/40">
              <span>9:41</span>
              <div class="flex gap-1"><i class="fas fa-signal"></i><i class="fas fa-wifi"></i><i class="fas fa-battery-three-quarters"></i></div>
            </div>
            <div id="phone-notif" class="hidden bg-white/12 rounded-2xl p-3 mb-2 notif-slide">
              <div class="flex items-start gap-2">
                <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm flex-shrink-0">🔔</div>
                <div class="flex-1 min-w-0">
                  <p id="prev-title" class="text-xs font-bold truncate"></p>
                  <p id="prev-msg"   class="text-xs text-white/60 mt-0.5 line-clamp-2"></p>
                  <p class="text-xs text-white/25 mt-0.5">Agora</p>
                </div>
              </div>
            </div>
            <div id="phone-empty" class="text-center py-6 text-white/20 text-xs">
              <i class="fas fa-bell-slash text-3xl mb-2 block"></i>Preencha o formulário
            </div>
            <div class="grid grid-cols-4 gap-1.5 mt-3 px-1">
              ${Array(8).fill('<div class="w-full aspect-square rounded-xl bg-white/5 border border-white/8"></div>').join('')}
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="card card-glow p-5">
          <p class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3"><i class="fas fa-chart-bar mr-1.5"></i>Estatísticas</p>
          <div class="space-y-2.5">
            <div class="flex justify-between items-center text-sm">
              <span class="text-white/50">Enviados</span><span id="st-sent" class="font-bold text-indigo-300">0</span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-white/50">Último envio</span><span id="st-last" class="text-white/35 text-xs">—</span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-white/50">Tópico</span><span id="st-topic" class="text-xs font-mono text-green-400">evento2026</span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-white/50">Usuário</span><span id="st-user" class="text-xs text-white/40 max-w-[120px] truncate text-right">—</span>
            </div>
          </div>
        </div>

        <!-- Dicas -->
        <div class="card card-glow p-5">
          <p class="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3"><i class="fas fa-lightbulb mr-1.5 text-yellow-400"></i>Dicas</p>
          <ul class="space-y-1.5 text-xs text-white/45">
            <li class="flex gap-2"><span class="text-green-400">✓</span>Tópico envia para todos de uma vez</li>
            <li class="flex gap-2"><span class="text-green-400">✓</span>Emojis no título chamam atenção</li>
            <li class="flex gap-2"><span class="text-green-400">✓</span>Mensagens curtas têm mais impacto</li>
            <li class="flex gap-2"><span class="text-yellow-400">!</span>App deve estar instalado no celular</li>
            <li class="flex gap-2"><span class="text-yellow-400">!</span>Participante deve aceitar permissão</li>
          </ul>
        </div>

      </div>
    </div>
  </main>
</div>

<!-- Toast -->
<div id="toast" class="fixed bottom-5 right-5 z-50 hidden max-w-xs">
  <div id="toast-inner" class="rounded-xl px-4 py-3 text-sm font-medium shadow-2xl flex items-center gap-2"></div>
</div>

<script>
// ── Configuração Firebase (já inicializado acima via module) ─
// Os dados do google-services.json
const FIREBASE_CONFIG = {
  projectId: "alertateste-1a1b4",
  apiKey: "AIzaSyB_GjviAQDdLvpkFg-TvkH9hvYNaL5pMxo"
};

const OWNER_EMAIL = 'kayhamoliveira98@gmail.com';

// ── Estado ──────────────────────────────────────────────────
let sentCount = 0;
let currentMode = 'topic';
const sendHistory = [];

// ── E-mails autorizados ──────────────────────────────────────
function getAllowedEmails() {
  try {
    const stored = JSON.parse(localStorage.getItem('allowed_emails') || '[]');
    const all = [OWNER_EMAIL, ...stored];
    return [...new Set(all)];
  } catch { return [OWNER_EMAIL]; }
}

function saveAllowedEmails(list) {
  const filtered = list.filter(e => e !== OWNER_EMAIL);
  localStorage.setItem('allowed_emails', JSON.stringify(filtered));
}

function addEmail() {
  const input = document.getElementById('new-email');
  const email = input.value.trim().toLowerCase();
  if (!email || !email.includes('@')) { showToast('error','E-mail inválido'); return; }
  const list = getAllowedEmails();
  if (list.includes(email)) { showToast('warning','E-mail já existe'); return; }
  list.push(email);
  saveAllowedEmails(list);
  input.value = '';
  renderEmailList();
  showToast('success','✅ E-mail adicionado!');
}

function removeEmail(email) {
  if (email === OWNER_EMAIL) { showToast('error','Não é possível remover o proprietário'); return; }
  const list = getAllowedEmails().filter(e => e !== email);
  saveAllowedEmails(list);
  renderEmailList();
  showToast('success','E-mail removido');
}

function renderEmailList() {
  const list = getAllowedEmails();
  const container = document.getElementById('email-list');
  if (!container) return;
  container.innerHTML = list.map(email => {
    const isOwner = email === OWNER_EMAIL;
    return \`<div class="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/8">
      <div class="w-7 h-7 rounded-full \${isOwner ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-indigo-500/40'} flex items-center justify-center text-xs font-bold flex-shrink-0">
        \${email.charAt(0).toUpperCase()}
      </div>
      <span class="flex-1 text-sm text-white/70 truncate">\${email}</span>
      \${isOwner
        ? '<span class="text-xs bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 rounded-full px-2 py-0.5 flex-shrink-0">Proprietário</span>'
        : \`<button onclick="removeEmail('\${email}')" class="p-1.5 rounded-lg hover:bg-red-900/40 text-white/30 hover:text-red-400 transition-all text-xs flex-shrink-0"><i class="fas fa-trash"></i></button>\`
      }
    </div>\`;
  }).join('');
}

// ── UI helpers ───────────────────────────────────────────────
function showLogin() {
  document.getElementById('screen-login').classList.remove('hidden');
  document.getElementById('screen-app').classList.add('hidden');
}

function showApp(user) {
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-app').classList.remove('hidden');

  // Preencher dados do usuário
  const av = document.getElementById('user-avatar');
  if (user.photoURL) { av.src = user.photoURL; av.classList.remove('hidden'); }
  document.getElementById('user-name').textContent  = user.displayName || '';
  document.getElementById('user-email').textContent = user.email || '';
  document.getElementById('st-user').textContent    = user.email || '';

  loadConfig();
  renderEmailList();

  // Check key warning
  if (localStorage.getItem('fcm_server_key')) {
    document.getElementById('key-warning').style.display = 'none';
  }
}

function setLoginLoading(v) {
  const btn = document.getElementById('btn-google-login');
  const txt = document.getElementById('login-btn-text');
  btn.disabled = v;
  txt.textContent = v ? 'Aguarde...' : 'Entrar com Google';
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  setLoginLoading(false);
}

// ── Tabs ─────────────────────────────────────────────────────
function showTab(tab) {
  ['send','config','users','flutter','tutorial'].forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('hidden', t !== tab);
    const btn = document.getElementById('tab-btn-' + t);
    if (t === tab) {
      btn.classList.add('tab-active');
      btn.classList.remove('text-white/45');
    } else {
      btn.classList.remove('tab-active');
      btn.classList.add('text-white/45');
    }
  });
}

// ── Modo envio ───────────────────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  ['topic','token','multiple'].forEach(m => {
    document.getElementById('dest-' + m).classList.toggle('hidden', m !== mode);
    const btn = document.getElementById('mode-' + m);
    if (m === mode) {
      btn.className = 'mode-btn-active text-xs py-2.5 rounded-lg border border-indigo-500/50 bg-indigo-500/20 text-indigo-300 font-medium transition-all';
    } else {
      btn.className = 'mode-btn text-xs py-2.5 rounded-lg border border-white/10 bg-white/5 text-white/55 font-medium transition-all hover:border-white/20';
    }
  });
  document.getElementById('st-topic').textContent =
    mode === 'topic' ? (document.getElementById('topic-input').value || 'evento2026') : '—';
}

// ── Templates ────────────────────────────────────────────────
function setTemplate(title, msg) {
  document.getElementById('notif-title').value   = title;
  document.getElementById('notif-message').value = msg;
  updatePreview();
}

// ── Preview ──────────────────────────────────────────────────
function updatePreview() {
  const t = document.getElementById('notif-title').value;
  const m = document.getElementById('notif-message').value;
  document.getElementById('char-count').textContent = m.length + '/200';
  if (t || m) {
    document.getElementById('phone-notif').classList.remove('hidden');
    document.getElementById('phone-empty').classList.add('hidden');
    document.getElementById('prev-title').textContent = t || '(sem título)';
    document.getElementById('prev-msg').textContent   = m || '';
  } else {
    document.getElementById('phone-notif').classList.add('hidden');
    document.getElementById('phone-empty').classList.remove('hidden');
  }
}

document.getElementById('topic-input')?.addEventListener('input', () => {
  document.getElementById('st-topic').textContent = document.getElementById('topic-input').value || 'evento2026';
});

// ── Config ───────────────────────────────────────────────────
function loadConfig() {
  const k = localStorage.getItem('fcm_server_key');
  const v = localStorage.getItem('vapid_key') || 'BPTqvjN8Rhb5tIchYbQ1xlTmc8mr06ZJRbnjmZDMOefWu8CHkaVBkpKTwmrMoQvuhmjijluuYbU3ZJLICKDOrQk';
  const p = localStorage.getItem('fcm_project_id') || 'alertateste-1a1b4';
  if (k) document.getElementById('server-key').value = k;
  if (v) document.getElementById('vapid-key').value  = v;
  if (p) document.getElementById('project-id').value = p;
}

function saveConfig() {
  const k = document.getElementById('server-key').value.trim();
  const v = document.getElementById('vapid-key').value.trim();
  const p = document.getElementById('project-id').value.trim();
  if (!k) { showToast('error','Informe a Server Key'); return; }
  localStorage.setItem('fcm_server_key', k);
  localStorage.setItem('vapid_key', v);
  localStorage.setItem('fcm_project_id', p);
  document.getElementById('key-warning').style.display = 'none';
  showToast('success','✅ Configurações salvas!');
}

function toggleVisible(inputId, iconId) {
  const el = document.getElementById(inputId);
  const ic = document.getElementById(iconId);
  if (el.type === 'password') { el.type='text'; ic.className='fas fa-eye-slash'; }
  else { el.type='password'; ic.className='fas fa-eye'; }
}

// ── Envio ────────────────────────────────────────────────────
async function sendNotification(isEmergency = false) {
  const serverKey = localStorage.getItem('fcm_server_key');
  if (!serverKey) { showToast('warning','⚠️ Configure a Server Key!'); showTab('config'); return; }

  const title   = isEmergency ? '🚨 ALERTA DE EMERGÊNCIA' : document.getElementById('notif-title').value.trim();
  const message = isEmergency
    ? 'Atenção todos os participantes! Por favor, dirija-se à saída principal imediatamente.'
    : document.getElementById('notif-message').value.trim();

  if (!title || !message) { showToast('error','Preencha título e mensagem'); return; }

  const payload = { title, message, serverKey };
  if (currentMode === 'topic') {
    payload.topic = document.getElementById('topic-input').value || 'evento2026';
  } else if (currentMode === 'token') {
    payload.token = document.getElementById('token-input').value.trim();
  } else {
    payload.tokens = document.getElementById('multiple-input').value.trim().split('\\n').filter(l => l.trim());
  }

  const icon  = document.getElementById('send-icon');
  const label = document.getElementById('send-label');
  icon.className  = 'fas fa-spinner fa-spin';
  label.textContent = 'Enviando...';

  try {
    const res  = await fetch('/api/send-notification', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) {
      showToast('success','✅ Notificação enviada!');
      addHistory(title, message);
      sentCount++;
      document.getElementById('st-sent').textContent = sentCount;
      document.getElementById('st-last').textContent = 'agora mesmo';
    } else {
      showToast('error','❌ ' + (data.error || 'Erro no envio'));
    }
  } catch(e) {
    showToast('error','❌ Erro: ' + e.message);
  } finally {
    icon.className  = 'fas fa-paper-plane';
    label.textContent = 'Enviar Notificação';
  }
}

function sendEmergency() {
  if (!confirm('Enviar ALERTA DE EMERGÊNCIA para todos os participantes?')) return;
  sendNotification(true);
}

// ── Histórico ────────────────────────────────────────────────
function addHistory(title, msg) {
  const now  = new Date();
  const time = now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0');
  sendHistory.unshift({ title, msg, time });
  const el = document.getElementById('history-list');
  el.innerHTML = sendHistory.slice(0,10).map(h => \`
    <div class="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/8">
      <div class="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0"></div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate">\${h.title}</p>
        <p class="text-xs text-white/35 truncate">\${h.msg}</p>
      </div>
      <span class="text-xs text-white/25 flex-shrink-0">\${h.time}</span>
    </div>
  \`).join('');
}

// ── Toast ────────────────────────────────────────────────────
function showToast(type, msg) {
  const t = document.getElementById('toast');
  const i = document.getElementById('toast-inner');
  const cls = { success:'bg-green-900/90 border border-green-500/40 text-green-100', error:'bg-red-900/90 border border-red-500/40 text-red-100', warning:'bg-amber-900/90 border border-amber-500/40 text-amber-100' };
  i.className = 'rounded-xl px-4 py-3 text-sm font-medium shadow-2xl flex items-center gap-2 ' + (cls[type] || cls.success);
  i.innerHTML = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 4000);
}

// ── Copy code ────────────────────────────────────────────────
function copyBlock(id) {
  navigator.clipboard.writeText(document.getElementById(id).innerText)
    .then(() => showToast('success','✅ Código copiado!'));
}
</script>
</body>
</html>`
}

export default app
