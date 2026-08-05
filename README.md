# 🔔 Painel de Alertas do Evento — FCM

Sistema de notificações push para eventos usando **Firebase Cloud Messaging (FCM)**.

## 🌐 Deploy

Hospedado em **Cloudflare Pages** (deploy via `npm run deploy`)

## 🔐 Login

Apenas usuários autorizados conseguem acessar. O login é feito com **Google** via Firebase Auth.

- Proprietário fixo: `kayhamoliveira98@gmail.com`
- Outros e-mails podem ser adicionados na aba **Acesso** dentro do painel

## 🚀 Funcionalidades

| Aba | O que faz |
|-----|-----------|
| **Enviar Alerta** | Envia notificação por tópico, token único ou lista de tokens |
| **⚙️ Configurações** | Salva Server Key do Firebase e VAPID Key |
| **👥 Acesso** | Gerencia quais e-mails podem fazer login |
| **📱 App Flutter** | Código pronto para o app Android/iOS |
| **📖 Tutorial** | Passo a passo completo de configuração |

## ⚙️ Configuração Inicial

### 1. Obter a Server Key

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Projeto `alertateste-1a1b4` → ⚙️ Configurações do Projeto
3. Aba **Cloud Messaging**
4. Copie a **Chave do servidor**
5. Cole na aba ⚙️ Configurações do painel → Salvar

### 2. App Flutter

1. Baixe `google-services.json` do Firebase Console
2. Coloque em `android/app/google-services.json`
3. Copie o código da aba 📱 App Flutter no painel
4. Execute `flutter pub get` e rode no celular
5. O app se inscreve automaticamente no tópico `evento2026`

### 3. Enviar o primeiro alerta

1. Abra o painel e faça login com Google
2. Vá na aba **Enviar Alerta**
3. Clique em um template (ex: 🎉 Sorteio)
4. Clique em **Enviar Notificação**
5. Todos os celulares recebem o alerta em segundos! 🎉

## 🔧 Desenvolvimento Local

```bash
npm install
npm run build
npm run dev:sandbox   # roda na porta 3000
```

## 📦 Deploy Cloudflare Pages

```bash
npm run deploy
```

## 🗂️ Estrutura

```
src/
  index.tsx       # Backend Hono + HTML do painel
public/           # Assets estáticos
wrangler.jsonc    # Config Cloudflare Pages
```

## 🔑 Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `FCM_SERVER_KEY` | Server Key do Firebase Cloud Messaging |
| `VAPID_PUBLIC_KEY` | Chave pública VAPID para Web Push |

> **Nota:** As chaves também podem ser salvas localmente no navegador via localStorage (modo de teste).

## 📋 Projeto Firebase

- **Project ID:** `alertateste-1a1b4`
- **Package Android:** `br.com.teste.evento`
- **VAPID Key:** `BPTqvjN8Rhb5tIchYbQ1xlTmc8mr06ZJRbnjmZDMOefWu8CHkaVBkpKTwmrMoQvuhmjijluuYbU3ZJLICKDOrQk`
