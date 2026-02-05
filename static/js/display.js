document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // --- Slideshow Logic ---
    let photos = window.INITIAL_PHOTOS || []; // Passed from template
    let currentPhotoIndex = -1;
    const slideshowContainer = document.getElementById('slideshow-container');

    // Config
    const SLIDE_DURATION = 5000; // 5 seconds

    function showNextPhoto() {
        if (photos.length === 0) return;

        // Update index
        currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
        const filename = photos[currentPhotoIndex];

        // Create new image element
        const img = document.createElement('img');
        img.src = `/uploads/approved/${filename}`;
        img.className = 'slide';

        // Add to DOM
        slideshowContainer.appendChild(img);

        // Trigger fade in (allow reflow)
        requestAnimationFrame(() => {
            img.classList.add('active');
        });

        // Remove old images after transition
        setTimeout(() => {
            while (slideshowContainer.children.length > 1) {
                // Keep the last one (the current interval one)
                // Actually if we append new one, we should remove the old "active" one
                // Simple logic: remove all except the last one.
                if (slideshowContainer.firstElementChild !== img) {
                    slideshowContainer.firstElementChild.remove();
                } else {
                    break;
                }
            }
        }, 1500); // Wait for 1s transition + buffer
    }

    // Start loop
    if (photos.length > 0) {
        // Clear placeholder text if any
        slideshowContainer.innerHTML = '';
        showNextPhoto();
    }

    setInterval(showNextPhoto, SLIDE_DURATION);

    // Socket: Add new photo
    socket.on('photo_approved', (data) => {
        // data.filename
        const wasEmpty = photos.length === 0;
        if (!photos.includes(data.filename)) {
            photos.push(data.filename);
        }

        if (wasEmpty) {
            slideshowContainer.innerHTML = ''; // Remove placeholder
            showNextPhoto();
        }
    });


    // --- Danmu Logic ---
    const danmuLayer = document.getElementById('danmu-layer');
    const LANE_HEIGHT = 50; // pixels approx
    const MAX_LANES = Math.floor(window.innerHeight / LANE_HEIGHT);
    let lanes = new Array(MAX_LANES).fill(true); // true = free? 
    // Actually simple lane cycling is safer to avoid congestion
    let currentLane = 0;

    socket.on('broadcast_danmu', (data) => {
        console.log("Danmu received:", data);
        spawnDanmu(data.text);
    });

    socket.on('perform_clear_screen', () => {
        danmuLayer.innerHTML = '';
    });

    // QR Logic
    const qrOverlay = document.getElementById('qr-overlay');
    const qrContainer = document.getElementById('qrcode');
    let qr = new QRCode(qrContainer, { width: 128, height: 128 });

    socket.on('update_qr', (data) => {
        // data: { show: bool, url: string }
        if (data.show) {
            qrOverlay.style.display = 'block';
            let url = data.url;
            if (!url || !url.startsWith('http')) {
                // Fallback to current host if empty
                if (!url) url = window.location.origin + '/guest';
                else if (url.includes('.')) url = 'https://' + url;
            }
            qr.clear();
            qr.makeCode(url);
        } else {
            qrOverlay.style.display = 'none';
        }
    });

    function spawnDanmu(text) {
        const item = document.createElement('div');
        item.className = 'danmu-item';
        item.textContent = text;

        // Lane Logic
        // Pick a random lane or cycle?
        // Let's cycle to prevent overlaps
        currentLane = (currentLane + 1) % (MAX_LANES - 2); // Avoid very bottom
        const topPos = (currentLane + 1) * LANE_HEIGHT; // +1 to skip very top

        item.style.top = `${topPos}px`;

        // Randomize speed
        const duration = 8 + Math.random() * 5; // 8-13 seconds
        item.style.transition = `transform ${duration}s linear`;

        danmuLayer.appendChild(item);

        // Trigger animation
        requestAnimationFrame(() => {
            // Move to left: -100vw - width of item
            // Using slightly more than 100vw to ensure it clears
            const dist = window.innerWidth + item.offsetWidth + 50;
            item.style.transform = `translateX(-${dist}px)`;
        });

        // Cleanup
        setTimeout(() => {
            item.remove();
        }, duration * 1000);
    }
});
