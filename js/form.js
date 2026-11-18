/**
 * Lógica do Formulário de Levantamento de Casais (index.html)
 */

(function () {
  const VOLUNTEER_KEY = "celebracao_voluntario_nome";

  const form = document.getElementById("casalForm");
  const successPanel = document.getElementById("successPanel");
  const successSummary = document.getElementById("successSummary");
  const successSyncText = document.getElementById("successSyncText");
  const btnNovoCadastro = document.getElementById("btnNovoCadastro");
  const btnSubmit = document.getElementById("btnSubmit");
  const envBadge = document.getElementById("envBadge");
  const syncNoteText = document.getElementById("syncNoteText");

  // Voluntário
  const volunteerInput = document.getElementById("voluntario");
  const volunteerEditWrap = document.getElementById("volunteerEditWrap");
  const volunteerSavedWrap = document.getElementById("volunteerSavedWrap");
  const volunteerSavedName = document.getElementById("volunteerSavedName");
  const btnSalvarVoluntario = document.getElementById("btnSalvarVoluntario");
  const btnTrocarVoluntario = document.getElementById("btnTrocarVoluntario");

  // Blocos condicionais
  const blocoCondicaoCivil = document.getElementById("blocoCondicaoCivil");
  const casadoIgrejaHeader = document.getElementById("casadoIgrejaHeader");
  const casadoIgrejaAutoNote = document.getElementById("casadoIgrejaAutoNote");
  const blocoNaoCasadoIgreja = document.getElementById("blocoNaoCasadoIgreja");
  const blocoSimCasadoIgreja = document.getElementById("blocoSimCasadoIgreja");
  const blocoDetalhesUniversal = document.getElementById("blocoDetalhesUniversal");

  let autoMarkedChurchNo = false;
  let isSubmitting = false;

  function safeGetStorage(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch (_) {
      return "";
    }
  }

  function safeSetStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      // Ignora em modo anônimo / WebView restrito
    }
  }

  function syncSelectedCards() {
    form.querySelectorAll(".option-card").forEach(function (card) {
      const input = card.querySelector("input");
      card.classList.toggle("is-selected", Boolean(input && input.checked));
    });
  }

  // Banners dinâmicos
  const eligibilityBanner = document.getElementById("eligibilityBanner");
  const civilReminderText = document.getElementById("civilReminderText");

  // WhatsApp input
  const whatsappInput = document.getElementById("whatsapp");

  /* ========================================================================
     Inicialização de Ambiente
     ======================================================================== */

  function initEnvironmentUI() {
    const online = window.CasamentoService.isOnlineMode();
    const formsEnabled =
      window.APP_CONFIG &&
      window.APP_CONFIG.googleForms &&
      window.APP_CONFIG.googleForms.enabled;

    if (online) {
      envBadge.classList.add("online");
      if (formsEnabled) {
        envBadge.innerHTML = '<span class="env-dot"></span> Online • Firebase + Forms';
        syncNoteText.textContent = "Envio simultâneo para o Painel (Firebase) e Google Forms.";
      } else {
        envBadge.innerHTML = '<span class="env-dot"></span> Online • Firebase Ao Vivo';
        syncNoteText.textContent = "Enviado em tempo real para o Painel da Equipe (Firebase).";
      }
    } else {
      envBadge.classList.remove("online");
      envBadge.innerHTML = '<span class="env-dot"></span> Modo Offline (Preview Local)';
      syncNoteText.textContent =
        "Modo local ativo: os dados aparecem ao vivo no Painel neste navegador.";
    }
  }

  /* ========================================================================
     Persistência do Voluntário
     ======================================================================== */

  function renderVolunteerState() {
    const saved = safeGetStorage(VOLUNTEER_KEY).trim();
    if (saved) {
      volunteerInput.value = saved;
      volunteerSavedName.textContent = saved;
      volunteerEditWrap.classList.add("hidden");
      volunteerSavedWrap.classList.remove("hidden");
    } else {
      volunteerEditWrap.classList.remove("hidden");
      volunteerSavedWrap.classList.add("hidden");
    }
  }

  function saveVolunteerName() {
    const name = volunteerInput.value.trim();
    if (!name) {
      showToast("Informe o nome do voluntário primeiro.");
      volunteerInput.focus();
      return;
    }
    safeSetStorage(VOLUNTEER_KEY, name);
    renderVolunteerState();
    showToast("Voluntário salvo para os próximos cadastros!");
  }

  btnSalvarVoluntario.addEventListener("click", saveVolunteerName);
  btnTrocarVoluntario.addEventListener("click", function () {
    volunteerEditWrap.classList.remove("hidden");
    volunteerSavedWrap.classList.add("hidden");
    volunteerInput.focus();
    volunteerInput.select();
  });

  /* ========================================================================
     Helpers de Leitura e Limpeza de Radios
     ======================================================================== */

  function getRadioValue(name) {
    const checked = form.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : "";
  }

  function clearRadioGroup(name) {
    form.querySelectorAll('input[name="' + name + '"]').forEach(function (el) {
      el.checked = false;
    });
  }

  /* ========================================================================
     Lógica Condicional + Cálculo de Elegibilidade Ao Vivo
     ======================================================================== */

  function updateConditionalUI() {
    const casadoCivil = getRadioValue("casadoCivil");

    // 2A: Condição para pagar o civil + regra automática de casamento na igreja
    if (casadoCivil === "Não") {
      blocoCondicaoCivil.classList.remove("hidden");
      const condicaoCivil = getRadioValue("condicaoCivil");
      if (condicaoCivil.indexOf("Gratuidade") !== -1) {
        civilReminderText.innerHTML =
          "<strong>Prioridade de orientação:</strong> a equipe vai auxiliar o casal no pedido de <strong>gratuidade do casamento civil no cartório</strong> (prazo da certidão: <strong>17/05/2027</strong>).";
      } else {
        civilReminderText.innerHTML =
          "Lembrete: para participar da Celebração é necessário enviar a certidão civil até <strong>17/05/2027</strong>. A equipe pode orientar o casal!";
      }

      // Sem casamento civil -> automaticamente não casado na igreja
      const radioIgrejaNao = form.querySelector('input[name="casadoIgreja"][value="Não"]');
      if (radioIgrejaNao && !radioIgrejaNao.checked) {
        radioIgrejaNao.checked = true;
      }
      autoMarkedChurchNo = true;
      casadoIgrejaHeader.classList.add("hidden");
      casadoIgrejaAutoNote.classList.remove("hidden");
    } else {
      blocoCondicaoCivil.classList.add("hidden");
      clearRadioGroup("condicaoCivil");
      casadoIgrejaHeader.classList.remove("hidden");
      casadoIgrejaAutoNote.classList.add("hidden");

      if (autoMarkedChurchNo) {
        clearRadioGroup("casadoIgreja");
        clearRadioGroup("sonhoAltar");
        autoMarkedChurchNo = false;
      }
    }

    const casadoIgreja = getRadioValue("casadoIgreja");
    const igrejaCasamento = getRadioValue("igrejaCasamento");

    // 3A vs 3B
    if (casadoIgreja === "Não") {
      blocoNaoCasadoIgreja.classList.remove("hidden");
      blocoSimCasadoIgreja.classList.add("hidden");
      blocoDetalhesUniversal.classList.add("hidden");
      clearRadioGroup("igrejaCasamento");
      clearRadioGroup("fezCurso");
      clearRadioGroup("assinouAta");
    } else if (casadoIgreja === "Sim") {
      blocoNaoCasadoIgreja.classList.add("hidden");
      blocoSimCasadoIgreja.classList.remove("hidden");
      clearRadioGroup("sonhoAltar");

      if (igrejaCasamento === "Na Universal") {
        blocoDetalhesUniversal.classList.remove("hidden");
      } else {
        blocoDetalhesUniversal.classList.add("hidden");
        clearRadioGroup("fezCurso");
        clearRadioGroup("assinouAta");
      }
    } else {
      blocoNaoCasadoIgreja.classList.add("hidden");
      blocoSimCasadoIgreja.classList.add("hidden");
      blocoDetalhesUniversal.classList.add("hidden");
    }

    syncSelectedCards();

    // Banner de elegibilidade em tempo real
    const dataSnapshot = {
      casadoIgreja: getRadioValue("casadoIgreja"),
      igrejaCasamento: getRadioValue("igrejaCasamento"),
      fezCurso: getRadioValue("fezCurso"),
      assinouAta: getRadioValue("assinouAta")
    };

    const result = window.CasamentoService.calcularElegibilidade(dataSnapshot);
    if (!result) {
      eligibilityBanner.classList.add("hidden");
      return;
    }

    eligibilityBanner.className = "eligibility-banner " + result.codigo;
    const iconSvg =
      result.codigo === "elegivel"
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex-shrink:0;margin-top:2px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
        : result.codigo === "verificar"
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex-shrink:0;margin-top:2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex-shrink:0;margin-top:2px;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

    eligibilityBanner.innerHTML =
      iconSvg +
      "<div><strong>" +
      result.titulo +
      "</strong><span>" +
      result.descricao +
      "</span></div>";
  }

  form.addEventListener("change", function (e) {
    if (e.target && e.target.type === "radio") {
      syncSelectedCards();
    }
    if (
      [
        "casadoCivil",
        "condicaoCivil",
        "casadoIgreja",
        "igrejaCasamento",
        "fezCurso",
        "assinouAta"
      ].includes(e.target.name)
    ) {
      updateConditionalUI();
    }
  });

  /* ========================================================================
     Máscara de WhatsApp / Telefone
     ======================================================================== */

  whatsappInput.addEventListener("input", function (e) {
    let digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    if (digits.length > 6) {
      if (digits.length === 11) {
        e.target.value =
          "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
      } else {
        e.target.value =
          "(" + digits.slice(0, 2) + ") " + digits.slice(2, 6) + "-" + digits.slice(6);
      }
    } else if (digits.length > 2) {
      e.target.value = "(" + digits.slice(0, 2) + ") " + digits.slice(2);
    } else if (digits.length > 0) {
      e.target.value = "(" + digits;
    } else {
      e.target.value = "";
    }
  });

  /* ========================================================================
     Envio do Formulário
     ======================================================================== */

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (isSubmitting) return;

    const voluntario = volunteerInput.value.trim();
    if (!voluntario) {
      volunteerEditWrap.classList.remove("hidden");
      volunteerSavedWrap.classList.add("hidden");
      volunteerInput.focus();
      return showValidationError("Informe o nome do voluntário antes de enviar.", volunteerInput);
    }
    safeSetStorage(VOLUNTEER_KEY, voluntario);
    renderVolunteerState();

    const situacaoCasal = getRadioValue("situacaoCasal");
    const casadoCivil = getRadioValue("casadoCivil");
    const condicaoCivil = getRadioValue("condicaoCivil");
    const casadoIgreja = getRadioValue("casadoIgreja");
    const sonhoAltar = getRadioValue("sonhoAltar");
    const igrejaCasamento = getRadioValue("igrejaCasamento");
    const fezCurso = getRadioValue("fezCurso");
    const assinouAta = getRadioValue("assinouAta");
    const proximoPasso = getRadioValue("proximoPasso");

    const nomePessoaEl = document.getElementById("nomePessoa");
    const nomePessoa = nomePessoaEl.value.trim();
    const nomeConjuge = document.getElementById("nomeConjuge").value.trim();
    const whatsapp = whatsappInput.value.trim();
    const bairroIgreja = document.getElementById("bairroIgreja").value.trim();
    const observacoes = document.getElementById("observacoes").value.trim();

    // Validações condicionais com rolagem direta para o campo pendente
    if (!situacaoCasal) {
      return showValidationError("Selecione a situação atual do casal.", "fgSituacao");
    }
    if (!casadoCivil) {
      return showValidationError("Informe se o casal é casado no civil.", "fgCivil");
    }
    if (casadoCivil === "Não" && !condicaoCivil) {
      return showValidationError(
        "Informe se o casal tem condições de pagar o casamento civil.",
        "blocoCondicaoCivil"
      );
    }
    if (!casadoIgreja) {
      return showValidationError("Informe se já são casados na igreja.", "fgIgreja");
    }
    if (casadoIgreja === "Não" && !sonhoAltar) {
      return showValidationError(
        "Informe se têm o sonho/interesse de casar na igreja.",
        "blocoNaoCasadoIgreja"
      );
    }
    if (casadoIgreja === "Sim" && !igrejaCasamento) {
      return showValidationError(
        "Informe onde foi o casamento religioso.",
        "blocoSimCasadoIgreja"
      );
    }
    if (casadoIgreja === "Sim" && igrejaCasamento === "Na Universal") {
      if (!fezCurso) {
        return showValidationError(
          "Informe se fizeram o curso preparatório.",
          "blocoDetalhesUniversal"
        );
      }
      if (!assinouAta) {
        return showValidationError(
          "Informe se assinaram ata na cerimônia.",
          "blocoDetalhesUniversal"
        );
      }
    }
    if (!nomePessoa) {
      nomePessoaEl.focus();
      return showValidationError("Informe o nome da pessoa abordada.", nomePessoaEl);
    }
    if (whatsapp.replace(/\D/g, "").length < 10) {
      whatsappInput.focus();
      return showValidationError("Informe um WhatsApp/telefone válido com DDD.", whatsappInput);
    }
    if (!proximoPasso) {
      return showValidationError(
        "Selecione o nível de interesse / próximo passo.",
        "fgProximoPasso"
      );
    }

    const payload = {
      voluntario: voluntario,
      situacaoCasal: situacaoCasal,
      casadoCivil: casadoCivil,
      condicaoCivil: condicaoCivil,
      casadoIgreja: casadoIgreja,
      sonhoAltar: sonhoAltar,
      igrejaCasamento: igrejaCasamento,
      fezCurso: fezCurso,
      assinouAta: assinouAta,
      nomePessoa: nomePessoa,
      nomeConjuge: nomeConjuge,
      whatsapp: whatsapp,
      bairroIgreja: bairroIgreja,
      proximoPasso: proximoPasso,
      observacoes: observacoes
    };

    isSubmitting = true;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Enviando registro...";

    try {
      const res = await window.CasamentoService.createRecord(payload);

      const nomeCasal = res.record.nomeConjuge
        ? res.record.nomePessoa + " & " + res.record.nomeConjuge
        : res.record.nomePessoa;

      successSummary.innerHTML =
        "<strong>Casal:</strong> " +
        escapeHtml(nomeCasal) +
        "<br><strong>WhatsApp:</strong> " +
        escapeHtml(res.record.whatsapp) +
        "<br><strong>Classificação:</strong> " +
        escapeHtml(res.record.elegibilidadeLabel) +
        "<br><strong>Civil:</strong> " +
        escapeHtml(res.record.casadoCivil) +
        (res.record.condicaoCivil
          ? " (" + escapeHtml(res.record.condicaoCivil) + ")"
          : "");

      if (res.mode === "offline") {
        successSyncText.textContent =
          "Salvo no modo offline! Abra o Painel da Equipe em outra aba para ver este registro chegando em tempo real.";
      } else {
        successSyncText.textContent = res.googleFormsOk
          ? "Enviado simultaneamente para o Firebase (Painel em tempo real) e para o Google Forms!"
          : "Salvo no Firebase (Painel em tempo real)!";
      }

      form.classList.add("hidden");
      successPanel.classList.remove("hidden");
      successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      console.error(err);
      if (err && err.code === "permission-denied") {
        showToast("Permissão negada no Firestore. Verifique se publicou as Regras de segurança.");
      } else if (err && err.code === "network-timeout") {
        showToast("Conexão lenta ou instável. Tente enviar novamente.");
      } else {
        showToast("Erro ao salvar registro. Verifique a conexão com a internet.");
      }
    } finally {
      isSubmitting = false;
      btnSubmit.disabled = false;
      btnSubmit.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar Levantamento';
    }
  });

  btnNovoCadastro.addEventListener("click", function () {
    autoMarkedChurchNo = false;
    form.reset();
    renderVolunteerState();
    updateConditionalUI();
    successPanel.classList.add("hidden");
    form.classList.remove("hidden");
    document.getElementById("levantamento").scrollIntoView({ behavior: "smooth" });
  });

  /* ========================================================================
     Utilitários
     ======================================================================== */

  function showValidationError(msg, target) {
    showToast(msg);
    const el = typeof target === "string" ? document.getElementById(target) : target;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("field-error-highlight");
      void el.offsetWidth;
      el.classList.add("field-error-highlight");
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
    }, 3600);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Inicializa e pré-carrega o SDK do Firebase em segundo plano
  initEnvironmentUI();
  renderVolunteerState();
  updateConditionalUI();
  if (window.CasamentoService && window.CasamentoService.preloadFirebase) {
    window.CasamentoService.preloadFirebase();
  }
})();
