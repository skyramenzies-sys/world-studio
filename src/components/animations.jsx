/* App.css - Voeg deze animaties toe aan je bestaande CSS */

/* Fade In animatie voor modals */
@keyframes fadeIn {
  from {
        opacity: 0;
    }
  to {
        opacity: 1;
    }
}

.animate - fadeIn {
    animation: fadeIn 0.2s ease -in -out;
}

/* Slide Up animatie voor toast notifications */
@keyframes slideUp {
  from {
        transform: translateY(100px);
        opacity: 0;
    }
  to {
        transform: translateY(0);
        opacity: 1;
    }
}

.animate - slideUp {
    animation: slideUp 0.3s ease - out;
}

/* Scale animatie voor buttons */
@keyframes scaleIn {
  from {
        transform: scale(0.95);
        opacity: 0;
    }
  to {
        transform: scale(1);
        opacity: 1;
    }
}

.animate - scaleIn {
    animation: scaleIn 0.2s ease - out;
}

/* Pulse animatie */
@keyframes pulse {
    0 %, 100 % {
        opacity: 1;
    }
    50 % {
        opacity: 0.5;
    }
}

.animate - pulse {
    animation: pulse 2s cubic - bezier(0.4, 0, 0.6, 1) infinite;
}

/* Spin animatie voor loading */
@keyframes spin {
  from {
        transform: rotate(0deg);
    }
  to {
        transform: rotate(360deg);
    }
}

.animate - spin {
    animation: spin 1s linear infinite;
}

/* Bounce animatie voor errors/success */
@keyframes bounce {
    0 %, 100 % {
        transform: translateY(-25 %);
        animation- timing - function: cubic- bezier(0.8, 0, 1, 1);
}
50 % {
    transform: translateY(0);
    animation- timing - function: cubic- bezier(0, 0, 0.2, 1);
  }
}

.animate - bounce {
    animation: bounce 1s infinite;
}

/* Shake animatie voor error states */
@keyframes shake {
    0 %, 100 % {
        transform: translateX(0);
    }
    10 %, 30 %, 50 %, 70 %, 90 % {
        transform: translateX(-10px);
    }
    20 %, 40 %, 60 %, 80 % {
        transform: translateX(10px);
    }
}

.animate - shake {
    animation: shake 0.5s;
}

/* Gradient animation voor backgrounds */
@keyframes gradient {
    0 % {
        background- position: 0 % 50 %;
}
50 % {
    background- position: 100 % 50 %;
  }
100 % {
    background- position: 0 % 50 %;
  }
}

.animate - gradient {
    background - size: 200 % 200 %;
    animation: gradient 3s ease infinite;
}

/* Smooth transitions */
* {
    transition- duration: 150ms;
transition - timing - function: cubic- bezier(0.4, 0, 0.2, 1);
}

/* Custom scrollbar */
:: -webkit - scrollbar {
    width: 8px;
    height: 8px;
}

:: -webkit - scrollbar - track {
    background: rgba(255, 255, 255, 0.05);
    border - radius: 4px;
}

:: -webkit - scrollbar - thumb {
    background: rgba(255, 255, 255, 0.2);
    border - radius: 4px;
}

:: -webkit - scrollbar - thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}

/* Glassmorphism effect */
.glass {
    background: rgba(255, 255, 255, 0.1);
    backdrop - filter: blur(10px);
    -webkit - backdrop - filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Text gradient */
.text - gradient {
    background: linear - gradient(to right, #06b6d4, #a855f7);
    -webkit - background - clip: text;
    -webkit - text - fill - color: transparent;
    background - clip: text;
}

/* Hover effects */
.hover - lift {
    transition: transform 0.2s ease -in -out;
}

.hover - lift:hover {
    transform: translateY(-2px);
}

.hover - scale {
    transition: transform 0.2s ease -in -out;
}

.hover - scale:hover {
    transform: scale(1.05);
}

/* Shadow effects */
.shadow - glow {
    box - shadow: 0 0 20px rgba(6, 182, 212, 0.5);
}

.shadow - glow - purple {
    box - shadow: 0 0 20px rgba(168, 85, 247, 0.5);
}

/* Line clamp utility */
.line - clamp - 1 {
    display: -webkit - box;
    -webkit - line - clamp: 1;
    -webkit - box - orient: vertical;
    overflow: hidden;
}

.line - clamp - 2 {
    display: -webkit - box;
    -webkit - line - clamp: 2;
    -webkit - box - orient: vertical;
    overflow: hidden;
}

.line - clamp - 3 {
    display: -webkit - box;
    -webkit - line - clamp: 3;
    -webkit - box - orient: vertical;
    overflow: hidden;
}

/* Modal backdrop blur */
.backdrop - blur - sm {
    backdrop - filter: blur(4px);
    -webkit - backdrop - filter: blur(4px);
}

.backdrop - blur - lg {
    backdrop - filter: blur(16px);
    -webkit - backdrop - filter: blur(16px);
}

/* Loading skeleton */
@keyframes shimmer {
    0 % {
        background- position: -1000px 0;
}
100 % {
    background- position: 1000px 0;
  }
}

.skeleton {
    animation: shimmer 2s infinite;
    background: linear - gradient(
        to right,
        rgba(255, 255, 255, 0.05) 0 %,
        rgba(255, 255, 255, 0.1) 50 %,
        rgba(255, 255, 255, 0.05) 100 %
  );
    background - size: 1000px 100 %;
}