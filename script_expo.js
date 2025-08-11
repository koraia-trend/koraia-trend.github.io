// Year data for dynamic stats (moved to top for global access)
const yearData = {
    2025: { years: 8, countries: 18, companies: 322, visitors: 43788 },
    2024: { years: 7, countries: 15, companies: 280, visitors: 40000 },
    2023: { years: 6, countries: 11, companies: 260, visitors: 32526 },
    2022: { years: 5, countries: 11, companies: 230, visitors: 28535 },
    2021: { years: 4, countries: 8, companies: 138, visitors: 23263 },
    2020: { years: 3, countries: 4, companies: 107, visitors: 21393 },
    2019: { years: 2, countries: 5, companies: 127, visitors: 21321 },
    2018: { years: 1, countries: 3, companies: 82, visitors: 14278 }
};

// DOM Elements
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navbar = document.querySelector('.navbar');

// Mobile Menu Toggle
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.background = '#ffffff';
        navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
        navbar.style.borderBottom = '1px solid #e5e7eb';
    } else {
        navbar.style.background = '#ffffff';
        navbar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        navbar.style.borderBottom = '1px solid #e5e5e5';
    }
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';

            // If it's a stat card, start the counter animation
            if (entry.target.classList.contains('stat-card')) {
                const numberElement = entry.target.querySelector('.stat-number');
                if (numberElement && !numberElement.classList.contains('counted')) {
                    animateNumber(numberElement);
                }
            }
        }
    });
}, observerOptions);

// Observe elements for animation
const animateElements = document.querySelectorAll('.milestone-card, .timeline-item, .achievement-item, .partner-item');
animateElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.4s ease';
    observer.observe(el);
});

// Number counter animation
function animateNumber(element) {
    const target = parseInt(element.textContent.replace(/[^\d]/g, ''));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    element.classList.add('counted');

    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }

        // Format the number based on original content
        const originalText = element.textContent;
        if (originalText.includes('+')) {
            element.textContent = Math.floor(current).toLocaleString() + '+';
        } else if (originalText.includes(',')) {
            element.textContent = Math.floor(current).toLocaleString();
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Removed parallax effect for cleaner look

// Timeline navigation functionality
const timelineNavBtns = document.querySelectorAll('.timeline-nav-btn');
const allTimelineItems = document.querySelectorAll('.timeline-item');

// Timeline items stagger animation
allTimelineItems.forEach((item, index) => {
    item.style.animationDelay = `${index * 0.2}s`;
});

timelineNavBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetYear = btn.dataset.year;
        // Update active button
        timelineNavBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Show/hide timeline items
        allTimelineItems.forEach(item => {
            const itemYear = item.querySelector('.timeline-year').textContent;
            if (targetYear === 'all' || itemYear === targetYear) {
                item.style.display = 'flex';
                item.style.opacity = '1';
            } else {
                item.style.display = 'none';
            }
        });
        return false;
    }, false);
});



// Function to animate number changes
function animateStatChange(element, startValue, endValue, duration = 1000) {
    const startTime = performance.now();
    const isDecimal = endValue.toString().includes('.');

    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (endValue - startValue) * easeOutCubic;

        if (endValue >= 1000) {
            element.textContent = Math.floor(currentValue).toLocaleString();
        } else if (isDecimal) {
            element.textContent = currentValue.toFixed(1);
        } else {
            element.textContent = Math.floor(currentValue);
        }

        if (progress < 1) {
            requestAnimationFrame(updateValue);
        } else {
            // Final value formatting
            if (endValue >= 1000) {
                element.textContent = endValue.toLocaleString();
            } else {
                element.textContent = endValue;
            }
        }
    }

    requestAnimationFrame(updateValue);
}

