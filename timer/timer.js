// fetch navbar-fitur
fetch('../navbar-fitur/navbar-fitur-digilog.html')
.then(response => response.text())
.then(data => {
    document.getElementById('navbar-container').innerHTML = data;
    setupNavbarFiturLogic();
})
.catch(error => {
    console.error('gagal load navbar-fitur:', error);
});

// fetch date-time
fetch('../reusable-comp/date-time-for-fitur/date-time.html')
.then(response => response.text())
.then(data => {
    document.getElementById('date-time-container').innerHTML = data;
    dateTimeInit();
})
.catch(error => {
    console.error('gagal load date-time:', error);
})

// fetch footer
fetch ('../footer/footer-digilog.html')
.then(response => response.text())      
.then(data => {
    document.getElementById('footer-container').innerHTML = data;
})
.catch(error => {
    console.error('gagal load footer:', error)
})

// element
const inputsSection = document.getElementById('inputs-section'),
      modeBiasaRadio = document.getElementById('mode-timer-biasa'),
      modePomodoroRadio = document.getElementById('mode-timer-pomodoro'),
      namaTimer = document.getElementById('input-nama-timer'),
      sectionModeBiasa = document.getElementById('section-mode-biasa'),
      sectionModePomodoro = document.getElementById('section-mode-pomodoro'),
      durasiJamTimer = document.getElementById('durasi-jam-timer-biasa'),
      durasiMenitTimer = document.getElementById('durasi-menit-timer-biasa'),
      durasiDetikTimer = document.getElementById('durasi-detik-timer-biasa'),

      toggleSettingPomodoroBtn = document.getElementById('toggle-setting-pomodoro-btn'),
      toggleSettingPomodoroIcon = document.getElementById('toggle-setting-pomodoro-icon'),
      pomodoroSettings = document.getElementById('pomodoro-settings'),

      jamPomodoro = document.getElementById('jam-pomodoro'),
      menitPomodoro = document.getElementById('menit-pomodoro'),
      detikPomodoro = document.getElementById('detik-pomodoro'),
      jamIstirahat = document.getElementById('jam-istirahat'),
      menitIstirahat = document.getElementById('menit-istirahat'),
      detikIstirahat = document.getElementById('detik-istirahat'),
      jumlahPengulangan = document.getElementById('jumlah-pengulangan'),
      unlimitedPengulangan = document.getElementById('unlimited-pengulangan'),

      runningTimer = document.getElementById('running-timer'),
      runningTimerName = document.getElementById('running-timer-name'),
      displayTimer = document.getElementById('display-timer'),
      progressBar = document.getElementById('progress-bar'),
      startTimerBtn = document.getElementById('startBtn'),
      pauseTimerBtn = document.getElementById('pauseBtn'),
      resetTimerBtn = document.getElementById('resetBtn'),

      statusText = document.getElementById('status-text'),
      loadingState = document.getElementById('loading-state'),
      resultsEmpty = document.getElementById('results-empty'),
      resultsTimerTable = document.getElementById('results-timer-table'),
      hasilTimer = document.getElementById('hasil-timer'),
      todayDateBadge = document.getElementById('today-date-badge'),
      saveNote = document.getElementById('save-note'),

      triggerModal = document.getElementById('trigger-modal'),
      triggerModalBody = document.getElementById('trigger-modal-body'),
      autoCloseBar = document.getElementById('auto-close-bar'),
      countdownTriggerModal = document.getElementById('countdown-trigger-modal'),
      modalCloseBtn = document.getElementById('modal-close-btn'),
      triggerModalCloseX = document.getElementById('trigger-modal-close-x')
;

let autoCloseTimeout = null,
    autoCloseInterval = null;
const autoCloseSecondTime = 10000;

toggleSettingPomodoroBtn.addEventListener('click', () => {
    const isHidden = pomodoroSettings.classList.contains('d-none');
    pomodoroSettings.classList.toggle('d-none');
    toggleSettingPomodoroIcon.className = isHidden ? 'fa-solid fa-caret-up' : 'fa-solid fa-caret-down';
});

