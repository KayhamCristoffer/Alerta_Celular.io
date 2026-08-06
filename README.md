# 🔔 Painel de Alertas do Evento

Sistema de notificações push para eventos usando **Firebase Cloud Messaging HTTP v1**.

🌐 **Acesse em:** https://kayhamcristoffer.github.io/Alerta_Celular.io/

---

## 🔐 Login

Acesso restrito via **login com Google** (Firebase Auth).

- Proprietário fixo: `kayhamoliveira98@gmail.com`
- Outros e-mails podem ser adicionados na aba **👥 Acesso** dentro do painel

---

## 🚀 Funcionalidades

| Aba | O que faz |
|-----|-----------|
| 🔔 **Enviar Alerta** | Templates rápidos + envio por tópico, token ou lista |
| ⚙️ **Configurações** | Service Account JSON (FCM v1) + VAPID Key |
| 👥 **Acesso** | Gerencia quais e-mails podem fazer login |
| 📱 **App Flutter** | Código completo pronto para copiar |
| 📖 **Tutorial** | Passo a passo FCM HTTP v1 completo |

---

## ⚙️ Configuração Inicial (obrigatória)

### 1. Habilitar domínio no Firebase Auth

1. [console.firebase.google.com](https://console.firebase.google.com) → projeto `alertateste-1a1b4`
2. **Authentication** → aba **Settings** → **Authorized domains**
3. Clique **Add domain** → adicione `kayhamcristoffer.github.io`

### 2. Gerar Service Account Key (FCM v1)

1. Firebase Console → ⚙️ **Configurações do projeto** → aba **Contas de serviço**
2. Clique em **Gerar nova chave privada** → baixe o `serviceAccountKey.json`
3. Abra o painel → aba ⚙️ **Configurações** → cole o JSON completo → Salvar

### 3. Configurar GitHub Pages

1. Repositório → **Settings** → **Pages**
2. Source: `Deploy from a branch`
3. Branch: `main` · Folder: `/ (root)`
4. Salvar — em ~1 min o site está no ar

---

## 📋 Detalhes Técnicos

- **API:** Firebase Cloud Messaging HTTP v1
- **Auth:** Firebase Authentication (Google)
- **Frontend:** HTML/CSS/JS puro — sem build, sem dependências
- **Hosting:** GitHub Pages (arquivo estático `index.html` na raiz)
- **Project ID:** `alertateste-1a1b4`
- **Sender ID:** `904401618741`
- **VAPID Key:** `BPTqvjN8Rhb5tIchYbQ1xlTmc8mr06ZJRbnjmZDMOefWu8CHkaVBkpKTwmrMoQvuhmjijluuYbU3ZJLICKDOrQk`

---

## 🗂️ Estrutura (simples)

```
Alerta_Celular.io/
├── index.html    ← Painel completo (tudo em um arquivo)
├── README.md
└── .gitignore
```

> Nenhum build necessário. Edite o `index.html` e faça push — o GitHub Pages atualiza automaticamente.