// Function to update hero stats
function updateHeroStats(year) {
    console.log('updateHeroStats called with year:', year);

    const data = yearData[year];
    if (!data) {
        console.error('No data found for year:', year);
        return;
    }

    console.log('Year data:', data);

    const statNumbers = document.querySelectorAll('.hero-stats .stat-number');
    console.log('Found stat numbers:', statNumbers.length);

    if (statNumbers.length < 4) {
        console.error('Not enough stat number elements found');
        return;
    }

    // Get current values
    const currentYears = parseInt(statNumbers[0].textContent);
    const currentCountries = parseInt(statNumbers[1].textContent);
    const currentCompanies = parseInt(statNumbers[2].textContent.replace(/[^0-9]/g, ''));
    const currentVisitors = parseInt(statNumbers[3].textContent.replace(/[^0-9]/g, ''));

    console.log('Current values:', { currentYears, currentCountries, currentCompanies, currentVisitors });
    console.log('New values:', { years: data.years, countries: data.countries, companies: data.companies, visitors: data.visitors });

    // Add glow effect to stat numbers during animation
    statNumbers.forEach((num, index) => {
        num.style.animation = 'statGlow 1.5s ease-in-out';
        setTimeout(() => {
            num.style.animation = '';
        }, 1500);
    });

    // Animate to new values with staggered timing
    animateStatChange(statNumbers[0], currentYears, data.years, 800);
    setTimeout(() => animateStatChange(statNumbers[1], currentCountries, data.countries, 800), 200);
    setTimeout(() => animateStatChange(statNumbers[2], currentCompanies, data.companies, 800), 400);
    setTimeout(() => animateStatChange(statNumbers[3], currentVisitors, data.visitors, 800), 600);

    // Update chart bars heights
    updateChartBars(year);
}

// Function to update chart bars
function updateChartBars(selectedYear) {
    const chartBars = document.querySelectorAll('.chart-bar');
    const maxVisitors = Math.max(...Object.values(yearData).map(d => d.visitors));

    chartBars.forEach((bar, index) => {
        const barYear = parseInt(bar.dataset.year);
        const data = yearData[barYear];

        if (data) {
            const percentage = (data.visitors / maxVisitors) * 100;

            // Animate height change
            bar.style.transition = 'height 0.6s ease-in-out';
            bar.style.height = percentage + '%';

            // Add pulsing effect to selected year
            if (barYear == selectedYear) {
                bar.style.animation = 'chartPulse 0.6s ease-in-out';
                setTimeout(() => {
                    bar.style.animation = '';
                }, 600);
            }
        }
    });
}

// Add tooltips to chart bars
function addChartTooltips(chartBars) {
    if (!chartBars) {
        console.error('Chart bars not provided to addChartTooltips');
        return;
    }

    chartBars.forEach(bar => {
        const year = parseInt(bar.dataset.year);
        const data = yearData[year];

        if (data) {
            // Create tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'chart-tooltip';
            tooltip.innerHTML = `
                <div class="tooltip-year">${year}년</div>
                <div class="tooltip-stats">
                    <div>${data.countries}개국</div>
                    <div>${data.companies}개사</div>
                    <div>${data.visitors.toLocaleString()}명</div>
                </div>
            `;
            document.body.appendChild(tooltip);

            bar.addEventListener('mouseenter', (e) => {
                tooltip.style.display = 'block';
                const isMobile = window.innerWidth <= 768;
                const offsetX = isMobile ? -60 : 10;
                const offsetY = isMobile ? -80 : -10;
                tooltip.style.left = (e.pageX + offsetX) + 'px';
                tooltip.style.top = (e.pageY + offsetY) + 'px';
            });

            bar.addEventListener('mousemove', (e) => {
                const isMobile = window.innerWidth <= 768;
                const offsetX = isMobile ? -60 : 10;
                const offsetY = isMobile ? -80 : -10;
                tooltip.style.left = (e.pageX + offsetX) + 'px';
                tooltip.style.top = (e.pageY + offsetY) + 'px';
            });

            bar.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });

            // Touch events for mobile
            bar.addEventListener('touchstart', (e) => {
                e.preventDefault();
                tooltip.style.display = 'block';
                const touch = e.touches[0];
                const isMobile = window.innerWidth <= 768;
                const offsetX = isMobile ? -60 : 10;
                const offsetY = isMobile ? -80 : -10;
                tooltip.style.left = (touch.pageX + offsetX) + 'px';
                tooltip.style.top = (touch.pageY + offsetY) + 'px';

                // Hide tooltip after 2 seconds on mobile
                setTimeout(() => {
                    tooltip.style.display = 'none';
                }, 2000);
            });
        }
    });
}

// Initialize chart bars with proper heights on page load
function initializeChartBars() {
    const chartBars = document.querySelectorAll('.chart-bar');
    const maxVisitors = Math.max(...Object.values(yearData).map(d => d.visitors));

    chartBars.forEach(bar => {
        const year = parseInt(bar.dataset.year);
        const data = yearData[year];

        if (data) {
            const percentage = (data.visitors / maxVisitors) * 100;
            bar.style.height = percentage + '%';
        }
    });
}