function showTriggerModal(message) {
    triggerModalBody.textContent = message;
    triggerModal.classList.add('show', 'd-block');
    triggerModal.style.backgroundColor = 'rgba(0,0,0,0.6)';

    clearTimeout(autoCloseTimeout);
    clearInterval(autoCloseInterval);

    const totalSecond = autoCloseSecondTime / 1000; // 10000ms -> 10 detik
    let secondLeft = totalSecond;

    // matikan transisi CSS, bar dikontrol manual biar sinkron sama angka detik
    autoCloseBar.style.transition = 'none';
    autoCloseBar.style.width = '100%';
    countdownTriggerModal.textContent = secondLeft;

    autoCloseInterval = setInterval(() => {
        secondLeft--;
        countdownTriggerModal.textContent = Math.max(secondLeft, 0);

        const percent = (Math.max(secondLeft, 0) / totalSecond) * 100;
        autoCloseBar.style.width = `${percent}%`;

        if(secondLeft <= 0) {
            clearInterval(autoCloseInterval);
        }
    }, 1000);

    autoCloseTimeout = setTimeout(() => {
        hideTriggerModal();
    }, autoCloseSecondTime);
}

function hideTriggerModal() {
    clearInterval(autoCloseInterval);
    clearTimeout(autoCloseTimeout);
    triggerModal.classList.remove('show', 'd-block');
    triggerModal.style.backgroundColor = '';
}

modalCloseBtn.addEventListener('click', () => {
    hideTriggerModal();
}); 

triggerModalCloseX.addEventListener('click', () => {
    hideTriggerModal();
});

triggerModal.addEventListener('click', (e) => {
   if(e.target === triggerModal) hideTriggerModal();
});


// STATE
let mode = 'biasa',
    totalSeconds = 0,
    reminingSeconds = 0,
    intervalTimer = null,
    currentName = '',
    currentPhase = null,
    currentRepeat = 1,
    totalRepeat = 1,
    focusDuration = 0,
    breakDuration = 0,
    currentDayKey = null,
    results = []
;

