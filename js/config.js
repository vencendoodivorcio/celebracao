/**
 * Configuração Central — Levantamento Celebração dos Casamentos 2027
 *
 * MODO ATUAL: "offline"
 * - Permite testar o site inteiro direto no computador (abrindo index.html e painel.html).
 * - Salva no navegador (localStorage) e sincroniza em tempo real entre abas abertas!
 *
 * QUANDO FOR SUBIR PARA O GITHUB PAGES + FIREBASE + GOOGLE FORMS:
 * 1. Altere mode para "online"
 * 2. Preencha as credenciais do Firebase (firebase.config)
 * 3. Preencha a URL e os entry.IDs do Google Forms (googleForms)
 * Veja o passo a passo completo no arquivo GUIA-CONFIGURACAO.md.
 */

window.APP_CONFIG = {
  // "offline" = testes locais sem servidor | "online" = Firebase + Google Forms simultâneos
  mode: "offline",

  // Código de acesso simples para o painel da equipe (deixe "" para abrir direto sem senha)
  panelAccessCode: "equipe2027",

  // Link oficial de referência
  officialPageUrl: "https://casamento.universal.org/",

  // Configurações do Firebase Firestore (preencher quando passar para mode: "online")
  firebase: {
    collectionName: "levantamento_casais_2027",
    config: {
      apiKey: "SUA_API_KEY",
      authDomain: "SEU_PROJETO.firebaseapp.com",
      projectId: "SEU_PROJETO",
      storageBucket: "SEU_PROJETO.appspot.com",
      messagingSenderId: "SEU_SENDER_ID",
      appId: "SEU_APP_ID"
    }
  },

  // Configurações do Google Forms (envio simultâneo junto com o Firebase)
  googleForms: {
    enabled: false, // Altere para true quando preencher a URL e os entry IDs abaixo
    // Troque /viewform pelo /formResponse na URL do seu formulário
    formActionUrl: "https://docs.google.com/forms/d/e/SEU_FORM_ID/formResponse",
    entries: {
      voluntario: "entry.1000000001",
      situacaoCasal: "entry.1000000002",
      casadoCivil: "entry.1000000003",
      condicaoCivil: "entry.1000000016",
      casadoIgreja: "entry.1000000004",
      sonhoAltar: "entry.1000000005",
      igrejaCasamento: "entry.1000000006",
      fezCurso: "entry.1000000007",
      assinouAta: "entry.1000000008",
      elegibilidadeLabel: "entry.1000000009",
      nomePessoa: "entry.1000000010",
      nomeConjuge: "entry.1000000011",
      whatsapp: "entry.1000000012",
      bairroIgreja: "entry.1000000013",
      proximoPasso: "entry.1000000014",
      observacoes: "entry.1000000015"
    }
  }
};