// Initialize hero interactions when DOM is ready
function initializeHeroInteractions() {
    const yearMarkers = document.querySelectorAll('.year-marker');
    const chartBars = document.querySelectorAll('.chart-bar');

    console.log('Found year markers:', yearMarkers.length);
    console.log('Found chart bars:', chartBars.length);

    if (yearMarkers.length === 0 || chartBars.length === 0) {
        console.error('Could not find hero interactive elements');
        return;
    }

    yearMarkers.forEach((marker, index) => {
        marker.addEventListener('click', () => {
            const year = parseInt(marker.dataset.year);
            console.log('Year marker clicked:', year);

            // Update active states
            yearMarkers.forEach(m => m.classList.remove('active'));
            chartBars.forEach(b => b.classList.remove('active'));

            marker.classList.add('active');

            // Find corresponding chart bar by year instead of index
            const correspondingBar = Array.from(chartBars).find(bar =>
                parseInt(bar.dataset.year) === year
            );
            if (correspondingBar) {
                correspondingBar.classList.add('active');
            }

            // Update stats with animation
            updateHeroStats(year);

            // Scroll to corresponding timeline item
            const allTimelineYears = document.querySelectorAll('.timeline-year');
            let targetTimelineItem = null;

            allTimelineYears.forEach(yearElement => {
                if (yearElement.textContent.trim() === year.toString()) {
                    targetTimelineItem = yearElement.closest('.timeline-item');
                }
            });

            if (targetTimelineItem) {
                setTimeout(() => {
                    targetTimelineItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500);
            }
        });
    });

    chartBars.forEach((bar, index) => {
        bar.addEventListener('click', () => {
            const year = parseInt(bar.dataset.year);
            console.log('Chart bar clicked:', year);

            // Update active states
            yearMarkers.forEach(m => m.classList.remove('active'));
            chartBars.forEach(b => b.classList.remove('active'));

            bar.classList.add('active');

            // Find corresponding year marker by year instead of index
            const correspondingMarker = Array.from(yearMarkers).find(marker =>
                parseInt(marker.dataset.year) === year
            );
            if (correspondingMarker) {
                correspondingMarker.classList.add('active');
            }

            // Update stats with animation
            updateHeroStats(year);
        });
    });

    return { yearMarkers, chartBars };
}

// Global function for onclick handlers
function handleYearClick(year, element) {
    console.log('🎯 handleYearClick called with year:', year);

    // Safety check for yearData
    if (typeof yearData === 'undefined') {
        console.error('yearData is not defined yet');
        return;
    }

    // Remove all active states
    const allYearMarkers = document.querySelectorAll('.year-marker');
    const allChartBars = document.querySelectorAll('.chart-bar');

    allYearMarkers.forEach(m => m.classList.remove('active'));
    allChartBars.forEach(b => b.classList.remove('active'));

    // Add active to clicked element
    if (element.classList.contains('year-marker')) {
        element.classList.add('active');
        // Find corresponding chart bar
        const correspondingBar = Array.from(allChartBars).find(bar =>
            parseInt(bar.dataset.year) === year
        );
        if (correspondingBar) {
            correspondingBar.classList.add('active');
        }
    } else if (element.classList.contains('chart-bar')) {
        element.classList.add('active');
        // Find corresponding year marker
        const correspondingMarker = Array.from(allYearMarkers).find(marker =>
            parseInt(marker.dataset.year) === year
        );
        if (correspondingMarker) {
            correspondingMarker.classList.add('active');
        }
    }

    // Update stats
    try {
        updateHeroStats(year);
    } catch (error) {
        console.error('Error updating hero stats:', error);
    }
}

// Make function globally accessible for onclick handlers
window.handleYearClick = handleYearClick;

// --- 타임라인 모달 관련 코드 전체 제거 ---
// 1. setupTimelineClickModal 함수와 관련 함수, 이벤트 리스너 제거
// 2. openModalForItem, closeTimelineModal, testTimelineModal, testModalSwitching, showKeyboardShortcuts 등 모달 관련 함수 제거
// 3. timeline-item 클릭 시 커지는 효과, 오버레이, ESC/키보드 내비게이션 등 모두 제거
// 4. timeline-item에 cursor:pointer, hover, active 등 클릭 유도 효과도 제거(스타일은 CSS에서 처리)
// 5. timeline-nav-btn, timeline-item 등 기존 show/hide, 필터링, 통계 업데이트 등은 그대로 유지

// Sponsor items random animation delay
const sponsorItems = document.querySelectorAll('.sponsor-item');
sponsorItems.forEach((item, index) => {
    item.style.animationDelay = `${Math.random() * 0.5}s`;

    // Add subtle hover animation
    item.addEventListener('mouseenter', () => {
        item.style.transform = 'translateY(-8px) scale(1.05)';
    });

    item.addEventListener('mouseleave', () => {
        item.style.transform = 'translateY(0) scale(1)';
    });
});

// Loading animation
window.addEventListener('load', () => {
    const loader = document.createElement('div');
    loader.className = 'page-loader';
    loader.innerHTML = `
        <div class="loader-content">
            <div class="loader-spinner"></div>
            <p>AI EXPO KOREA 2025</p>
        </div>
    `;

    // Add loader styles
    const loaderStyles = `
        .page-loader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.5s ease;
        }
        
        .loader-content {
            text-align: center;
            color: white;
        }
        
        .loader-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = loaderStyles;
    document.head.appendChild(styleSheet);

    // Remove loader after page load
    setTimeout(() => {
        if (loader.parentNode) {
            loader.remove();
        }
        styleSheet.remove();
    }, 100);
});

// Typing effect for hero subtitle
function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.textContent = '';

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }

    type();
}

// Initialize typing effect when page loads
document.addEventListener('DOMContentLoaded', () => {
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) {
        const originalText = heroSubtitle.textContent;
        setTimeout(() => {
            typeWriter(heroSubtitle, originalText, 80);
        }, 1000);
    }
});

// Add floating animation to hero poster
const heroPoster = document.querySelector('.hero-poster img');
if (heroPoster) {
    let floatAnimation = setInterval(() => {
        heroPoster.style.transform += ' translateY(-10px)';
        setTimeout(() => {
            heroPoster.style.transform = heroPoster.style.transform.replace(' translateY(-10px)', '');
        }, 1000);
    }, 2000);
}

// Contact form animation (if forms are added later)
const contactCards = document.querySelectorAll('.contact-card');
contactCards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.2}s`;

    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-15px) scale(1.02)';
        card.style.boxShadow = '0 25px 60px rgba(0, 0, 0, 0.2)';
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
        card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
    });
});