// STATE FOR AUDIO
let audioCtx = null;
function getAudioCtx() {
    if(!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playBeep(frequency, duration, volume =0.15, type ='sine') {
    try {
        const ctx = getAudioCtx(),
              oscillator = ctx.createOscillator(),
              gainNode = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gainNode.gain.value = volume;
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        
        gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
        oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
        // kalau error = diem
    }
}

function playTickSound() {
    playBeep(1000, 0.1, 0.1, 'square');
}

function playAlarmSound() {
    const beepTimes = [0, 0.4, 0.8, 1.2, 1.6, 2.0];

    beepTimes.forEach((delay, i) => {
        setTimeout(() => {
            playBeep(i % 2 === 0 ? 1046 : 784, 0.45, 0.35, 'triangle'), delay * 1000;
        })
    })
}

// BTN
modeBiasaRadio.addEventListener('change', () => {
    mode = 'biasa';
    sectionModeBiasa.classList.remove('d-none');
    sectionModePomodoro.classList.add('d-none');
});

modePomodoroRadio.addEventListener('change', () => {
    mode = 'pomodoro';
    sectionModeBiasa.classList.add('d-none');
    sectionModePomodoro.classList.remove('d-none');
});

unlimitedPengulangan.addEventListener('change', () => {
    jumlahPengulangan.disabled = unlimitedPengulangan.checked;
});

function todayKey() {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function todayLabel() {
    return new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
}

function storageKey(dayKey){
    return `timer-results:${dayKey}`
}


async function loadResultsForToday() {
    const key = todayKey();
    currentDayKey = key;
    todayDateBadge.textContent = todayLabel();
    loadingState.classList.remove('d-none');
    resultsEmpty.classList.add('d-none');
    resultsTimerTable.classList.add('d-none');

    try {
        const stored = await window.storage.get(storageKey(key), false);
        results = stored && stored.value ? JSON.parse(stored.value) : [];
    } catch (error) {
        results = [];
    }

    loadingState.classList.add('d-none');
    renderResults();
}

async function saveResults() {
    try {
        const result = await window.storage.set(storageKey(currentDayKey), JSON.stringify(results), false);
        saveNote.classList.toggle('text-danger', !result);
        saveNote.textContent = result ? 'Berhasil disimpan' : 'Gagal disimpan, coba lagi.';
    } catch (error) {
        saveNote.classList.add('text-danger');
        saveNote.textContent = 'Gagal menyimpan data: ' + error.message;
    }
}

function formatRepeat(totalRepeat) {
    return totalRepeat === Infinity ? '∞' : totalRepeat;
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

function updateDisplayTimer() {
    displayTimer.textContent = formatTime(reminingSeconds);

    const percent = totalSeconds > 0 ? (reminingSeconds / totalSeconds) * 100 : 0;
    progressBar.style.width = `${percent}%`;

    displayTimer.classList.toggle('finished', reminingSeconds <= 0);
    progressBar.classList.toggle('phase-break', currentPhase === 'break');
}

function updateRunningLabel() {
    if (mode === 'pomodoro') {
        const phaseLabel = currentPhase === 'fokus' ? 'Pomodoro' : 'Istirahat';
        runningTimerName.textContent = `${currentName} - ${phaseLabel} (Pengulangan ${currentRepeat} / ${formatRepeat(totalRepeat)})`;
    } else {
        runningTimerName.textContent = `${currentName}`;
    }
}

async function addResult(name, modeVal, phaseLabel, target, used, status) {
    if (currentDayKey !== todayKey()) {
        await loadResultsForToday();
    }

    const now = new Date();
    results.unshift({
        name,
        mode: modeVal,
        phaseLabel,
        target,
        used,
        status,
        time: now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    })

    renderResults();
    await saveResults();
}

function renderResults() {
    if (results.length === 0) {
        resultsEmpty.classList.remove('d-none');
        resultsTimerTable.classList.add('d-none');
        return;
    }

    resultsEmpty.classList.add('d-none');
    resultsTimerTable.classList.remove('d-none');
    hasilTimer.innerHTML = results.map(result => `
        <tr>
            <td>${result.name}</td>
            <td><span class='badge ${result.mode === 'pomodoro' ? 'badge-mode-belajar' : 'badge-mode-biasa'}'>${result.mode}</span></td>
            <td>${result.phaseLabel}</td>
            <td>${result.target}</td>
            <td>${result.used}</td>
            <td><span class='badge ${result.status === 'selesai' ? 'badge-mode-selesai' : 'badge-mode-reset'}'>${result.status}</span></td>
            <td>${result.time}</td>
        </tr>
    `).join('');
}

// 
function resetTampilan() {
    inputsSection.classList.remove('d-none');
    runningTimer.classList.add('d-none');
    runningTimerName.classList.add('d-none');
    startTimerBtn.classList.remove('d-none');
    pauseTimerBtn.classList.add('d-none');
    resetTimerBtn.classList.add('d-none');
    if(mode === 'pomodoro') {
        pomodoroSettings.classList.remove('d-none');
        toggleSettingPomodoroIcon.className = 'fa-solid fa-caret-up';
    }
    namaTimer.disabled = false;
    durasiJamTimer.disabled = false;
    durasiMenitTimer.disabled = false;
    durasiDetikTimer.disabled = false;
    
    jamPomodoro.disabled = false;
    menitPomodoro.disabled = false;
    detikPomodoro.disabled = false;
    jamIstirahat.disabled = false;
    menitIstirahat.disabled = false;
    detikIstirahat.disabled = false;

    jumlahPengulangan.disabled = unlimitedPengulangan.checked;
    unlimitedPengulangan.disabled = false;
    modeBiasaRadio.disabled = false;
    modePomodoroRadio.disabled = false;
    currentPhase = null;

    clearInterval(intervalTimer);
    intervalTimer = null;
}

function startTimerInterval() {
    getAudioCtx();
    updateDisplayTimer();
    updateRunningLabel();
    intervalTimer = setInterval (tick, 1000);
}

async function tick() {
    if(reminingSeconds > 0) {
        reminingSeconds--;
        updateDisplayTimer();
        if(reminingSeconds > 0 && reminingSeconds <= 10) {
            playTickSound();
        }
        return
    }

    clearInterval(intervalTimer);
    playAlarmSound();

    if (mode === 'biasa') {
        await addResult(currentName, '-', '-', totalSeconds, totalSeconds, 'Selesai');
        statusText.textContent = `Timer "${currentName}" selesai!`;
        resetTampilan();
        return;
    }

    const phaseLabel = currentPhase === 'fokus' ? 'Pomodoro' : 'Istirahat';
    await addResult(currentName, 'pomodoro', phaseLabel, totalSeconds, totalSeconds, 'Selesai');

    if (currentPhase === 'fokus') {
        // baru selesai fokus -> lanjut ke istirahat
        currentPhase = 'break';
        totalSeconds = breakDuration;
        reminingSeconds = breakDuration;
        statusText.textContent = `Waktunya istirahat, (Siklus ${currentRepeat}/${formatRepeat(totalRepeat)})`;
        startTimerInterval();
    } else {
        // baru selesai istirahat -> cek apakah masih ada siklus berikutnya
        if (currentRepeat < totalRepeat) {
            currentRepeat++;
            currentPhase = 'fokus';
            totalSeconds = focusDuration;
            reminingSeconds = focusDuration;
            statusText.textContent = `Waktunya belajar, (Siklus ${currentRepeat}/${formatRepeat(totalRepeat)})`;
            startTimerInterval();
        } else {
            statusText.textContent = `Semua ${formatRepeat(totalRepeat)} siklus belajar selesai! >.<`;
            resetTampilan();
        }
    }
}

startTimerBtn.addEventListener('click', async () => {
    const name = namaTimer.value;
    if (!name) {
        showTriggerModal('Isi nama / sesi terlebih dahulu ya!');
        namaTimer.focus();
        return;
    }

    if (currentDayKey !== todayKey()) {
        await loadResultsForToday();
    }

    currentName = name;

    if (mode==='biasa') {
        const h = parseInt(durasiJamTimer.value, 10) || 0,
              m = parseInt(durasiMenitTimer.value, 10) || 0,
              s = parseInt(durasiDetikTimer.value, 10) || 0,
              dur = (h*3600) + (m*60) + s;

        if (!dur || dur <= 0) {
            showTriggerModal('Isi durasi sesi terlebih dahulu ya!');
            return;
        }

        totalSeconds = dur;
        reminingSeconds = dur;
        currentPhase = null;
    } else {
        const fh = parseInt(jamPomodoro.value, 10) || 0,
              fm = parseInt(menitPomodoro.value, 10) || 0,
              fs = parseInt(detikPomodoro.value, 10) || 0,
              bh = parseInt(jamIstirahat.value, 10) || 0,
              bm = parseInt(menitIstirahat.value, 10) || 0,
              bd = parseInt(detikIstirahat.value, 10) || 0;
        
        focusDuration = (fh*3600) + (fm*60) + fs;
        breakDuration = (bh*3600) + (bm*60) + bd;
        totalRepeat = unlimitedPengulangan.checked ? Infinity : parseInt(jumlahPengulangan.value, 10);

        if (!focusDuration || focusDuration <= 0) {
            showTriggerModal('Durasi fokus harus lebih dari 0 (isi jam/menit/detik) ya!');
            return;
        }

        if (!breakDuration || breakDuration <= 0) {
            showTriggerModal('Durasi istirahat harus lebih dari 0 (isi jam/menit/detik) ya!');
            return;
        }

        if (!unlimitedPengulangan.checked && (!totalRepeat || totalRepeat <= 0)) {
            showTriggerModal('Jumlah pengulangan harus lebih dari 0, atau centang Pengulangan Tanpa Batas');
            return;
        }

        currentRepeat = 1;
        currentPhase = 'fokus';
        totalSeconds = focusDuration;
        reminingSeconds = focusDuration;
    }

    namaTimer.disabled = true;
    durasiJamTimer.disabled = true;
    durasiMenitTimer.disabled = true;
    durasiDetikTimer.disabled = true;

    jamPomodoro.disabled = true;
    menitPomodoro.disabled = true;
    detikPomodoro.disabled = true;
    jamIstirahat.disabled = true;
    menitIstirahat.disabled = true;
    detikIstirahat.disabled = true;

    jumlahPengulangan.disabled = true;
    unlimitedPengulangan.disabled = true;

    modeBiasaRadio.disabled = true;
    modePomodoroRadio.disabled = true;

    startTimerBtn.classList.add('d-none');
    pauseTimerBtn.classList.remove('d-none');
    resetTimerBtn.classList.remove('d-none');

    inputsSection.classList.add('d-none');
    runningTimer.classList.remove('d-none');
    runningTimerName.classList.remove('d-none');

    if(mode === 'pomodoro') {
        pomodoroSettings.classList.add('d-none');
        toggleSettingPomodoroIcon.className = 'fa-solid fa-caret-up';
    }

    statusText.textContent = mode === 'pomodoro'
        ? `Fokus siklus ${currentRepeat}/${formatRepeat(totalRepeat)})`
        : `${currentName} sedang berjalan...`;
        // : `Timer "${currentName}" dimulai!`;
    startTimerInterval();
})

resetTimerBtn.addEventListener('click', () => {
    resetTampilan();
    statusText.textContent = '';
    displayTimer.textContent = '00:00';
    progressBar.style.width = '0%';
});

pauseTimerBtn.addEventListener('click', () => {
    if (intervalTimer) {
        clearInterval(intervalTimer);
        intervalTimer = null;
        pauseTimerBtn.textContent = 'Lanjut';
    } else {
        intervalTimer = setInterval(tick, 1000);
        pauseTimerBtn.textContent = 'Jeda';
    }
});

loadResultsForToday();