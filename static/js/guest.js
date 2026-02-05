document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // Tab Logic
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        });
    });

    // Danmu Logic
    const danmuForm = document.getElementById('danmu-form');
    const danmuInput = document.getElementById('danmu-input');
    const danmuFeedback = document.getElementById('danmu-feedback');

    danmuForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = danmuInput.value.trim();

        if (text) {
            socket.emit('send_danmu', {
                text: text,
                timestamp: Date.now()
            });

            danmuInput.value = '';
            showFeedback(danmuFeedback, 'Message sent successfully!', 'success');
        }
    });

    // Photo Upload Logic
    const photoForm = document.getElementById('photo-form');
    const fileInput = document.getElementById('photo-input');
    const photoFeedback = document.getElementById('photo-feedback');
    const photoBtn = document.getElementById('photo-btn');

    photoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = fileInput.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showFeedback(photoFeedback, 'File too large (max 5MB).', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        photoBtn.disabled = true;
        photoBtn.textContent = 'Uploading...';

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                fileInput.value = ''; // clear input
                showFeedback(photoFeedback, 'Photo sent! Waiting for approval.', 'success');
            } else {
                showFeedback(photoFeedback, 'Upload failed.', 'error');
            }
        } catch (err) {
            console.error(err);
            showFeedback(photoFeedback, 'Network error.', 'error');
        } finally {
            photoBtn.disabled = false;
            photoBtn.textContent = 'Send Photo';
        }
    });

    function showFeedback(el, msg, type) {
        el.textContent = msg;
        el.className = `feedback ${type}`;
        setTimeout(() => {
            el.className = 'feedback';
            el.style.display = 'none';
        }, 3000);
    }
});
