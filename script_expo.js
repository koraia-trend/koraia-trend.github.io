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
    return function() {
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
window.removeEventListener('scroll', () => {});
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