// Easter egg: Konami code
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.code);

    if (konamiCode.length > konamiSequence.length) {
        konamiCode.shift();
    }

    if (JSON.stringify(konamiCode) === JSON.stringify(konamiSequence)) {
        // Add special effect
        document.body.style.animation = 'rainbow 2s infinite';

        // Add rainbow animation
        const rainbowStyle = document.createElement('style');
        rainbowStyle.textContent = `
            @keyframes rainbow {
                0% { filter: hue-rotate(0deg); }
                100% { filter: hue-rotate(360deg); }
            }
        `;
        document.head.appendChild(rainbowStyle);

        setTimeout(() => {
            document.body.style.animation = '';
            rainbowStyle.remove();
        }, 4000);

        konamiCode = [];
    }
});

// Performance optimization: Throttle scroll events
function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Apply throttling to scroll events
window.removeEventListener('scroll', () => { });
window.addEventListener('scroll', throttle(() => {
    // Navbar scroll effect
    if (window.scrollY > 50) {
        navbar.style.background = '#ffffff';
        navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
        navbar.style.borderBottom = '1px solid #e5e7eb';
    } else {
        navbar.style.background = '#ffffff';
        navbar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        navbar.style.borderBottom = '1px solid #e5e5e5';
    }
}, 16));

console.log('🤖 AI EXPO KOREA 2025 - 미래를 이끌어갈 AI 기술의 혁신과 만나다!');

