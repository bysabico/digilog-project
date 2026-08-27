// fetch navbar-fitur
fetch('../navbar-fitur/navbar-fitur-digilog.html')
.then(response => response.text())
.then(data => {
    document.getElementById('navbar-container').innerHTML = data;
    setupNavbarFiturLogic();
    stopwatchInit();
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

// ===== ELEMENT =====
// DARI FILE HTML
const displayStopwatch = document.getElementById('display-stopwatch'),
      liveLapDiff      = document.getElementById('live-lap-diff'),
      startBtn         = document.getElementById('startBtn'),
      pauseBtn         = document.getElementById('pauseBtn'),
      resetBtn         = document.getElementById('resetBtn'),
      lapBtn           = document.getElementById('lapBtn'),
      lapsList         = document.getElementById('laps'),
      closeModalResult = document.getElementById('closeModalResult'),
      resultsSession   = document.getElementById('lapResults'),
      customStopwatch  = document.getElementsByClassName('custom-stopwatch'),
      notifStopwatch   = document.getElementById('notif-container'),
      lapTableHeader   = document.getElementById('lap-table-header')
;

// ELEMENT MODAL HUB KE BOOTSTRAP
let modal = new bootstrap.Modal(document.getElementById('lapModal'));

// PENCET LAP = ADA BUNYI
const beep = new Audio(
    "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg"
);

// bunyi notifikasi
const notifSound = new Audio (
    "https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg"
)

// ELEMEN STATE

// data awal stopwatch sebelum tombol start di klik
let startTime = 0;

// total waktu pemakaian stopwatch
let elapsedTime = 0;

// tampilan stopwatch saat tombol start & reset belum di klik
// null = belum pernah di klik
let startClockTime = null,
    endClockTime = null
;

// ID dari setInterval() untuk menggerakkan stopwatch
// null = belum ada interval aktif
let stopwatchInterval = null,
    autoSaveStopwatch = null
;

// perhitungan data lap
let lastLapTime = 0,
    lastDurationLap = 0,
    lapCount = 0
;

// simpan seluruh data lap dalam bentuk array []
// [] = banyak data yang tersimpan.
let laps = [];

// flags untuk notifikasi lap selama stopwatch masih berjalan
let notifFlags = {
    passedLastLap: false,
    passedFastestLap: false,
    passedSlowestLap: false
};

// === startStopwatch() = gerbang awal seluruh proses jalannya stopwatch ===
function startStopwatch() {

    if (stopwatchInterval) return;

    // untuk kebutuhan resultsSession() biar bisa tau jam berapa user klik start stopwatch
    if (elapsedTime === 0) {
        startClockTime = new Date();
    }
    
    // startTime hitungan mundur dari waktu real dengan elapsedTime (waktu yang sudah berjalan), agar saat pause dan mau resume perhitungan tidak mulai dari 0 lagi.
    startTime = Date.now() - elapsedTime;
    
    stopwatchInterval = setInterval(() => {

        elapsedTime = Date.now() - startTime;
        
        displayTimeStopwatch(elapsedTime);
        checkLapNotif();
        updateLiveLapDiffDisplay();

    }, 50);

    // agar data stopwatch tersimpan di localStorage setiap 1 detik, biar kalau ke refresh ga hilang datanya
    autoSaveStopwatch = setInterval(() => {
        if(stopwatchInterval) saveState();
    },1000)

    displayStopwatch.classList.add('running');
    displayStopwatch.classList.remove('fokus');

    for (let item of customStopwatch) {
        item.classList.add('tampilanSamarStopwatch'); 
    }

    startBtn.classList.add('d-none');
    pauseBtn.classList.remove('d-none');
    lapBtn.disabled = false;

    // simpan state di localStorage, agar saat ter refresh ga hilang datanya
    saveState();
}

// displayTimeStopwatch(elapsedTime) = komando tampilan stopwatch dilayar.
function displayTimeStopwatch(elapsedTime) {
    displayStopwatch.innerHTML = formatTime(elapsedTime);
}

// ===== FORMAT & DISPLAY =====
function formatTime(elapsedTime) {

    // perhitungan waktu detik, menit, jam, dan hari dari total waktu yang sudah berjalan (elapsedTime)
    const secStopwatch = Math.floor(elapsedTime / 1000),
          minStopwatch = Math.floor(secStopwatch / 60),
          hourStopwatch = Math.floor(minStopwatch / 60),
          dayStopwatch = Math.floor(hourStopwatch / 24)
    ;

    // format dasar stopwatch
    let formatStopwatch = `${String(hourStopwatch % 24).padStart(2, '0')}:${String(minStopwatch % 60).padStart(2, '0')}:${String(secStopwatch % 60).padStart(2, '0')}`;
    
    // format stopwatch jika lebih dari 1 hari
    if (dayStopwatch > 0) {
        formatStopwatch = `${String(dayStopwatch).padStart(2, '0')}:${formatStopwatch}`;
    } 

    return formatStopwatch;
}

// untuk menampilkan selisih waktu lap secara real-time saat stopwatch berjalan
function updateLiveLapDiffDisplay() {
    if (laps.length === 0) {
        liveLapDiff.textContent = '';
        return
    }

    const currentLapDuration = elapsedTime - lastLapTime,
          prevLapTime = laps[0].lapTime,
          diffLaps = currentLapDuration - prevLapTime,
          fastestAllLap = Math.min(...laps.map(l => l.lapTime)),
          slowestAllLap = Math.max(...laps.map(l => l.lapTime));
    
    liveLapDiff.textContent = formatTimeForLapDisplay(diffLaps);
    liveLapDiff.classList.remove('text-success', 'text-danger', 'text-warning');
    liveLapDiff.classList.add(
        currentLapDuration < fastestAllLap ? 'text-success' 
        : currentLapDuration > slowestAllLap ? 'text-danger' 
        : 'text-warning');
}

// untuk indikator selisih waktu lap
function formatTimeForLapDisplay(diffLapTime) {
    const sign = diffLapTime > 0 ? '+' : diffLapTime < 0 ? '-' : '';
    return sign + formatTime(Math.abs(diffLapTime));
}

// untuk menampilkan jam saat user klik start dan reset stopwatch
function formatClockTime(date) {
    if(!date) return '--:--:--';
    return date.toLocaleTimeString('en-US', {hour12: false});
}

// notif muncul di layar dan bunyi
function showNotif(message, type='info') {

    const now = new Date(),
          realTime = now.toLocaleTimeString('en-US', {hour12: false}),
          notifElement = document.createElement('div');
    
    notifElement.className = `notif-item notif-${type}`;
    notifElement.innerHTML = `
        <span class="notif-time">${realTime}</span>
        <span class="notif-message">${message}</span>
    `;

    notifStopwatch.appendChild(notifElement);

    notifSound.currentTime = 0;
    notifSound.play();

    setTimeout(() => {
        notifElement.remove();
    }, 5000);

}

// cek notifikasi
function checkLapNotif() {
    if (laps.length === 0) return;

    const currentLapDuration = elapsedTime - lastLapTime,
          lastLap = laps[0].lapTime,
          fastestAllLap = Math.min(...laps.map(l => l.lapTime)),
          slowestAllLap = Math.max(...laps.map(l => l.lapTime));

    if (currentLapDuration > lastLap && !notifFlags.passedLastLap) {
        showNotif('Melewati lap sebelumnya!', 'warning');
        notifFlags.passedLastLap = true;
    }

    if (laps.length >= 2) {
        if (currentLapDuration > slowestAllLap && !notifFlags.passedSlowestLap) {
            showNotif('Melewati slowest!', 'danger');
            notifFlags.passedSlowestLap = true;
        }

        if (currentLapDuration > fastestAllLap && !notifFlags.passedFastestLap) {
            showNotif('Melewati fastest!', 'info');
            notifFlags.passedFastestLap = true;
        }
    }
}

// = PAUSE =
function pauseStopwatch() {

    clearInterval(stopwatchInterval);

    stopwatchInterval = null;

    displayStopwatch.classList.remove('running');
    displayStopwatch.classList.add('fokus');
    for (let item of customStopwatch) { 
        item.classList.remove('tampilanSamarStopwatch'); 
    }

    pauseBtn.classList.add('d-none');
    startBtn.classList.remove('d-none');

    lapBtn.disabled = true;

    saveState();
}

// = RESET =
function resetStopwatch() {

    showResult();

}

// = SHOW RESULT =
function showResult() {
    pauseStopwatch();
    // panggil fungsi pauseStopwatch() agar saat reset trs hasil sesi keluar, akurat dan tidak ada penambahan waktu lagi (tepat saat klik reset)

    endClockTime = new Date();

    if (laps.length === 0) {
    // klo gxx ada lap (lap.length === 0) ini yep hasilnya;
        
    // isi body modal nampilin total waktu dan ket 'belum ada lap'
        resultsSession.innerHTML = ` 
            <div class="text-center">
                <div class="mb-3 text-muted">Belum ada lap ⏱️</div>
                <div class="fs-4 font-monospace fw-bold">Total Time: ${formatTime(elapsedTime)}</div>
                <div class="mt-3 text-secondary small"> 
                    Duration: ${formatClockTime(startClockTime)} - ${formatClockTime(endClockTime)}
                </div>
            </div>
        `;
        
        modal.show();
        // muncul modal

        return; 
        // return biar STOP (kode dibawah ini tidak tereksekusi).
    }

    // kalau lap ada~
    // fungsi untuk membandingkan lap secara keseluruhan (berdasarkan data yang sudah ada)
    const fastest = laps.reduce((prev, curr) =>
    // paling cepat dari data keseluruhan.
    // .reduce() = method js cari satu yang TERCEPAT

        curr.lapTime < prev.lapTime ? curr : prev
        // lap terbaru < lap sebelumnya, bandingin.
    );

    const slowest = laps.reduce((prev, curr) =>
    // paling cepat dari data keseluruhan.
    // .reduce() = method js cari satu yang TERLAMBAT

        curr.lapTime > prev.lapTime ? curr : prev
    );

    // delegasi html (getElementById) 
    // minta untuk masukin data html lewat js pakai perwakilan js (method js = .innerHTML)
    // makanya pakai backticks dan isinya elemen html 😎👍 
    resultsSession.innerHTML = `
        <div class="text-center">
            <div class="mb-3 text-success fs-5">
                <span class="fw-bold"> 🟢 Fastest Lap <br> </span>
                #${fastest.id} — ${formatTime(fastest.lapTime).replace(/<br><span[^>]*>|<\/span>/g, '.')}
            </div>
            
            <br>
            
            <div class="mb-3 text-danger">
                <span class="fw-bold"> 🔴 Slowest Lap <br> </span>
                #${slowest.id} — ${formatTime(slowest.lapTime).replace(/<br><span[^>]*>|<\/span>/g, '.')}
            </div> 
            
            <br>
            
            <div class="mb-2 text-secondary">
                Total Lap: ${laps.length}
            </div>

            <div class="mb-2 text-secondary">
                Total Time: ${formatTime(elapsedTime).replace(/<br><span[^>]*>|<\/span>/g, '.')}
            </div>

            <div class="text-secondary"> 
                Duration: ${formatClockTime(startClockTime)} - ${formatClockTime(endClockTime)}
            </div>
        </div>
    `;

    // modal~ its show time~ 🕺
    modal.show();
}

// = CLOSE MODAL =
function closeLapModal() {

    modal.hide();
    // modal balik ga keliatan (ansos)

    clearSession();
    // kalau klik close di modal = apuss 
    // alias mulai dari 0 lagi ya, kak
}

// = CLEAR SESSION =
function clearSession() {

    clearInterval(stopwatchInterval);
    // ini fungsi biar stopwatch yang sedang jalan terhapus saat klik reset
    // kayak tahun baru, kalau close = mulai ulang dari awal~
    // makanya pergerakkan stopwatchInterval (waktu stopwatchnya) dihapus

    // element state di setting kayak awal lagii karena saat clear session harus balik seperti awal
    startTime = 0;
    elapsedTime = 0;
    stopwatchInterval = null;

    lastLapTime = 0;
    lastDurationLap = 0;
    lapCount = 0;
    laps = [];

    startClockTime = null;
    endClockTime = null;

    notifFlags = {
        passedLastLap: false,
        passedFastestLap: false,
        passedSlowestLap: false
    }

    // kalau udh close, seluruh data di sesi itu = hilang permanen 🥷
    localStorage.removeItem('data-stopwatch');

    // tampilan awal balik yep, makanya ni fungsi dipanggil lagi
    displayTimeStopwatch(0);

    liveLapDiff.textContent = '';

    // bahkan css semua hapus untuk memulai lembaran baruu
    displayStopwatch.classList.remove('running', 'fokus');
    for (let item of customStopwatch) { 
        item.classList.remove('tampilanSamarStopwatch'); 
    }

    // list si laps juga kita kosongkan biar ga ovt (numpuk)
    lapsList.innerHTML = '';
    lapTableHeader.classList.add('d-none');

    // tombol start muncul
    startBtn.classList.remove('d-none');

    // tombol pause sembunyi
    pauseBtn.classList.add('d-none');

    // lap tombol nonaktif atau gak bisa dipencet
    lapBtn.disabled = true;
}

// = LAP =
function lap() {
// fungsi lap biar kalau klik lap, muncul datanya!

    if (!stopwatchInterval) return;
    // kalau stopwatchInterval diklik, maka nilainya jadi true (ada)
    // awalnya null = false, setelah di klik jadi true atau waktu stopwatch berjalan~

    const currentTime = elapsedTime,
    // elapsedTime di mirror dengan nilainya konstan agar selisih lap akurat.
    // kenapa ga lgsg elapsedTime aja? karena awalnya pakai let dan nilai let fleksibel (bikin hasil nilai lap ada selisih 0,001)

          lapTime = elapsedTime - lastLapTime
        //   ini variabel menghitung nilai lap.
    ;

    lastLapTime = currentTime;
    // waktu akhir lap = waktu elapsedTime (yg nilainya ga berubah, const)

    // lapDiff = selisih antara lapTime sekarang dengan lapTime sebelumnya
    // buat tau apakah lapTime sekarang lebih cepat atau lebih lambat dibanding lapTime sebelumnya
    // const lapDiff = lapTime - lastDurationLap;
    // lastDurationLap = lapTime;

    // variabel untuk mengetahui lap tercepat dari nilai keseluruhan data lap.
    const fastestAllLap = laps.length > 0 ? Math.min(...laps.map(l => l.lapTime)) : Infinity;
    const slowestAllLap = laps.length > 0 ? Math.max(...laps.map(l => l.lapTime)) : -Infinity;

    lapCount++;

    // .unshift = nambahin data baru paling atas di list
    laps.unshift({ 

        // tampilan pas klik lap, panggil aje variabel
        id: lapCount, 
        lapTime, 
        totalTime: currentTime 

    });

    renderLaps();

    // kalau nilai lapTime terbaru lebih kecil dari lapTime sebelumnya (lapDiff < 0), 
    // berarti lapTime sekarang lebih cepat, jadi dikasih efek glow dan suara beep~ untuk ngasih tau user~
    // if (lapCount > 1 && lapDiff < 0) {
    //     beep.play();
    //     displayStopwatch.classList.add('glow');
    //     setTimeout(() => displayStopwatch.classList.remove('glow'), 500);
    // }

    if (lapCount > 1 && lapTime < fastestAllLap) {
        beep.play();
        displayStopwatch.classList.add('glow');
        setTimeout(() => displayStopwatch.classList.remove('glow'), 500);
    }

    if (lapCount > 1 && lapTime > slowestAllLap) {
        beep.play();
        displayStopwatch.classList.add('glow-slowest');
        setTimeout(() => displayStopwatch.classList.remove('glow-slowest'), 500);
    }

    notifFlags = {
        passedLastLap: false,
        passedFastestLap: false,
        passedSlowestLap: false
    }

    saveState();

    // cek
    // console.log('lapTime:', lapTime);
    // console.log('lastDurationLap:', lastDurationLap);
    // console.log('lapDiff:', lapDiff);
}

// = RENDER LAPS =
function renderLaps() {
    lapsList.innerHTML = '';

    if (laps.length === 0) {
        lapTableHeader.classList.add('d-none');
        return;
    }; 

    lapTableHeader.classList.remove('d-none');

    // ada di bagian showResult() baca aja
    const fastest = laps.reduce((prev, curr) => curr.lapTime < prev.lapTime ? curr : prev);
    const slowest = laps.reduce((prev, curr) => curr.lapTime > prev.lapTime ? curr : prev);

    // kenapa pake forEach? forEach lebih simpel dari for of
    // ver for of;
    for (let categoryLap of laps) {

        // variabel penampung seluruh data lap (bagian bawah setelah di klik lap) saat dan setelah selesai sesi
        let lapPackage = '';
        let rowClass = '';

        if (categoryLap.lapTime === fastest.lapTime) {

            // pakai variabel lapPackage soalnya dia kan yg pegang semua data lap.
            // nah, kalau ada lap paling cepat (fastest) ditandain disini aturannya
            lapPackage = '<span class="badge">🟢</span>';

            rowClass = 'fastest-lap-row';
            
        } else if (categoryLap.lapTime === slowest.lapTime) {

            // pakai variabel lapPackage soalnya dia kan yg pegang semua data lap.
            // nah, kalau ada lap paling lambat (slowest) ditandain disini aturannya
            lapPackage = '<span class="badge">🔴</span>';

            rowClass = 'slowest-lap-row';

        }

        // buat div untuk nampung seluruh data lap
        // const divLapsData = document.createElement('div');

        const trLapsData = document.createElement('tr');
        
        trLapsData.className = rowClass;     
        trLapsData.innerHTML = `
            <td class="text-center">
                <small>
                    ${lapPackage || ' '}
                </small>
            </td>

            <td class="text-center">
                <strong>#${categoryLap.id}</strong>
            </td>

            <td class="text-center">    
                <small>
                    ${formatTime(categoryLap.lapTime).replace(/<br><span[^>]*>|<\/span>/g, '.')}
                </small>
            </td>

            <td class="text-center">
                <small>
                    ${formatTime(categoryLap.totalTime).replace(/<br><span[^>]*>|<\/span>/g, '.')}
                </small>
            </td>
        `

        lapsList.appendChild(trLapsData);

        // buat classnya biar bisa dimasukin ke div yang spesifik
        // divLapsData.classList.add('lap-data');

        // let lapDifference = '--';

        // // masukin isi dari div lap data yang udh dibuat tadi
        // divLapsData.innerHTML = `
        //     <div>
        //         <strong>Lap #${categoryLap.id}</strong> ${lapPackage}
        //     </div>

        //     <small>
        //         Lap : ${formatTime(categoryLap.lapTime).replace(/<br><span[^>]*>|<\/span>/g, '.')}
        //     </small>

        //     <small>
        //         Total Waktu : ${formatTime(categoryLap.totalTime).replace(/<br><span[^>]*>|<\/span>/g, '.')}
        //     </small>
        // `;

        // // ini yang bikin data lap muncul di layar
        // lapsList.appendChild(divLapsData);
    }

    // ver forEach;
    // laps.forEach(lap => {
    //     let lapPackage = '';

    //     // buat tampilin kata 'fastest' & 'slowest' di layar
    //     if (lap.lapTime === fastest) lapPackage = '<span class="badge bg-success">FASTEST</span>';
    //     else if (lap.lapTime === slowest) lapPackage = '<span class="badge bg-danger">SLOWEST</span>';

    //     // bikin div untuk list lap nya
    //     const div = document.createElement('div');

    //     // ini yang buat setiap klik lap bisa bertambah
    //     div.classList.add('lap-item');

    //     // ini yang buat format tampilan lap di layar
    //     // div ini yang buat ada 'title' fastest dan slowest.
    //     // small ini data waktu per klik lap dan total stopwatch pas di klik lap
    //     div.innerHTML = `
    //         <div>
    //             <strong>Lap #${lap.id}</strong> ${lapPackage}
    //         </div>
    //         <small>
    //             Lap : ${formatTime(lap.lapTime)} <br>
    //             Total : ${formatTime(lap.totalTime)}
    //         </small>
    //     `;

    //     // ini yang bikin tampilan per lap muncul di layar
    //     lapsList.appendChild(div);
    // });
}

// = SAVE STATE =
function saveState() {

    localStorage.setItem('data-stopwatch', JSON.stringify ({

        // call all state~
        elapsedTime,
        lastLapTime,
        lastDurationLap,
        lapCount,
        laps,

        // null = kosong atau tidak ada nilai awal stopwatchInterval (awal bgt di state),
        // macam bocah pendiem yang ga bisa diajak ngomong.
        // makanya kalau mau ngomong sama dia, butuh temen/orang yang paham sama dia,
        // dalam hal ini !! (double bang), dia yang nerjemahin maunya si stopwatchInterval
        // !! dia jadi penerjemah dan maksa si stopwatchInterval kalau nilai null (diem aja diajak ngomong) artinya dia gamau atau nilainya false
        // tapi kalau nilainya ada (si stopwatchInterval ngejawab alias ada pergerakan), tandanya dia mau atau true.
        
        startClockTime,
        endClockTime,
        running: !!stopwatchInterval,
        notifFlags

        // KENAPA KUDU !! soalnya biar akurat 
        // ibaratnya !! = sahabat deket nemplok tau baik-buruk kita dan null anak super ansos 🗿
        // kalau ! = temen biasa yang muka dua :< alias suka muter balikin fakta.
        // makanya, kasus running diatas butuh !!~
    }));
}

// = LOAD STATE =
function loadState() {

    // kotak memori dan biar ga dilupain pas ke refresh~
    // kalau user PERNAH klik start = ada isinya dan ga dilupain
    // tapi kalau GK PERNAH ya berarti kosong atau null dan 0 (sesuai aturan awal yg state)
    const load = JSON.parse(localStorage.getItem('data-stopwatch'));

    // data ini butuh ! satu aja cukup karena ada penahannya si return
    // kalau data ini nilainya null atau kosong, return jadi pengingat buat STOP ga lanjutin perintah dibawahnya
    // tapi kalau ada nilainya, si return ga nahan dan bakal lanjutin perintah selanjutnya
    // ! macam guru piket gerbang sekolah
    // kalau ga pakai dasi atau melanggar peraturan sekolah (null/0 = gaada nilai). Bakal di stop ga boleh masuk ke sekolah.
    // tapi kalau pakai dasi (ada nilai) maka boleh masuk sekolah~
    if (!load) {
        renderLaps();
        return;
    };

    // pengaturan data tersimpan dan tetap muncul di layar dan bisa dilanjutkan
    elapsedTime = load.elapsedTime;
    lastLapTime = load.lastLapTime;
    // lastDurationLap = load.lastDurationLap;
    lapCount = load.lapCount;
    laps = load.laps || [];

    notifFlags = load.notifFlags || {
        passedLastLap: false,
        passedFastestLap: false,
        passedSlowestLap: false
    };

    startClockTime = load.startClockTime ? new Date(load.startClockTime) : null;
    endClockTime = load.endClockTime ? new Date(load.endClockTime) : null;

    // balikin angka dan list lap ke layar
    displayTimeStopwatch(elapsedTime);
    renderLaps();

    // cek stopwatch terakhir pas web ke referesh / mati 
    // dia jalan atw gak?
    if (load.running) {

        // biar gaada BUG pas ke refresh
        // klik refresh dan lagi jalan, itu bisa crash tabrakan
        // kenapa?
        // refresh itu "kondisi menyendiri" atau mengosongkan seluruh operasi terhadap tampilan maupun perintah js (rehat sejenak)
        // nah, kalau refresh kelar, harapannya ya jalan biasa si stopwatch dan gaada konflik internal.
        // makanya ada clearInterval, dimana momen rehat sejenak (refresh) ini ga ikut dihitung jadi dianggap self reward
        // so ketika refresh udh selesai, stopwatch bisa lanjutin kerja lagi tanpa beban dengan suasa yang baru
        if (stopwatchInterval) 
        clearInterval (stopwatchInterval);

        startStopwatch();

    } else {

        // dengan kondisi diatas, maka di cek kembali tampilannya~ biar ga crash atau sesuai yang dimau
        startBtn.classList.remove('d-none');
        pauseBtn.classList.add('d-none');
        lapBtn.disabled = true;

        displayStopwatch.classList.add('fokus');
        displayStopwatch.classList.remove('running');
    }
}

// = EVENT LISTENER : biar fungsinya berjalan yep =
startBtn.addEventListener('click', startStopwatch);
pauseBtn.addEventListener('click', pauseStopwatch);
resetBtn.addEventListener('click', resetStopwatch);
lapBtn.addEventListener('click', lap);
closeModalResult.addEventListener('click', closeLapModal);

// event listener device
// let backspaceCount = 0;

let resultSessionOpen = false;

document.getElementById('lapModal').addEventListener('shown.bs.modal', () => {
    resultSessionOpen = true;
});
document.getElementById('lapModal').addEventListener('hidden.bs.modal', () => {
    resultSessionOpen = false;
});

document.addEventListener('keydown', (e) => {

    if (resultSessionOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeLapModal();
        return;
    }

    // space = start & pause
    if (e.code === 'Space') {
        e.preventDefault();
        if (stopwatchInterval) {
            pauseBtn.click();
        } else {
            startBtn.click();
        }
    } 

    // enter = lap
    if (e.code === 'Enter') {
        e.preventDefault();
        lapBtn.click();
    }

    // backspace = reset, modal otomatis show lewat showResult() -> modal.show()
    if (e.code === 'Backspace') {
        e.preventDefault();
        resetBtn.click();
    }  
});


// = INIT =
// kenapa yang dipangil cuma 4 ini?
// soalnya fungsi lain itu bergantung sama 'pergerakkan user'(klik = .addEventListener)
function stopwatchInit() {
    autoActiveNavbar(); //dari func navbar-fitur-digilog yep
    loadState();
}