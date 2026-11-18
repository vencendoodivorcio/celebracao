/**
 * Camada de Dados Unificada — Offline (localStorage + BroadcastChannel) e Online (Firebase + Google Forms)
 */

(function () {
  const STORAGE_KEY = "celebracao_casais_2027_records";
  const CHANNEL_NAME = "celebracao_casais_2027_sync";

  let broadcastChannel = null;
  try {
    if ("BroadcastChannel" in window) {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (_) {
    broadcastChannel = null;
  }

  let firestoreDb = null;
  let firebaseLoadPromise = null;

  /**
   * Regra de triagem baseada no áudio da equipe
   */
  function calcularElegibilidade(data) {
    if (!data.casadoIgreja) {
      return null;
    }

    if (data.casadoIgreja === "Não") {
      return {
        codigo: "elegivel",
        label: "Elegível",
        titulo: "Casal elegível para a Celebração",
        descricao:
          "Ainda não são casados na igreja e podem receber a bênção do Altar na Celebração dos Casamentos."
      };
    }

    // Já são casados na igreja
    if (!data.igrejaCasamento) {
      return null;
    }

    if (data.igrejaCasamento === "Outra denominação") {
      return {
        codigo: "elegivel",
        label: "Elegível (Outra denominação)",
        titulo: "Casal elegível para a Celebração",
        descricao:
          "O casamento religioso foi em outra denominação — eles podem participar e se casar no Altar da Universal."
      };
    }

    // Foi na Universal
    if (!data.fezCurso || !data.assinouAta) {
      return null;
    }

    if (data.fezCurso === "Não" || data.assinouAta === "Não") {
      return {
        codigo: "elegivel",
        label: "Elegível (Sem curso/ata)",
        titulo: "Casal elegível para a Celebração oficial",
        descricao:
          "Como não fizeram o curso preparatório ou não houve assinatura de ata (apenas apresentação anterior), podem realizar o casamento oficial."
      };
    }

    if (data.fezCurso === "Sim" && data.assinouAta === "Sim") {
      return {
        codigo: "nao_elegivel",
        label: "Já casado na Universal",
        titulo: "Já possuem casamento oficial na Universal",
        descricao:
          "Informaram que já casaram na Universal com curso preparatório e assinatura de ata."
      };
    }

    return {
      codigo: "verificar",
      label: "Verificar histórico",
      titulo: "Verificar detalhes com o casal",
      descricao:
        "Não se lembram se fizeram o curso ou assinaram a ata. Registre o contato para a equipe confirmar."
    };
  }

  /* ========================================================================
     Armazenamento Offline (Local)
     ======================================================================== */

  function readLocalRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeLocalRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: "RECORDS_UPDATED", at: Date.now() });
    }
  }

  /* ========================================================================
     Envio Simultâneo para Google Forms (sem backend)
     ======================================================================== */

  async function submitToGoogleForms(record) {
    const gf = window.APP_CONFIG && window.APP_CONFIG.googleForms;
    if (!gf || !gf.enabled || !gf.formActionUrl) {
      return { skipped: true };
    }

    const formData = new FormData();
    const map = gf.entries || {};
    const fields = {
      voluntario: record.voluntario || "",
      situacaoCasal: record.situacaoCasal || "",
      casadoCivil: record.casadoCivil || "",
      condicaoCivil: record.condicaoCivil || "Não se aplica",
      casadoIgreja: record.casadoIgreja || "",
      sonhoAltar: record.sonhoAltar || "Não se aplica",
      igrejaCasamento: record.igrejaCasamento || "Não se aplica",
      fezCurso: record.fezCurso || "Não se aplica",
      assinouAta: record.assinouAta || "Não se aplica",
      elegibilidadeLabel: record.elegibilidadeLabel || "",
      nomePessoa: record.nomePessoa || "",
      nomeConjuge: record.nomeConjuge || "",
      whatsapp: record.whatsapp || "",
      bairroIgreja: record.bairroIgreja || "",
      proximoPasso: record.proximoPasso || "",
      observacoes: record.observacoes || ""
    };

    Object.keys(fields).forEach(function (key) {
      if (map[key]) {
        formData.append(map[key], fields[key]);
      }
    });

    await fetch(gf.formActionUrl, {
      method: "POST",
      mode: "no-cors",
      body: formData
    });

    return { ok: true };
  }

  /* ========================================================================
     Firebase Firestore (carregado sob demanda apenas em mode: "online")
     ======================================================================== */

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error("Falha ao carregar script: " + src));
      };
      document.head.appendChild(script);
    });
  }

  async function ensureFirebase() {
    if (firestoreDb) return firestoreDb;
    if (!firebaseLoadPromise) {
      firebaseLoadPromise = (async function () {
        await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
        await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js");
        if (!window.firebase.apps.length) {
          window.firebase.initializeApp(window.APP_CONFIG.firebase.config);
        }
        firestoreDb = window.firebase.firestore();
        return firestoreDb;
      })();
    }
    return firebaseLoadPromise;
  }

  /* ========================================================================
     API Pública do Serviço
     ======================================================================== */

  function isOnlineMode() {
    return window.APP_CONFIG && window.APP_CONFIG.mode === "online";
  }

  async function createRecord(payload) {
    const elegibilidade = calcularElegibilidade(payload) || {
      codigo: "verificar",
      label: "Verificar",
      titulo: "",
      descricao: ""
    };

    const record = Object.assign({}, payload, {
      id: "casal_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      elegibilidadeCodigo: elegibilidade.codigo,
      elegibilidadeLabel: elegibilidade.label,
      elegibilidadeDescricao: elegibilidade.descricao,
      statusAtendimento: "novo",
      notasEquipe: "",
      createdAt: new Date().toISOString()
    });

    if (!isOnlineMode()) {
      const records = readLocalRecords();
      records.unshift(record);
      writeLocalRecords(records);
      return {
        record: record,
        mode: "offline",
        firebaseOk: false,
        googleFormsOk: false
      };
    }

    // Modo ONLINE: salva no Firebase + Google Forms simultaneamente
    const db = await ensureFirebase();
    const colName = window.APP_CONFIG.firebase.collectionName || "levantamento_casais_2027";

    const [fbResult, gfResult] = await Promise.allSettled([
      db.collection(colName).doc(record.id).set(record),
      submitToGoogleForms(record)
    ]);

    if (fbResult.status === "rejected") {
      throw fbResult.reason;
    }

    return {
      record: record,
      mode: "online",
      firebaseOk: true,
      googleFormsOk: gfResult.status === "fulfilled" && !gfResult.value.skipped
    };
  }

  async function updateRecord(id, patch) {
    if (!isOnlineMode()) {
      const records = readLocalRecords();
      const idx = records.findIndex(function (item) {
        return item.id === id;
      });
      if (idx !== -1) {
        records[idx] = Object.assign({}, records[idx], patch, {
          updatedAt: new Date().toISOString()
        });
        writeLocalRecords(records);
      }
      return;
    }

    const db = await ensureFirebase();
    const colName = window.APP_CONFIG.firebase.collectionName || "levantamento_casais_2027";
    await db
      .collection(colName)
      .doc(id)
      .update(Object.assign({}, patch, { updatedAt: new Date().toISOString() }));
  }

  async function deleteRecord(id) {
    if (!isOnlineMode()) {
      const records = readLocalRecords().filter(function (item) {
        return item.id !== id;
      });
      writeLocalRecords(records);
      return;
    }

    const db = await ensureFirebase();
    const colName = window.APP_CONFIG.firebase.collectionName || "levantamento_casais_2027";
    await db.collection(colName).doc(id).delete();
  }

  async function subscribeRecords(onChange, onError) {
    if (!isOnlineMode()) {
      onChange(readLocalRecords());

      const handleStorage = function (e) {
        if (!e.key || e.key === STORAGE_KEY) {
          onChange(readLocalRecords());
        }
      };
      const handleChannel = function () {
        onChange(readLocalRecords());
      };

      window.addEventListener("storage", handleStorage);
      if (broadcastChannel) {
        broadcastChannel.addEventListener("message", handleChannel);
      }

      return function unsubscribe() {
        window.removeEventListener("storage", handleStorage);
        if (broadcastChannel) {
          broadcastChannel.removeEventListener("message", handleChannel);
        }
      };
    }

    try {
      const db = await ensureFirebase();
      const colName = window.APP_CONFIG.firebase.collectionName || "levantamento_casais_2027";
      return db
        .collection(colName)
        .orderBy("createdAt", "desc")
        .onSnapshot(
          function (snapshot) {
            const items = [];
            snapshot.forEach(function (doc) {
              items.push(Object.assign({ id: doc.id }, doc.data()));
            });
            onChange(items);
          },
          function (err) {
            if (onError) onError(err);
          }
        );
    } catch (err) {
      if (onError) onError(err);
      return function () {};
    }
  }

  function seedDemoData() {
    if (isOnlineMode()) return;
    const now = Date.now();
    const samples = [
      {
        id: "demo_1",
        voluntario: "Thiago Silva",
        situacaoCasal: "Moram juntos (união estável)",
        casadoCivil: "Não",
        condicaoCivil: "Não — Renda menor que 2 salários (Gratuidade)",
        casadoIgreja: "Não",
        sonhoAltar: "Sim, tem interesse",
        igrejaCasamento: "",
        fezCurso: "",
        assinouAta: "",
        elegibilidadeCodigo: "elegivel",
        elegibilidadeLabel: "Elegível",
        elegibilidadeDescricao:
          "Ainda não são casados na igreja e podem receber a bênção do Altar na Celebração dos Casamentos.",
        nomePessoa: "Mariana Oliveira",
        nomeConjuge: "Carlos Eduardo",
        whatsapp: "(11) 98765-4321",
        bairroIgreja: "Vila Mariana / Catedral",
        proximoPasso: "Precisa de orientação sobre o casamento civil",
        observacoes: "Moram juntos há 6 anos, ficaram muito emocionados ao saber da Celebração 2027.",
        statusAtendimento: "novo",
        notasEquipe: "",
        createdAt: new Date(now - 1000 * 60 * 8).toISOString()
      },
      {
        id: "demo_2",
        voluntario: "Ana Paula",
        situacaoCasal: "Casados",
        casadoCivil: "Sim",
        casadoIgreja: "Sim",
        sonhoAltar: "",
        igrejaCasamento: "Na Universal",
        fezCurso: "Não",
        assinouAta: "Não",
        elegibilidadeCodigo: "elegivel",
        elegibilidadeLabel: "Elegível (Sem curso/ata)",
        elegibilidadeDescricao:
          "Como não fizeram o curso preparatório ou não houve assinatura de ata (apenas apresentação anterior), podem realizar o casamento oficial.",
        nomePessoa: "Roberto Santos",
        nomeConjuge: "Patrícia Santos",
        whatsapp: "(11) 99123-7788",
        bairroIgreja: "Santana",
        proximoPasso: "Quer se inscrever na Celebração",
        observacoes: "Participaram de uma apresentação antiga anos atrás, mas nunca fizeram curso nem assinaram ata.",
        statusAtendimento: "em_contato",
        notasEquipe: "Enviada mensagem de boas-vindas no WhatsApp, aguardando envio do RG.",
        createdAt: new Date(now - 1000 * 60 * 35).toISOString()
      },
      {
        id: "demo_3",
        voluntario: "Thiago Silva",
        situacaoCasal: "Casados",
        casadoCivil: "Sim",
        casadoIgreja: "Sim",
        sonhoAltar: "",
        igrejaCasamento: "Outra denominação",
        fezCurso: "",
        assinouAta: "",
        elegibilidadeCodigo: "elegivel",
        elegibilidadeLabel: "Elegível (Outra denominação)",
        elegibilidadeDescricao:
          "O casamento religioso foi em outra denominação — eles podem participar e se casar no Altar da Universal.",
        nomePessoa: "Fernanda Lima",
        nomeConjuge: "Lucas Lima",
        whatsapp: "(11) 97455-1209",
        bairroIgreja: "Tatuapé",
        proximoPasso: "Quer receber mais informações pelo WhatsApp",
        observacoes: "Casaram em outra igreja há 10 anos e hoje frequentam a Terapia do Amor.",
        statusAtendimento: "inscrito",
        notasEquipe: "Pré-cadastro concluído no site oficial!",
        createdAt: new Date(now - 1000 * 60 * 95).toISOString()
      },
      {
        id: "demo_4",
        voluntario: "Marcos Costa",
        situacaoCasal: "Noivos / Namorando",
        casadoCivil: "Em andamento",
        casadoIgreja: "Não",
        sonhoAltar: "Tem dúvidas / quer entender melhor",
        igrejaCasamento: "",
        fezCurso: "",
        assinouAta: "",
        elegibilidadeCodigo: "elegivel",
        elegibilidadeLabel: "Elegível",
        elegibilidadeDescricao:
          "Ainda não são casados na igreja e podem receber a bênção do Altar na Celebração dos Casamentos.",
        nomePessoa: "Juliana Mendes",
        nomeConjuge: "Rafael Costa",
        whatsapp: "(11) 96320-8841",
        bairroIgreja: "Mooca",
        proximoPasso: "Quer receber mais informações pelo WhatsApp",
        observacoes: "Expliquei a importância da bênção do Altar, gostaram muito e pediram contato à noite.",
        statusAtendimento: "novo",
        notasEquipe: "",
        createdAt: new Date(now - 1000 * 60 * 140).toISOString()
      },
      {
        id: "demo_5",
        voluntario: "Ana Paula",
        situacaoCasal: "Casados",
        casadoCivil: "Sim",
        casadoIgreja: "Sim",
        sonhoAltar: "",
        igrejaCasamento: "Na Universal",
        fezCurso: "Sim",
        assinouAta: "Sim",
        elegibilidadeCodigo: "nao_elegivel",
        elegibilidadeLabel: "Já casado na Universal",
        elegibilidadeDescricao:
          "Informaram que já casaram na Universal com curso preparatório e assinatura de ata.",
        nomePessoa: "Cláudia Ferreira",
        nomeConjuge: "José Ferreira",
        whatsapp: "(11) 98211-3344",
        bairroIgreja: "Lapa",
        proximoPasso: "Sem interesse no momento",
        observacoes: "Já participaram da Celebração em 2022 com tudo certinho.",
        statusAtendimento: "sem_interesse",
        notasEquipe: "Apenas registro do levantamento.",
        createdAt: new Date(now - 1000 * 60 * 210).toISOString()
      }
    ];

    writeLocalRecords(samples);
  }

  function clearLocalRecords() {
    if (isOnlineMode()) return;
    writeLocalRecords([]);
  }

  window.CasamentoService = {
    isOnlineMode: isOnlineMode,
    calcularElegibilidade: calcularElegibilidade,
    createRecord: createRecord,
    updateRecord: updateRecord,
    deleteRecord: deleteRecord,
    subscribeRecords: subscribeRecords,
    seedDemoData: seedDemoData,
    clearLocalRecords: clearLocalRecords
  };
})();