// Initialize particles.js for hero background
document.addEventListener('DOMContentLoaded', function () {
    if (window.particlesJS) {
        particlesJS('hero-particles', {
            "particles": {
                "number": {
                    "value": 80,
                    "density": {
                        "enable": true,
                        "value_area": 800
                    }
                },
                "color": {
                    "value": "#ffffff"
                },
                "shape": {
                    "type": "circle",
                    "stroke": {
                        "width": 0,
                        "color": "#000000"
                    }
                },
                "opacity": {
                    "value": 0.5,
                    "random": false,
                    "anim": {
                        "enable": false,
                        "speed": 1,
                        "opacity_min": 0.1,
                        "sync": false
                    }
                },
                "size": {
                    "value": 3,
                    "random": true,
                    "anim": {
                        "enable": false,
                        "speed": 40,
                        "size_min": 0.1,
                        "sync": false
                    }
                },
                "line_linked": {
                    "enable": true,
                    "distance": 150,
                    "color": "#ffffff",
                    "opacity": 0.4,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 6,
                    "direction": "none",
                    "random": false,
                    "straight": false,
                    "out_mode": "out",
                    "bounce": false,
                    "attract": {
                        "enable": false,
                        "rotateX": 600,
                        "rotateY": 1200
                    }
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": {
                        "enable": true,
                        "mode": "repulse"
                    },
                    "onclick": {
                        "enable": true,
                        "mode": "push"
                    },
                    "resize": true
                },
                "modes": {
                    "grab": {
                        "distance": 400,
                        "line_linked": {
                            "opacity": 1
                        }
                    },
                    "bubble": {
                        "distance": 400,
                        "size": 40,
                        "duration": 2,
                        "opacity": 8,
                        "speed": 3
                    },
                    "repulse": {
                        "distance": 200,
                        "duration": 0.4
                    },
                    "push": {
                        "particles_nb": 4
                    },
                    "remove": {
                        "particles_nb": 2
                    }
                }
            },
            "retina_detect": true
        });
    } else {
        console.error('particles.js library not loaded');
    }
});

// Gallery functionality
let currentImageIndex = 0;
const totalImages = 18;
const imageBasePath = 'images/expo/';

function openModal(imageSrc) {
    const modal = document.getElementById('galleryModal');
    const modalImage = document.getElementById('modalImage');

    modal.style.display = 'block';
    modalImage.src = imageSrc;

    // Get current image index from src
    const imageNumber = parseInt(imageSrc.split('/').pop().replace('.png', ''));
    currentImageIndex = imageNumber - 1; // Convert to 0-based index

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('galleryModal');
    modal.style.display = 'none';

    // Restore body scroll
    document.body.style.overflow = 'auto';
}

function nextImage() {
    currentImageIndex = (currentImageIndex + 1) % totalImages;
    updateModalImage();
}

function prevImage() {
    currentImageIndex = (currentImageIndex - 1 + totalImages) % totalImages;
    updateModalImage();
}

function updateModalImage() {
    const modalImage = document.getElementById('modalImage');
    const newImageSrc = `${imageBasePath}${currentImageIndex + 1}.png`;
    modalImage.src = newImageSrc;
}

// Keyboard navigation for modal
document.addEventListener('keydown', function (event) {
    const modal = document.getElementById('galleryModal');
    if (modal.style.display === 'block') {
        switch (event.key) {
            case 'Escape':
                closeModal();
                break;
            case 'ArrowRight':
                nextImage();
                break;
            case 'ArrowLeft':
                prevImage();
                break;
        }
    }
});

// Close modal when clicking outside the image
document.getElementById('galleryModal').addEventListener('click', function (event) {
    if (event.target === this) {
        closeModal();
    }
});

// Poster Carousel Functionality
let currentPosterIndex = 0;
const posterSlides = document.querySelectorAll('.poster-slide');
const posterIndicators = document.querySelectorAll('.indicator');

// Poster data for modal
const posterData = [
    {
        year: '2025',
        src: 'https://raw.githubusercontent.com/parkhk502/img/refs/heads/main/koraia/mp5_sub2/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202025-04-10%20132024.png',
        title: 'AI EXPO KOREA 2025'
    },
    {
        year: '2024',
        src: 'https://koraia.org/default/img/_des/mp3_sub4/ai_expo_24.jpg',
        title: 'AI EXPO KOREA 2024'
    },
    {
        year: '2023',
        src: 'https://koraia.org/default/img/_des/mp3_sub4/ai_expo_23.jpg',
        title: 'AI EXPO KOREA 2023'
    },
    {
        year: '2022',
        src: 'https://koraia.org/default/img/_des/mp3_sub4/ai_expo_22.jpg',
        title: 'AI EXPO KOREA 2022'
    },
    {
        year: '2021',
        src: 'https://koraia.org/default/img/_des/mp3_sub4/ai_expo_21.jpg',
        title: 'AI EXPO KOREA 2021'
    },
    {
        year: '2020',
        src: 'https://koraia.org/default/img/_des/mp3_sub4/ai_expo_20.jpg',
        title: 'AI EXPO KOREA 2020'
    },
    {
        year: '2019',
        src: 'https://koraia.org/default/img/_des/mp3_sub4/ai_expo_19.jpg',
        title: 'AI EXPO KOREA 2019'
    },
    {
        year: '2018',
        src: 'https://koraia.org/default/img/_des/mp3_sub4/ai_expo_18.jpg',
        title: 'AI EXPO KOREA 2018'
    }
];

