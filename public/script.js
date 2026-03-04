document.addEventListener('DOMContentLoaded', () => {
    
    // ===============================
    // 1. SIDEBAR
    // ===============================
    const openSidebarBtn = document.getElementById('openSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');

    function openSidebar() {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (openSidebarBtn) openSidebarBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    // ===============================
    // 2. UPLOAD UI
    // ===============================
    const triggerButtons = document.querySelectorAll('.trigger-upload-btn');
    const fileInput = document.getElementById('fileInput');

    const uploadOverlay = document.getElementById('uploadOverlay');
    const closeOverlayBtn = document.getElementById('closeOverlayBtn');
    const uploadForm = document.getElementById('uploadForm');

    const previewArea = document.getElementById('previewArea');
    const imagePreview = document.getElementById('imagePreview');
    const controlsArea = document.getElementById('controlsArea');
    const submitBtn = document.getElementById('submitBtn');

    const loading = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const resultImage = document.getElementById('resultImage');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const errorMsg = document.getElementById('errorMsg');

    // buka file selector
    triggerButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.value = '';
            fileInput.click();
        });
    });

    // saat file dipilih
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileSelect(fileInput.files[0]);
        }
    });

    function handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            alert('Harap upload file gambar.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            resetModalState();
            imagePreview.src = e.target.result;
            previewArea.style.display = 'block';
            controlsArea.style.display = 'block';
            uploadOverlay.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    closeOverlayBtn.addEventListener('click', () => {
        uploadOverlay.classList.add('hidden');
        fileInput.value = '';
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            uploadOverlay.classList.add('hidden');
            setTimeout(() => fileInput.click(), 300);
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

    // ===============================
    // 3. BACKEND REQUEST
    // ===============================
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = fileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        formData.append('scale', document.getElementById('scale').value);

        submitBtn.disabled = true;
        controlsArea.style.display = 'none';
        loading.classList.remove('hidden');
        errorMsg.classList.add('hidden');

        try {
            const response = await fetch('/api/upscale', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log("Response backend:", data);

            if (!data.success) {
                throw new Error(data.error || 'Gagal memproses gambar.');
            }

            // ===============================
            // FIX DOWNLOAD BASE64
            // ===============================
            resultImage.src = data.image;

            downloadBtn.href = data.image;
            downloadBtn.download = "deepimage-hd.png";

            loading.classList.add('hidden');
            resultDiv.classList.remove('hidden');

        } catch (error) {
            loading.classList.add('hidden');
            controlsArea.style.display = 'block';
            errorMsg.textContent = error.message;
            errorMsg.classList.remove('hidden');
            submitBtn.disabled = false;
        }
    });

});