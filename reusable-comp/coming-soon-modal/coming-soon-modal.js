function loadComingSoonModal(namaFitur) {
    fetch('../reusable-comp/coming-soon-modal/coming-soon-modal.html')
    .then(res => {
        if (!res.ok) {
            throw new Error(`Fetch gagal: ${res.status} ${res.statusText}`);
        }
        return res.text();
    })
    .then(dataRes => {
        document.getElementById('coming-soon-container').innerHTML = dataRes;

        const namaFiturEl = document.getElementById('nama-fitur');
        namaFiturEl.textContent = namaFitur;

        // fungsi yang beneran munculin modal + jalanin countdown
        function showComingSoonModal() {
            const comingSoonModal = new bootstrap.Modal(document.getElementById('coming-soon-modal'));
            comingSoonModal.show();

            let countdown = 10;
            const totalCountdown = 10,
                countdownNumber = document.getElementById('countdown-number'),
                countdownBar = document.getElementById('countdown-bar');

            countdownNumber.textContent = countdown;
            countdownBar.style.width = '100%';

            const interval = setInterval(() => {
                countdown--;
                countdownNumber.textContent = countdown;
                countdownBar.style.width = (countdown / totalCountdown) * 100 + '%';

                if (countdown <= 0) {
                    clearInterval(interval);
                    comingSoonModal.hide();
                }
            }, 1000);
        }

        // cek offcanvas: kalau lagi kebuka (mobile), tunggu bener2 nutup dulu baru show modal
        const offcanvasEl = document.getElementById('offcanvasNavbar');
        const offcanvasInstance = offcanvasEl ? bootstrap.Offcanvas.getInstance(offcanvasEl) : null;

        if (offcanvasInstance) {
            offcanvasEl.addEventListener('hidden.bs.offcanvas', showComingSoonModal, { once: true });
            offcanvasInstance.hide();
        } else {
            // desktop / offcanvas ga kebuka -> langsung show
            showComingSoonModal();
        }
    })
    .catch(err => console.error('Error loading coming-soon modal:', err));
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.coming-soon-btn');
    if (!btn) return;

    e.preventDefault();
    const namaFitur = btn.dataset.feature;
    loadComingSoonModal(namaFitur);
});