function updatePosterCarousel() {
    posterSlides.forEach((slide, index) => {
        slide.classList.remove('active');
        if (index === currentPosterIndex) {
            slide.classList.add('active');
        }
    });

    posterIndicators.forEach((indicator, index) => {
        indicator.classList.remove('active');
        if (index === currentPosterIndex) {
            indicator.classList.add('active');
        }
    });

    // Update slide positions with smooth animation
    posterSlides.forEach((slide, index) => {
        const offset = index - currentPosterIndex;
        let transform = '';
        let zIndex = 5;
        let opacity = 0.7;

        if (offset === 0) {
            // Active slide
            transform = 'translateX(0) translateZ(0) rotateY(0deg) scale(1.1)';
            zIndex = 10;
            opacity = 1;
        } else if (offset === 1) {
            // Next slide
            transform = 'translateX(200px) translateZ(-100px) rotateY(-25deg) scale(0.8)';
        } else if (offset === 2) {
            // Second next slide
            transform = 'translateX(350px) translateZ(-200px) rotateY(-35deg) scale(0.6)';
        } else if (offset === -1) {
            // Previous slide
            transform = 'translateX(-200px) translateZ(-100px) rotateY(25deg) scale(0.8)';
        } else if (offset === -2) {
            // Second previous slide
            transform = 'translateX(-350px) translateZ(-200px) rotateY(35deg) scale(0.6)';
        } else {
            // Hidden slides
            if (offset > 0) {
                transform = 'translateX(500px) translateZ(-300px) rotateY(-45deg) scale(0.4)';
            } else {
                transform = 'translateX(-500px) translateZ(-300px) rotateY(45deg) scale(0.4)';
            }
            opacity = 0;
        }

        slide.style.transform = transform;
        slide.style.zIndex = zIndex;
        slide.style.opacity = opacity;
    });
}

function nextPoster() {
    currentPosterIndex = (currentPosterIndex + 1) % posterSlides.length;
    updatePosterCarousel();
}

function prevPoster() {
    currentPosterIndex = (currentPosterIndex - 1 + posterSlides.length) % posterSlides.length;
    updatePosterCarousel();
}

function goToPoster(index) {
    currentPosterIndex = index;
    updatePosterCarousel();
}

// Auto-rotate posters
setInterval(nextPoster, 4000);

// Poster Modal Functions
let currentModalPosterIndex = 0;

function openPosterModal(imageSrc, year) {
    const modal = document.getElementById('posterModal');
    const modalImage = document.getElementById('posterModalImage');
    const modalTitle = document.getElementById('posterModalTitle');

    // Find the index of the clicked poster
    currentModalPosterIndex = posterData.findIndex(poster => poster.year === year);

    modalImage.src = imageSrc;
    modalTitle.textContent = `AI EXPO KOREA ${year}`;
    modal.style.display = 'block';

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    // Smooth scroll to timeline section for context
    setTimeout(() => {
        const timelineSection = document.getElementById('timeline');
        if (timelineSection) {
            timelineSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 300);
}

function closePosterModal() {
    const modal = document.getElementById('posterModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function nextPosterModal() {
    currentModalPosterIndex = (currentModalPosterIndex + 1) % posterData.length;
    const currentPoster = posterData[currentModalPosterIndex];

    const modalImage = document.getElementById('posterModalImage');
    const modalTitle = document.getElementById('posterModalTitle');

    modalImage.src = currentPoster.src;
    modalTitle.textContent = currentPoster.title;

    // Update main carousel to match
    currentPosterIndex = currentModalPosterIndex;
    updatePosterCarousel();
}

function prevPosterModal() {
    currentModalPosterIndex = (currentModalPosterIndex - 1 + posterData.length) % posterData.length;
    const currentPoster = posterData[currentModalPosterIndex];

    const modalImage = document.getElementById('posterModalImage');
    const modalTitle = document.getElementById('posterModalTitle');

    modalImage.src = currentPoster.src;
    modalTitle.textContent = currentPoster.title;

    // Update main carousel to match
    currentPosterIndex = currentModalPosterIndex;
    updatePosterCarousel();
}

// Close poster modal when clicking outside
document.getElementById('posterModal').addEventListener('click', function (event) {
    if (event.target === this) {
        closePosterModal();
    }
});

// Keyboard navigation for poster modal
document.addEventListener('keydown', function (event) {
    const posterModal = document.getElementById('posterModal');
    if (posterModal.style.display === 'block') {
        switch (event.key) {
            case 'Escape':
                closePosterModal();
                break;
            case 'ArrowLeft':
                prevPosterModal();
                break;
            case 'ArrowRight':
                nextPosterModal();
                break;
        }
    }
});

// Initialize poster carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    if (posterSlides.length > 0) {
        updatePosterCarousel();
    }
});

