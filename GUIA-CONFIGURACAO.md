# Guia de Configuração — GitHub Pages + Firebase + Google Forms

O projeto já funciona **100% offline** para você testar e ajustar o visual localmente.
Quando estiver tudo aprovado para subir ao ar, siga os 3 passos abaixo.

---

## 1. Como testar agora (Modo Offline)

1. Abra o arquivo `index.html` no seu navegador (pode dar dois cliques direto na pasta).
2. Abra também o arquivo `painel.html` em **outra aba** (código de acesso padrão: `equipe2027`).
3. No `painel.html`, você pode clicar em **"Carregar 5 exemplos"** para ver o layout preenchido, ou preencher um casal no `index.html` e ver ele aparecer **ao vivo** na aba do painel!

---

## 2. Conectar o Firebase (Painel em Tempo Real)

1. Acesse [console.firebase.google.com](https://console.firebase.google.com/) e crie um projeto (ex.: `celebracao-casamentos-2027`).
2. No menu lateral, clique em **Firestore Database** → **Criar banco de dados** (escolha a região mais próxima, ex.: `southamerica-east1`).
3. Em **Configurações do Projeto** (ícone de engrenagem) → **Seus apps** → clique em **Web (`</>`)** para registrar o app e copiar o objeto `firebaseConfig`.
4. Abra o arquivo `js/config.js`:
   - Mude `mode: "offline"` para `mode: "online"`.
   - Cole suas credenciais em `firebase.config`.
   - Troque `panelAccessCode` para a senha que sua equipe vai usar.

### Regras recomendadas no Firestore (aba *Regras* do Firestore)
Para iniciar o levantamento com segurança básica (permite envio do formulário e leitura/atualização do painel):
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /levantamento_casais_2027/{docId} {
      allow read, create, update, delete: if true;
    }
  }
}
```
> *Dica:* Se quiser restringir a leitura apenas a usuários autenticados, podemos ativar **Firebase Authentication (E-mail/Senha)** na etapa de publicação.

---

## 3. Vincular o Google Forms (Envio Simultâneo)

1. Crie um formulário no [Google Forms](https://forms.google.com) com campos de **Resposta curta** (isso evita erro de validação caso alguma opção condicional fique em branco) para:
   - Voluntário
   - Situação atual do casal
   - Casado no civil?
   - Condição para pagar o civil / Gratuidade (< 2 salários mínimos)
   - Casado na igreja?
   - Sonho/desejo de casar no Altar
   - Onde foi o casamento religioso
   - Fez curso preparatório?
   - Assinou ata?
   - Classificação (Elegibilidade)
   - Nome da pessoa abordada
   - Nome do cônjuge
   - WhatsApp
   - Bairro / Igreja
   - Próximo passo
   - Observações
2. No canto superior direito do Google Forms, clique nos **3 pontinhos (⋮)** → **Gerar link preenchido automaticamente**.
3. Preencha um texto qualquer em cada campo (ex.: `voluntario`, `situacao`...) e clique em **Gerar link** → **Copiar link**.
4. O link copiado terá vários trechos `entry.123456789=voluntario`.
   - Copie a URL base trocando `/viewform` por `/formResponse` e cole em `googleForms.formActionUrl` no arquivo `js/config.js`.
   - Copie cada `entry.XXXXXXXXX` para o campo correspondente em `googleForms.entries`.
   - Mude `googleForms.enabled` para `true`.
5. No Google Forms, na aba **Respostas**, clique em **Vincular às Planilhas** para acompanhar também no Google Sheets automaticamente!

---

## 4. Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `celebracao-casamentos-2027`).
2. Suba os arquivos (`index.html`, `painel.html`, pasta `css/` e pasta `js/`).
3. No repositório, vá em **Settings → Pages → Branch: `main` / `/ (root)` → Save**.
4. Em poucos minutos seu site estará no ar em:
   - Formulário dos voluntários: `https://SEU-USUARIO.github.io/celebracao-casamentos-2027/`
   - Painel da equipe: `https://SEU-USUARIO.github.io/celebracao-casamentos-2027/painel.html`
