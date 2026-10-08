(() => {
  "use strict";

  let deferredPrompt = null;
  const installButton = document.getElementById("installButton");
  const networkPill = document.getElementById("networkPill");
  const dialog = document.getElementById("installDialog");
  const dialogBody = document.getElementById("installDialogBody");
  const closeDialog = document.getElementById("closeInstallDialog");
  const toast = document.getElementById("toast");

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function updateNetwork() {
    if (!networkPill) return;
    const online = navigator.onLine;
    networkPill.textContent = online ? "Онлайн" : "Офлайн";
    networkPill.classList.toggle("offline", !online);
  }

  function updateInstallButton() {
    if (!installButton) return;
    if (isStandalone()) {
      installButton.hidden = true;
      return;
    }
    installButton.hidden = false;
    installButton.textContent = "Установить";
  }

  function openInstallHelp() {
    if (!dialog || !dialogBody) return;
    if (isIOS) {
      dialogBody.innerHTML = `
        <p><strong>На iPhone/iPad:</strong></p>
        <ol>
          <li>Открой этот сайт именно в <strong>Safari</strong>.</li>
          <li>Нажми кнопку <strong>«Поделиться»</strong> внизу экрана.</li>
          <li>Выбери <strong>«На экран Домой»</strong>.</li>
          <li>Нажми <strong>«Добавить»</strong>.</li>
        </ol>
        <p class="dialog-note">После первого открытия приложение сохранит основные файлы и сможет запускаться офлайн.</p>`;
    } else {
      dialogBody.innerHTML = `
        <p>Если автоматическая установка не появилась, открой меню браузера и выбери <strong>«Установить приложение»</strong> или <strong>«Добавить на главный экран»</strong>.</p>
        <p class="dialog-note">На компьютере Chrome/Edge кнопка установки также может находиться справа в адресной строке.</p>`;
    }
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;
    updateInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    updateInstallButton();
    showToast("Pathology Trainer установлен");
  });

  installButton?.addEventListener("click", async () => {
    if (isStandalone()) return;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      updateInstallButton();
      return;
    }
    openInstallHelp();
  });

  closeDialog?.addEventListener("click", () => dialog?.close?.());
  dialog?.addEventListener("click", event => {
    if (event.target === dialog) dialog.close?.();
  });

  window.addEventListener("online", updateNetwork);
  window.addEventListener("offline", updateNetwork);
  updateNetwork();
  updateInstallButton();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("./sw.js");
        await registration.update();
      } catch {
        showToast("Офлайн-режим не удалось включить");
      }
    });
  }
})();