// Conference Modal Functionality
const conferenceImages = [
    {
        src: 'https://static.onoffmix.com/afv2/attach/2025/05/07/v392f742ebab073bc9f10a9374e9cebe07.png',
        alt: 'AI 컨퍼런스 프로그램 1',
        title: '컨퍼런스 프로그램 1'
    },
    {
        src: 'https://expo.koraia.org/poster0516.png',
        alt: 'AI 컨퍼런스 프로그램 2',
        title: '컨퍼런스 프로그램 2'
    },
    {
        src: 'https://static.onoffmix.com/afv2/attach/2025/05/07/v3ba3c562a65bae49bc1de9de015012f0a.png',
        alt: 'AI 컨퍼런스 프로그램 3',
        title: '컨퍼런스 프로그램 3'
    },
    {
        src: 'https://static.onoffmix.com/afv2/attach/2025/05/09/v3fb0130d18cb7578a7fbb107de9f65149.png',
        alt: 'AI 컨퍼런스 프로그램 4',
        title: '컨퍼런스 프로그램 4'
    }
];

let currentConferenceImageIndex = 0;

function openConferenceModal(imageSrc) {
    // Find the index of the clicked image by matching src
    currentConferenceImageIndex = conferenceImages.findIndex(img => img.src === imageSrc);
    if (currentConferenceImageIndex === -1) currentConferenceImageIndex = 0;
    
    const modal = document.getElementById('conferenceModal');
    const modalImage = document.getElementById('conferenceModalImage');
    const modalBody = modal.querySelector('.conference-modal-body');
    
    modalImage.src = imageSrc;
    modalImage.alt = conferenceImages[currentConferenceImageIndex].alt;
    modal.style.display = 'block';
    
    // Scroll to top of modal content
    if (modalBody) {
        modalBody.scrollTop = 0;
    }
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeConferenceModal() {
    const modal = document.getElementById('conferenceModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function nextConferenceImage() {
    currentConferenceImageIndex = (currentConferenceImageIndex + 1) % conferenceImages.length;
    updateConferenceModalImage();
}

function prevConferenceImage() {
    currentConferenceImageIndex = (currentConferenceImageIndex - 1 + conferenceImages.length) % conferenceImages.length;
    updateConferenceModalImage();
}

function updateConferenceModalImage() {
    const modalImage = document.getElementById('conferenceModalImage');
    const modalBody = document.querySelector('.conference-modal-body');
    const currentImage = conferenceImages[currentConferenceImageIndex];
    
    modalImage.src = currentImage.src;
    modalImage.alt = currentImage.alt;
    
    // Scroll to top when image changes
    if (modalBody) {
        modalBody.scrollTop = 0;
    }
}

// Close conference modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const conferenceModal = document.getElementById('conferenceModal');
    if (conferenceModal) {
        conferenceModal.addEventListener('click', function(event) {
            if (event.target === this) {
                closeConferenceModal();
            }
        });
    }
});

// Keyboard navigation for conference modal
document.addEventListener('keydown', function(event) {
    const conferenceModal = document.getElementById('conferenceModal');
    if (conferenceModal && conferenceModal.style.display === 'block') {
        switch(event.key) {
            case 'Escape':
                closeConferenceModal();
                break;
            case 'ArrowLeft':
                prevConferenceImage();
                break;
            case 'ArrowRight':
                nextConferenceImage();
                break;
        }
    }
}); 