# 🔔 Painel de Alertas do Evento

Sistema de notificações push para eventos usando **Firebase Cloud Messaging v1** + **Cloud Functions**.

🌐 **Acesse:** https://kayhamcristoffer.github.io/Alerta_Celular.io/

---

## 🏗️ Arquitetura

```
Painel Web (GitHub Pages)
        │  POST { title, body, topic }
        ▼
Cloud Function (Firebase — gratuito)
        │  FCM HTTP v1 (OAuth2 automático)
        ▼
📱 Celulares dos Participantes
```

> O painel **não** usa Service Account direto no browser (bloqueado pelo Google por segurança).
> A Cloud Function roda no servidor do Google e usa as credenciais automaticamente.

---

## 🚀 Funcionalidades

| Aba | O que faz |
|-----|-----------|
| 🔔 **Enviar** | Templates + envio por tópico, token único ou lista |
| ⚙️ **Config** | URL da Cloud Function + teste de conexão |
| 👥 **Acesso** | E-mails autorizados a fazer login |
| 📖 **Tutorial** | Passo a passo completo com código |
| 📱 **Flutter** | Código do app para receber alertas |

---

## ⚙️ Setup Completo (8 Passos)

### 1. Instalar Node.js
Baixe em [nodejs.org](https://nodejs.org) (versão LTS).

### 2. Instalar Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 3. Criar a Cloud Function
```bash
mkdir fcm-functions && cd fcm-functions
firebase init functions
# Projeto: alertateste-1a1b4 | Linguagem: JavaScript
```

Substitua o conteúdo de `functions/index.js` pelo código da **aba Tutorial** do painel.

### 4. Ativar plano Blaze (obrigatório para deploy)
[Firebase Console → Uso e cobrança](https://console.firebase.google.com/project/alertateste-1a1b4/usage/details)
→ Upgrade para Blaze → adicione cartão (cota gratuita: 2M chamadas/mês = **R$ 0,00** para eventos).

### 5. Fazer deploy da Cloud Function
```bash
firebase deploy --only functions
```
Copie a URL gerada (ex: `https://southamerica-east1-alertateste-1a1b4.cloudfunctions.net/sendNotification`).

### 6. Configurar o painel
Abra o painel → aba ⚙️ Config → cole a URL → Salvar → Testar Conexão.

### 7. Autorizar domínio no Firebase Auth
[Firebase Console → Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/alertateste-1a1b4/authentication/settings)
→ Add domain → `kayhamcristoffer.github.io`

### 8. Ativar GitHub Pages
Repositório → Settings → Pages → Branch: `main` / Folder: `/ (root)` → Save.

---

## 📱 App Flutter

Ver aba **📱 Flutter** no painel para código completo.

```yaml
# pubspec.yaml
dependencies:
  firebase_core: ^3.6.0
  firebase_messaging: ^15.1.3
```

O app se inscreve automaticamente no tópico `evento2026`. Qualquer alerta enviado para esse tópico chega a todos os celulares com o app instalado.

---

## 📋 Informações do Projeto Firebase

| Campo | Valor |
|-------|-------|
| Project ID | `alertateste-1a1b4` |
| Sender ID | `904401618741` |
| Package Android | `br.com.teste.evento` |
| VAPID Key | `BPTqvjN8Rhb5tI...` |

---

## 🗂️ Estrutura do Repositório

```
Alerta_Celular.io/
├── index.html    ← Painel completo (HTML estático)
├── README.md
└── .gitignore
```

---

## ✅ Checklist

- [ ] Node.js instalado
- [ ] Firebase CLI instalado e logado
- [ ] Plano Blaze ativado
- [ ] Cloud Function deployada
- [ ] URL da função configurada no painel
- [ ] Domínio `github.io` autorizado no Firebase Auth
- [ ] GitHub Pages ativado
- [ ] App Flutter no celular de teste
- [ ] Celular aceitou permissão de notificação
- [ ] 🎉 Primeiro alerta enviado e recebido!
