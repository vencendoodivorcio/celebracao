/**
 * Lógica do Painel de Acompanhamento em Tempo Real (painel.html)
 */

(function () {
  const AUTH_SESSION_KEY = "celebracao_painel_unlocked";

  const loadingSection = document.getElementById("loadingSection");
  const authSection = document.getElementById("authSection");
  const authForm = document.getElementById("authForm");
  const authSubtitle = document.getElementById("authSubtitle");
  const emailFieldGroup = document.getElementById("emailFieldGroup");
  const authEmailInput = document.getElementById("authEmailInput");
  const passwordFieldLabel = document.getElementById("passwordFieldLabel");
  const authPasswordInput = document.getElementById("authPasswordInput");
  const btnAuthSubmit = document.getElementById("btnAuthSubmit");
  const authError = document.getElementById("authError");
  const authOfflineHint = document.getElementById("authOfflineHint");
  const btnLogout = document.getElementById("btnLogout");

  const dashboardSection = document.getElementById("dashboardSection");
  const envBadge = document.getElementById("envBadge");
  const offlineTools = document.getElementById("offlineTools");

  // KPIs
  const kpiTotal = document.getElementById("kpiTotal");
  const kpiElegiveis = document.getElementById("kpiElegiveis");
  const kpiNovos = document.getElementById("kpiNovos");
  const kpiSemCivil = document.getElementById("kpiSemCivil");
  const kpiInscritos = document.getElementById("kpiInscritos");

  // Filtros
  const searchInput = document.getElementById("searchInput");
  const filterElegibilidade = document.getElementById("filterElegibilidade");
  const filterStatus = document.getElementById("filterStatus");
  const filterCivil = document.getElementById("filterCivil");
  const btnLimparFiltros = document.getElementById("btnLimparFiltros");

  // Tabela e Ações
  const tableBody = document.getElementById("recordsTableBody");
  const emptyState = document.getElementById("emptyState");
  const emptyStateTitle = document.getElementById("emptyStateTitle");
  const emptyStateDesc = document.getElementById("emptyStateDesc");
  const btnEmptyResetFilters = document.getElementById("btnEmptyResetFilters");
  const btnEmptyGoForm = document.getElementById("btnEmptyGoForm");
  const tableResponsive = document.getElementById("tableResponsive");
  const resultsCount = document.getElementById("resultsCount");
  const btnExportCsv = document.getElementById("btnExportCsv");
  const btnSeedDemo = document.getElementById("btnSeedDemo");
  const btnClearDemo = document.getElementById("btnClearDemo");
  const btnEmptySeed = document.getElementById("btnEmptySeed");

  // Modal de Detalhes
  const detailModal = document.getElementById("detailModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalGrid = document.getElementById("modalGrid");
  const modalObsVoluntario = document.getElementById("modalObsVoluntario");
  const modalNotasEquipe = document.getElementById("modalNotasEquipe");
  const btnCloseModal = document.getElementById("btnCloseModal");
  const btnSaveNotes = document.getElementById("btnSaveNotes");
  const btnDeleteRecord = document.getElementById("btnDeleteRecord");
  const btnModalWhatsapp = document.getElementById("btnModalWhatsapp");

  let allRecords = [];
  let selectedRecordId = null;
  let unsubscribeFn = null;
  let isSubscribing = false;
  let searchDebounceTimer = null;

  function safeGetSession(key) {
    try {
      return sessionStorage.getItem(key) || "";
    } catch (_) {
      return "";
    }
  }

  function safeSetSession(key, val) {
    try {
      sessionStorage.setItem(key, val);
    } catch (_) {
      // Ignora em modo anônimo / WebView restrito
    }
  }

  function safeRemoveSession(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (_) {
      // Ignora em modo anônimo / WebView restrito
    }
  }

  /* ========================================================================
     Ambiente & Autenticação
     ======================================================================== */

  function initEnvironmentUI() {
    const online = window.CasamentoService.isOnlineMode();
    if (online) {
      envBadge.classList.add("online");
      envBadge.innerHTML = '<span class="env-dot"></span> Online • Firebase Ao Vivo';
      offlineTools.classList.add("hidden");
      if (btnEmptySeed) btnEmptySeed.classList.add("hidden");
      emailFieldGroup.classList.remove("hidden");
      authEmailInput.required = true;
      passwordFieldLabel.textContent = "Senha";
      authPasswordInput.placeholder = "Digite a senha da conta";
      authSubtitle.textContent =
        "Entre com o e-mail e senha da equipe cadastrados no Firebase para acompanhar os casais em tempo real.";
    } else {
      envBadge.classList.remove("online");
      envBadge.innerHTML = '<span class="env-dot"></span> Modo Offline (Preview Local)';
      offlineTools.classList.remove("hidden");
      emailFieldGroup.classList.add("hidden");
      authEmailInput.required = false;
      passwordFieldLabel.textContent = "Código de acesso (modo local)";
      authPasswordInput.placeholder = "Digite o código de teste";
      authSubtitle.textContent =
        "Informe o código de teste para visualizar o painel em modo offline.";
      if (authOfflineHint && window.APP_CONFIG.panelAccessCode) {
        authOfflineHint.classList.remove("hidden");
        authOfflineHint.innerHTML =
          "Modo offline ativo — código padrão de teste: <strong>" +
          escapeHtml(window.APP_CONFIG.panelAccessCode) +
          "</strong>";
      }
    }
  }

  async function checkAuth() {
    if (window.CasamentoService.isOnlineMode()) {
      try {
        await window.CasamentoService.onAuthStateChanged(function (user) {
          if (user) {
            btnLogout.classList.remove("hidden");
            btnLogout.title = "Sair (" + (user.email || "equipe") + ")";
            unlockDashboard();
          } else {
            lockDashboard();
          }
        });
      } catch (err) {
        console.error(err);
        lockDashboard();
        showAuthError("Erro ao conectar ao Firebase Authentication. Verifique a conexão.");
      }
      return;
    }

    const requiredCode = (window.APP_CONFIG && window.APP_CONFIG.panelAccessCode) || "";
    if (!requiredCode || safeGetSession(AUTH_SESSION_KEY) === "1") {
      unlockDashboard();
    } else {
      lockDashboard();
    }
  }

  function showAuthError(msg) {
    authError.textContent = msg;
    authError.classList.remove("hidden");
  }

  function mapFirebaseAuthError(err) {
    const code = (err && err.code) || "";
    if (
      code === "auth/invalid-credential" ||
      code === "auth/wrong-password" ||
      code === "auth/user-not-found" ||
      code === "auth/invalid-login-credentials"
    ) {
      return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
    }
    if (code === "auth/invalid-email") {
      return "Formato de e-mail inválido.";
    }
    if (code === "auth/too-many-requests") {
      return "Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.";
    }
    if (code === "auth/operation-not-allowed") {
      return "Ative o método 'E-mail/senha' em Firebase Console → Authentication → Sign-in method.";
    }
    return "Não foi possível entrar agora. Tente novamente.";
  }

  authForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    authError.classList.add("hidden");

    if (window.CasamentoService.isOnlineMode()) {
      const email = authEmailInput.value.trim();
      const password = authPasswordInput.value;
      if (!email || !password) {
        showAuthError("Informe e-mail e senha.");
        return;
      }

      btnAuthSubmit.disabled = true;
      btnAuthSubmit.textContent = "Entrando...";
      try {
        await window.CasamentoService.signIn(email, password);
        authPasswordInput.value = "";
      } catch (err) {
        console.error(err);
        showAuthError(mapFirebaseAuthError(err));
        authPasswordInput.focus();
        authPasswordInput.select();
      } finally {
        btnAuthSubmit.disabled = false;
        btnAuthSubmit.textContent = "Entrar no Painel";
      }
      return;
    }

    // Modo offline
    const expected = (window.APP_CONFIG && window.APP_CONFIG.panelAccessCode) || "";
    if (authPasswordInput.value.trim() === expected) {
      safeSetSession(AUTH_SESSION_KEY, "1");
      authError.classList.add("hidden");
      unlockDashboard();
    } else {
      showAuthError("Código incorreto. Tente novamente.");
      authPasswordInput.focus();
      authPasswordInput.select();
    }
  });

  if (btnLogout) {
    btnLogout.addEventListener("click", async function () {
      try {
        await window.CasamentoService.signOut();
        safeRemoveSession(AUTH_SESSION_KEY);
        showToast("Você saiu do painel.");
      } catch (err) {
        console.error(err);
        showToast("Erro ao sair da conta.");
      }
    });
  }

  function lockDashboard() {
    if (loadingSection) loadingSection.classList.add("hidden");
    if (unsubscribeFn) {
      unsubscribeFn();
      unsubscribeFn = null;
    }
    isSubscribing = false;
    allRecords = [];
    closeModal();
    btnLogout.classList.add("hidden");
    dashboardSection.classList.add("hidden");
    authSection.classList.remove("hidden");
  }

  async function unlockDashboard() {
    if (loadingSection) loadingSection.classList.add("hidden");
    authSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    if (!unsubscribeFn && !isSubscribing) {
      isSubscribing = true;
      try {
        unsubscribeFn = await window.CasamentoService.subscribeRecords(
          function (records) {
            allRecords = records;
            renderDashboard();
          },
          function (err) {
            console.error(err);
            if (err && err.code === "permission-denied") {
              showToast("Sem permissão no Firestore. Verifique se publicou as Regras de segurança.");
            } else {
              showToast("Erro ao conectar ao banco de dados.");
            }
          }
        );
      } finally {
        isSubscribing = false;
      }
    }
  }

  /* ========================================================================
     Renderização do Dashboard
     ======================================================================== */

  function getFilteredRecords() {
    const q = searchInput.value.trim().toLowerCase();
    const eleg = filterElegibilidade.value;
    const status = filterStatus.value;
    const civil = filterCivil.value;

    return allRecords.filter(function (rec) {
      if (eleg && rec.elegibilidadeCodigo !== eleg) return false;
      if (status && (rec.statusAtendimento || "novo") !== status) return false;
      if (civil === "gratuidade") {
        if (
          rec.casadoCivil !== "Não" ||
          String(rec.condicaoCivil || "").indexOf("Gratuidade") === -1
        ) {
          return false;
        }
      } else if (civil && rec.casadoCivil !== civil) {
        return false;
      }

      if (q) {
        const haystack = [
          rec.nomePessoa,
          rec.nomeConjuge,
          rec.whatsapp,
          rec.bairroIgreja,
          rec.voluntario,
          rec.observacoes
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  function renderKPIs() {
    kpiTotal.textContent = allRecords.length;
    kpiElegiveis.textContent = allRecords.filter(function (r) {
      return r.elegibilidadeCodigo === "elegivel";
    }).length;
    kpiNovos.textContent = allRecords.filter(function (r) {
      return (r.statusAtendimento || "novo") === "novo";
    }).length;
    kpiSemCivil.textContent = allRecords.filter(function (r) {
      return r.casadoCivil === "Não";
    }).length;
    kpiInscritos.textContent = allRecords.filter(function (r) {
      return r.statusAtendimento === "inscrito";
    }).length;
  }

  function renderDashboard() {
    renderKPIs();

    const filtered = getFilteredRecords();
    resultsCount.textContent =
      filtered.length === 1
        ? "1 casal encontrado"
        : filtered.length + " casais encontrados";

    if (filtered.length === 0) {
      tableResponsive.classList.add("hidden");
      emptyState.classList.remove("hidden");

      const hasFilters =
        Boolean(searchInput.value.trim()) ||
        Boolean(filterElegibilidade.value) ||
        Boolean(filterStatus.value) ||
        Boolean(filterCivil.value);

      if (allRecords.length > 0 && hasFilters) {
        emptyStateTitle.textContent = "Nenhum casal encontrado com os filtros atuais";
        emptyStateDesc.textContent =
          "Limpe os filtros ou ajuste a busca para visualizar os " +
          allRecords.length +
          " registros disponíveis.";
        btnEmptyResetFilters.classList.remove("hidden");
        btnEmptyGoForm.classList.add("hidden");
        if (btnEmptySeed) btnEmptySeed.classList.add("hidden");
      } else {
        emptyStateTitle.textContent = "Nenhum casal registrado ainda";
        emptyStateDesc.textContent = window.CasamentoService.isOnlineMode()
          ? "Assim que os voluntários enviarem cadastros no formulário, os casais aparecerão aqui automaticamente em tempo real."
          : "Cadastre um casal na página do formulário ou carregue exemplos para testar o painel offline.";
        btnEmptyResetFilters.classList.add("hidden");
        btnEmptyGoForm.classList.remove("hidden");
        if (btnEmptySeed) {
          btnEmptySeed.classList.toggle("hidden", window.CasamentoService.isOnlineMode());
        }
      }
      return;
    }

    tableResponsive.classList.remove("hidden");
    emptyState.classList.add("hidden");

    tableBody.innerHTML = filtered
      .map(function (rec) {
        const coupleTitle = rec.nomeConjuge
          ? escapeHtml(rec.nomePessoa) + " &amp; " + escapeHtml(rec.nomeConjuge)
          : escapeHtml(rec.nomePessoa);

        const badgeClass =
          rec.elegibilidadeCodigo === "elegivel"
            ? "badge-elegivel"
            : rec.elegibilidadeCodigo === "verificar"
            ? "badge-verificar"
            : "badge-nao_elegivel";

        const isGratuidade =
          rec.casadoCivil === "Não" &&
          String(rec.condicaoCivil || "").indexOf("Gratuidade") !== -1;

        const civilBadge =
          rec.casadoCivil === "Não"
            ? isGratuidade
              ? '<br><span class="badge badge-verificar" style="margin-top:4px;">Gratuidade Civil (&lt; 2 SM)</span>'
              : '<br><span class="badge badge-civil-nao">Sem civil</span>'
            : rec.casadoCivil === "Em andamento"
            ? '<br><span class="badge badge-verificar" style="margin-top:4px;">Civil em andamento</span>'
            : "";

        const status = rec.statusAtendimento || "novo";
        const waUrl = buildWhatsAppUrl(rec);

        return (
          "<tr>" +
          "<td>" +
          '<div class="couple-name">' +
          coupleTitle +
          "</div>" +
          '<div class="couple-sub">' +
          escapeHtml(rec.whatsapp) +
          (rec.bairroIgreja ? " • " + escapeHtml(rec.bairroIgreja) : "") +
          "</div>" +
          "</td>" +
          "<td>" +
          '<span class="badge ' +
          badgeClass +
          '">' +
          escapeHtml(rec.elegibilidadeLabel || "Verificar") +
          "</span>" +
          civilBadge +
          "</td>" +
          "<td>" +
          "<div>" +
          escapeHtml(rec.situacaoCasal) +
          "</div>" +
          '<div class="couple-sub">' +
          escapeHtml(rec.proximoPasso || "-") +
          "</div>" +
          "</td>" +
          "<td>" +
          "<div>" +
          escapeHtml(rec.voluntario) +
          "</div>" +
          '<div class="couple-sub">' +
          formatDateTime(rec.createdAt) +
          "</div>" +
          "</td>" +
          "<td>" +
          '<select class="status-select status-' +
          escapeHtml(status) +
          '" data-action="status" data-id="' +
          escapeHtml(rec.id) +
          '">' +
          '<option value="novo"' +
          (status === "novo" ? " selected" : "") +
          ">Novo</option>" +
          '<option value="em_contato"' +
          (status === "em_contato" ? " selected" : "") +
          ">Em contato</option>" +
          '<option value="inscrito"' +
          (status === "inscrito" ? " selected" : "") +
          ">Inscrito</option>" +
          '<option value="sem_interesse"' +
          (status === "sem_interesse" ? " selected" : "") +
          ">Sem interesse</option>" +
          "</select>" +
          "</td>" +
          "<td>" +
          '<div class="row-actions">' +
          '<a class="btn btn-sm btn-whatsapp" href="' +
          waUrl +
          '" target="_blank" rel="noopener noreferrer" title="Chamar no WhatsApp">WhatsApp</a>' +
          '<button type="button" class="btn btn-sm btn-outline" data-action="details" data-id="' +
          escapeHtml(rec.id) +
          '">Detalhes</button>' +
          "</div>" +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  /* ========================================================================
     Eventos da Tabela e Modal
     ======================================================================== */

  tableBody.addEventListener("change", async function (e) {
    if (e.target.dataset.action === "status") {
      const selectEl = e.target;
      const id = selectEl.dataset.id;
      const novoStatus = selectEl.value;
      selectEl.className = "status-select status-" + novoStatus;
      selectEl.disabled = true;
      try {
        await window.CasamentoService.updateRecord(id, { statusAtendimento: novoStatus });
        showToast("Status atualizado!");
      } catch (err) {
        console.error(err);
        showToast("Erro ao atualizar status.");
        renderDashboard();
      } finally {
        selectEl.disabled = false;
      }
    }
  });

  tableBody.addEventListener("click", function (e) {
    const btn = e.target.closest('button[data-action="details"]');
    if (!btn) return;
    openDetailsModal(btn.dataset.id);
  });

  function openDetailsModal(id) {
    const rec = allRecords.find(function (item) {
      return item.id === id;
    });
    if (!rec) return;

    selectedRecordId = id;
    modalTitle.textContent = rec.nomeConjuge
      ? rec.nomePessoa + " & " + rec.nomeConjuge
      : rec.nomePessoa;

    const details = [
      ["WhatsApp", rec.whatsapp],
      ["Bairro onde mora", rec.bairroIgreja || "Não informado"],
      ["Situação Atual", rec.situacaoCasal],
      [
        "Casado no Civil?",
        rec.casadoCivil +
          (rec.casadoCivil === "Não" && rec.condicaoCivil
            ? " — " + rec.condicaoCivil
            : "")
      ],
      ["Casado na Igreja?", rec.casadoIgreja],
      [
        "Classificação",
        rec.elegibilidadeLabel +
          (rec.elegibilidadeDescricao ? " — " + rec.elegibilidadeDescricao : "")
      ],
      [
        rec.casadoIgreja === "Não" ? "Desejo de casar no Altar" : "Onde casou na igreja",
        rec.casadoIgreja === "Não" ? rec.sonhoAltar || "-" : rec.igrejaCasamento || "-"
      ],
      ["Próximo Passo", rec.proximoPasso || "-"],
      ["Voluntário", rec.voluntario],
      ["Data/Hora do Registro", formatDateTime(rec.createdAt)]
    ];

    if (rec.casadoIgreja === "Sim" && rec.igrejaCasamento === "Na Universal") {
      details.splice(
        7,
        0,
        ["Fez curso preparatório?", rec.fezCurso || "-"],
        ["Assinou ata na cerimônia?", rec.assinouAta || "-"]
      );
    }

    modalGrid.innerHTML = details
      .map(function (pair) {
        return (
          '<div class="detail-item"><span>' +
          escapeHtml(pair[0]) +
          "</span><strong>" +
          escapeHtml(pair[1]) +
          "</strong></div>"
        );
      })
      .join("");

    modalObsVoluntario.textContent = rec.observacoes || "Nenhuma observação registrada.";
    modalNotasEquipe.value = rec.notasEquipe || "";
    btnModalWhatsapp.href = buildWhatsAppUrl(rec);

    detailModal.classList.remove("hidden");
  }

  function closeModal() {
    detailModal.classList.add("hidden");
    selectedRecordId = null;
  }

  btnCloseModal.addEventListener("click", closeModal);
  detailModal.addEventListener("click", function (e) {
    if (e.target === detailModal) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !detailModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  btnSaveNotes.addEventListener("click", async function () {
    if (!selectedRecordId || btnSaveNotes.disabled) return;
    btnSaveNotes.disabled = true;
    btnSaveNotes.textContent = "Salvando...";
    try {
      await window.CasamentoService.updateRecord(selectedRecordId, {
        notasEquipe: modalNotasEquipe.value.trim()
      });
      showToast("Anotação da equipe salva!");
      closeModal();
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar anotação.");
    } finally {
      btnSaveNotes.disabled = false;
      btnSaveNotes.textContent = "Salvar Anotações";
    }
  });

  btnDeleteRecord.addEventListener("click", async function () {
    if (!selectedRecordId || btnDeleteRecord.disabled) return;
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;
    btnDeleteRecord.disabled = true;
    btnDeleteRecord.textContent = "Excluindo...";
    try {
      await window.CasamentoService.deleteRecord(selectedRecordId);
      showToast("Registro excluído.");
      closeModal();
    } catch (err) {
      console.error(err);
      showToast("Erro ao excluir registro.");
    } finally {
      btnDeleteRecord.disabled = false;
      btnDeleteRecord.textContent = "Excluir registro";
    }
  });

  /* ========================================================================
     Filtros, Exportação CSV e Ferramentas Offline
     ======================================================================== */

  searchInput.addEventListener("input", function () {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(renderDashboard, 120);
  });

  [filterElegibilidade, filterStatus, filterCivil].forEach(function (el) {
    el.addEventListener("change", renderDashboard);
  });

  function resetFilters() {
    searchInput.value = "";
    filterElegibilidade.value = "";
    filterStatus.value = "";
    filterCivil.value = "";
    renderDashboard();
  }

  btnLimparFiltros.addEventListener("click", resetFilters);
  if (btnEmptyResetFilters) {
    btnEmptyResetFilters.addEventListener("click", resetFilters);
  }

  btnExportCsv.addEventListener("click", function () {
    const rows = getFilteredRecords();
    if (!rows.length) {
      showToast("Não há registros para exportar.");
      return;
    }

    const headers = [
      "Data/Hora",
      "Voluntário",
      "Pessoa Abordada",
      "Cônjuge",
      "WhatsApp",
      "Bairro onde mora",
      "Situação Atual",
      "Casado no Civil",
      "Condição Civil / Gratuidade",
      "Casado na Igreja",
      "Sonho do Altar",
      "Igreja do Casamento",
      "Fez Curso",
      "Assinou Ata",
      "Elegibilidade",
      "Próximo Passo",
      "Status Atendimento",
      "Observações Voluntário",
      "Notas da Equipe"
    ];

    const lines = [headers.join(";")];
    rows.forEach(function (r) {
      const cols = [
        formatDateTimeFull(r.createdAt),
        r.voluntario,
        r.nomePessoa,
        r.nomeConjuge,
        r.whatsapp,
        r.bairroIgreja,
        r.situacaoCasal,
        r.casadoCivil,
        r.condicaoCivil,
        r.casadoIgreja,
        r.sonhoAltar,
        r.igrejaCasamento,
        r.fezCurso,
        r.assinouAta,
        r.elegibilidadeLabel,
        r.proximoPasso,
        r.statusAtendimento,
        r.observacoes,
        r.notasEquipe
      ].map(function (v) {
        let text = String(v || "").replace(/\r?\n/g, " ");
        // Neutraliza fórmula acidental no Excel (=, +, -, @)
        if (/^[=+\-@]/.test(text)) {
          text = "'" + text;
        }
        return '"' + text.replace(/"/g, '""') + '"';
      });
      lines.push(cols.join(";"));
    });

    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "levantamento-casais-celebracao-2027.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Arquivo CSV exportado!");
  });

  if (btnSeedDemo) {
    btnSeedDemo.addEventListener("click", function () {
      window.CasamentoService.seedDemoData();
      showToast("5 casais de exemplo carregados!");
    });
  }

  if (btnEmptySeed) {
    btnEmptySeed.addEventListener("click", function () {
      window.CasamentoService.seedDemoData();
      showToast("5 casais de exemplo carregados!");
    });
  }

  if (btnClearDemo) {
    btnClearDemo.addEventListener("click", function () {
      if (!confirm("Limpar todos os dados locais de teste?")) return;
      window.CasamentoService.clearLocalRecords();
      showToast("Dados locais limpos.");
    });
  }

  /* ========================================================================
     Utilitários
     ======================================================================== */

  function buildWhatsAppUrl(rec) {
    let digits = String(rec.whatsapp || "").replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 11) {
      digits = "55" + digits;
    }
    const saudacao =
      "Olá, " +
      (rec.nomePessoa || "tudo bem") +
      "! Tudo bem? Somos da equipe da Celebração dos Casamentos 2027 (Terapia do Amor). " +
      "Recebemos seu contato pelo nosso levantamento e gostaríamos de passar as orientações para a sua participação!";
    return "https://wa.me/" + digits + "?text=" + encodeURIComponent(saudacao);
  }

  function formatDateTime(iso) {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (_) {
      return iso;
    }
  }

  function formatDateTimeFull(iso) {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (_) {
      return iso;
    }
  }

  let toastTimer = null;
  function showToast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const div = document.createElement("div");
    div.className = "toast";
    div.textContent = message;
    document.body.appendChild(div);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      div.remove();
    }, 3200);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  initEnvironmentUI();
  checkAuth();
})();
