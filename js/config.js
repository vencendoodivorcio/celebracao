/**
 * Configuração Central — Levantamento para Celebração 2027
 *
 * MODO ATUAL: "online" (Firebase Firestore + Firebase Authentication)
 * - Voluntários (index.html): enviam cadastros sem precisar de login.
 * - Equipe (painel.html): acessa em tempo real com login E-mail/Senha do Firebase.
 * - Planilha: exportação em 1 clique direto no painel (CSV/Excel).
 *
 * Veja GUIA-CONFIGURACAO.md para detalhes das Regras do Firestore.
 */

window.APP_CONFIG = {
  // "online" = Firebase em tempo real | "offline" = testes locais no navegador
  mode: "online",

  // Usado apenas quando mode: "offline" (no modo online o login é via Firebase Auth)
  panelAccessCode: "equipe2027",

  // Link oficial de referência
  officialPageUrl: "https://casamento.universal.org/",

  // Configurações do Firebase Firestore
  firebase: {
    collectionName: "levantamento_casais_2027",
    config: {
      apiKey: "AIzaSyAz4686JOpM_KbIoSufD_8noBsjn32VtN8",
      authDomain: "celebra-fee0b.firebaseapp.com",
      projectId: "celebra-fee0b",
      storageBucket: "celebra-fee0b.firebasestorage.app",
      messagingSenderId: "554663223756",
      appId: "1:554663223756:web:16daa134ae35e0c71dfd69",
      measurementId: "G-9939GKZCMX"
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
