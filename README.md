# 🔔 Painel de Alertas — Evento

Sistema de notificações push para eventos usando Firebase Cloud Messaging v1.

## 🌐 URLs
- **GitHub Pages:** https://kayhamcristoffer.github.io/Alerta_Celular.io/
- **Repositório:** https://github.com/KayhamCristoffer/Alerta_Celular.io

## ✅ Funcionalidades
- Login com Google (Firebase Auth) — acesso restrito
- Envio de alertas por **Tópico** (todos), **Token único** ou **Múltiplos tokens**
- Templates rápidos: Sorteio, Palestra, Almoço, Urgente
- Preview da notificação em tempo real
- Histórico dos últimos 10 envios
- Gerenciamento de e-mails autorizados
- Aba **Tutorial** — Cloud Function (7 passos + checklist)
- Aba **Celular** — Guia visual completo para instalar o app no smartphone (9 passos + solução de problemas)
- Aba **Flutter** — Código completo do app Android/iOS

## 🏗️ Arquitetura

```
Painel Web (GitHub Pages)
     │  POST JSON {title, body, topic}
     ▼
Cloud Function (Firebase, southamerica-east1)
     │  FCM HTTP v1 via Admin SDK
     ▼
Firebase Cloud Messaging
     │  Push Notification
     ▼
📱 Celulares dos Participantes (Android/iOS)
```

**Por que Cloud Function?**
O Google bloqueia chamadas OAuth2 JWT diretamente do navegador (CORS). A Cloud Function usa o Firebase Admin SDK com credenciais automáticas — sem JWT manual, sem chave exposta no frontend.

## 🚀 Setup Rápido

### 1. Ativar Plano Blaze
Firebase Console → Uso e cobrança → Upgrade para Blaze (gratuito até 2M chamadas/mês)

### 2. Deploy da Cloud Function
```bash
npm install -g firebase-tools
firebase login
mkdir fcm-functions && cd fcm-functions
firebase init functions  # alertateste-1a1b4, JavaScript, N, Y
# copiar código do Tutorial → functions/index.js
firebase deploy --only functions
# copiar URL gerada
```

### 3. Configurar o Painel
Abrir GitHub Pages → aba ⚙️ Config → colar URL da Cloud Function → Salvar

### 4. Instalar App no Celular
Ver aba **📱 Celular** no painel para guia detalhado:
1. Instalar Flutter SDK
2. Configurar Android Studio + Depuração USB
3. Criar projeto Flutter
4. Configurar pubspec.yaml + build.gradle + AndroidManifest
5. Copiar `google-services.json` → `android/app/`
6. `flutter run` → aceitar permissão de notificação
7. Testar via Token ou Tópico no painel

### 5. Autorizar Domínio no Firebase Auth
Firebase Console → Authentication → Settings → Authorized domains → `kayhamcristoffer.github.io`

### 6. Ativar GitHub Pages
Repositório → Settings → Pages → main branch → / (root)

## 📱 Dados do Projeto Firebase
- **Project ID:** alertateste-1a1b4
- **Sender ID:** 904401618741
- **Tópico:** evento2026
- **Região da Function:** southamerica-east1

## 🛠️ Tecnologias
- HTML5 / Tailwind CSS / JavaScript (ES Modules)
- Firebase Auth (Google Sign-In)
- Firebase Cloud Messaging v1
- Firebase Cloud Functions (Node.js 18)
- Firebase Admin SDK
- Flutter (Android/iOS)
- GitHub Pages (hosting)

## 📋 Checklist de Ativação
- [ ] Plano Blaze ativado
- [ ] Cloud Function deployada
- [ ] URL da Function configurada no painel
- [ ] Domínio github.io autorizado no Firebase Auth
- [ ] GitHub Pages ativado
- [ ] App Flutter instalado no celular de teste
- [ ] Celular aceitou permissão de notificação
- [ ] Primeiro alerta enviado e recebido ✅

---
*Última atualização: 2026-08-07*
