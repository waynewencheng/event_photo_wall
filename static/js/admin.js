document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const photoGrid = document.getElementById('photo-grid');
    const emptyState = document.getElementById('empty-state');
    const clearBtn = document.getElementById('clear-btn');
    const msgQueue = document.getElementById('message-queue');
    const msgEmpty = document.getElementById('msg-empty');

    // QR Generation
    const qrDiv = document.getElementById('qr-preview');
    let qr = new QRCode(qrDiv, { width: 100, height: 100 });

    // Init QR
    updateQR();

    // Handle initial empty state
    checkEmptyState();
    checkMsgEmpty();

    // Socket Events
    socket.on('new_photo_waiting', (data) => {
        // data = { filename: '...' }
        addPhotoCard(data.filename);
    });

    socket.on('new_message_waiting', (data) => {
        addMessageCard(data);
    });

    // Config Functions
    window.updateConfig = async () => {
        const guestUrl = document.getElementById('guest-url-input').value.trim();
        const autoApprove = document.getElementById('auto-approve-toggle').checked;
        const showQr = document.getElementById('show-qr-toggle').checked;

        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest_url: guestUrl,
                    auto_approve: autoApprove,
                    show_qr: showQr
                })
            });
            alert('Settings saved!');
            updateQR();
        } catch (e) {
            console.error(e);
            alert('Error saving settings');
        }
    };

    function updateQR() {
        let url = document.getElementById('guest-url-input').value.trim();
        if (!url) url = window.location.origin + '/guest';
        // Check if user forgot protocol
        if (!url.startsWith('http')) url = window.location.origin + '/guest'; // fallback or fix?

        // Really if they typed ngrok.io we might want to prepend https://
        if (!url.match(/^https?:\/\//)) {
            // assumes relative path if no protocol, but if they typed "xyz.ngrok-free.app" we should prepend https
            if (url.includes('.')) {
                url = 'https://' + url;
            } else {
                url = window.location.origin + '/guest';
            }
        }

        qr.makeCode(url);
    }

    function addMessageCard(data) {
        // data = { text: '...', id: '...' }
        if (msgEmpty) msgEmpty.style.display = 'none';

        const div = document.createElement('div');
        div.className = 'message-item';
        div.id = `msg-${data.id}`;
        div.innerHTML = `
            <span class="message-text">${escapeHtml(data.text)}</span>
            <div class="card-actions" style="flex:0 0 150px;">
                 <button class="btn-approve" onclick="approveMessage('${data.id}', '${escapeHtml(data.text)}')">Approve</button>
                 <button class="btn-delete" onclick="discardMessage('${data.id}')">Discard</button>
            </div>
        `;
        msgQueue.prepend(div);
    }

    window.approveMessage = (id, text) => {
        socket.emit('approve_message', { id, text });
        removeMessage(id);
    };

    window.discardMessage = (id) => {
        removeMessage(id);
    };

    function removeMessage(id) {
        const el = document.getElementById(`msg-${id}`);
        if (el) el.remove();
        checkMsgEmpty();
    }

    function checkMsgEmpty() {
        if (msgQueue.children.length === 0 || (msgQueue.children.length === 1 && msgQueue.contains(msgEmpty))) {
            if (msgEmpty) msgEmpty.style.display = 'block';
        }
    }

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function (m) { return map[m]; });
    }

    // Button Actions
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all Danmu on the display?')) {
            socket.emit('clear_screen');
        }
    });

    // Helper: Add Photo Card
    function addPhotoCard(filename) {
        // Remove empty state if present
        if (emptyState) emptyState.style.display = 'none';

        const col = document.createElement('div');
        col.className = 'photo-card';
        col.id = `card-${filename}`;

        col.innerHTML = `
            <img src="/uploads/temp/${filename}" alt="Submission">
            <div class="card-actions">
                <button class="btn-approve" onclick="approvePhoto('${filename}')">Approve</button>
                <button class="btn-delete" onclick="deletePhoto('${filename}')">Delete</button>
            </div>
        `;

        // Prepend so newest is first
        photoGrid.prepend(col);
    }

    // Helper: Check Empty State
    function checkEmptyState() {
        if (photoGrid.children.length === 0 || (photoGrid.children.length === 1 && photoGrid.contains(emptyState))) {
            if (emptyState) emptyState.style.display = 'block';
        } else {
            if (emptyState) emptyState.style.display = 'none';
        }
    }

    // Global functions for inline onclick (simple approach)
    window.approvePhoto = async (filename) => {
        try {
            const res = await fetch(`/api/approve/${filename}`, { method: 'POST' });
            if (res.ok) {
                removeCard(filename);
            } else {
                alert('Error approving photo');
            }
        } catch (e) {
            console.error(e);
        }
    };

    window.deletePhoto = async (filename) => {
        if (!confirm('Delete this photo?')) return;
        try {
            const res = await fetch(`/api/delete/${filename}`, { method: 'DELETE' });
            if (res.ok) {
                removeCard(filename);
            } else {
                alert('Error deleting photo');
            }
        } catch (e) {
            console.error(e);
        }
    };

    function removeCard(filename) {
        const card = document.getElementById(`card-${filename}`);
        if (card) {
            card.remove();
            checkEmptyState();
        }
    }
});
