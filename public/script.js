document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. LOGIKA SIDEBAR & MOBILE MENU ---
    const openSidebarBtn = document.getElementById('openSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');

    function openSidebar() {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Stop scroll belakang
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Resume scroll
    }

    if (openSidebarBtn) openSidebarBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);


    // --- 2. LOGIKA UPLOAD FOTO (UI FIX) ---
    
    const triggerButtons = document.querySelectorAll('.trigger-upload-btn');
    const fileInput = document.getElementById('fileInput');
    
    // Elemen Modal
    const uploadOverlay = document.getElementById('uploadOverlay');
    const closeOverlayBtn = document.getElementById('closeOverlayBtn');
    const uploadForm = document.getElementById('uploadForm');
    
    // Elemen di dalam Modal
    const previewArea = document.getElementById('previewArea');
    const imagePreview = document.getElementById('imagePreview');
    const controlsArea = document.getElementById('controlsArea');
    const submitBtn = document.getElementById('submitBtn');
    
    // Status/States
    const loading = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const resultImage = document.getElementById('resultImage');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const errorMsg = document.getElementById('errorMsg');

    // A. Buka File Selector saat tombol "Unggah" diklik
    triggerButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Reset dulu input value supaya bisa pilih file yang sama berulang kali
            fileInput.value = ''; 
            fileInput.click();
        });
    });

    // B. Saat file dipilih user
    fileInput.addEventListener('change', (e) => {
        if (fileInput.files && fileInput.files.length > 0) {
            handleFileSelect(fileInput.files[0]);
        }
    });

    function handleFileSelect(file) {
        // Validasi tipe file
        if (!file.type.startsWith('image/')) {
            alert('Harap upload file gambar (JPG, PNG).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            // Tampilkan Modal & Preview
            resetModalState(); // Bersihkan sisa state lama
            
            imagePreview.src = e.target.result;
            
            // PENTING: Pastikan display block agar terlihat
            previewArea.style.display = 'block';
            controlsArea.style.display = 'block';
            
            // Tampilkan Overlay Modal
            uploadOverlay.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    // C. Tombol Tutup Modal (X)
    closeOverlayBtn.addEventListener('click', () => {
        uploadOverlay.classList.add('hidden');
        fileInput.value = ''; // Clear input
    });

    // D. Tombol "Coba Lagi / Unggah Lainnya" di hasil akhir
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            uploadOverlay.classList.add('hidden'); // Tutup modal dulu
            setTimeout(() => {
                 fileInput.click(); // Buka file manager lagi
            }, 300);
        });
    }

    function resetModalState() {
        previewArea.style.display = 'none';
        controlsArea.style.display = 'none';
        loading.classList.add('hidden');
        resultDiv.classList.add('hidden');
        errorMsg.classList.add('hidden');
        submitBtn.disabled = false;
        errorMsg.textContent = '';
    }


    // --- 3. LOGIKA BACKEND (TIDAK DIUBAH, SESUAI PERINTAH) ---
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = fileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        formData.append('scale', document.getElementById('scale').value);

        // Update UI ke mode Loading
        submitBtn.disabled = true;
        controlsArea.style.display = 'none'; // Sembunyikan tombol kontrol
        loading.classList.remove('hidden');  // Tampilkan loading spinner
        errorMsg.classList.add('hidden');

        try {
            // === KONEKSI KE BACKEND ASLI (AMAN) ===
            const response = await fetch('/api/upscale', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Gagal memproses gambar.');
            }

            // Sukses
            resultImage.src = data.url;
            downloadBtn.href = data.url;
            
            loading.classList.add('hidden');
            resultDiv.classList.remove('hidden'); // Tampilkan hasil

        } catch (error) {
            // Gagal
            loading.classList.add('hidden');
            controlsArea.style.display = 'block'; // Tampilkan tombol lagi untuk retry
            errorMsg.textContent = error.message;
            errorMsg.classList.remove('hidden');
            submitBtn.disabled = false;
        }
    });

});
