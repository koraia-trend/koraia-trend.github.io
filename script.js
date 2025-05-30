document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const svg = document.getElementById('boothMap');
    const svgDefs = document.querySelector('#boothMap defs');
    const boothGroup = document.getElementById('boothGroup');
    const tooltip = document.getElementById('tooltip');
    const mapViewport = document.getElementById('mapViewport');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resetViewButton = document.getElementById('resetViewButton');
    const zoomInButton = document.getElementById('zoomInButton');
    const zoomOutButton = document.getElementById('zoomOutButton');
    const searchInfo = document.getElementById('searchInfo');
    const searchResultsList = document.getElementById('searchResultsList');

    // --- State Variables ---
    let boothsData = [];
    let mapElementsData = {};
    const initialScale = 0.7;
    const initialTranslate = { x: 200, y: 200 };
    let scale = initialScale;
    let currentTranslate = { ...initialTranslate };
    let panning = false;
    let start = { x: 0, y: 0 };

    // --- Constants ---
    const MIN_SCALE = 0.2;
    const MAX_SCALE = 8;
    const ZOOM_SENSITIVITY = 0.1; // Mouse wheel zoom sensitivity
    const BUTTON_ZOOM_FACTOR = 1.4; // Zoom factor for +/- buttons

    // --- Floor Level Selector Change Handler ---
    const floorLevelSelector = document.getElementById('floorLevelSelector');

    floorLevelSelector.addEventListener('change', async () => {
        const selectedFloor = floorLevelSelector.value;
        await loadFloorMap(selectedFloor);
    });

    // --- Load Floor Map Function ---
    async function loadFloorMap(floorLevel) {
        // 로딩 메시지 표시
        searchInfo.textContent = `${getFloorName(floorLevel)} 지도 데이터를 로딩 중입니다...`;
        searchInfo.style.color = '#555';

        // 기존 부스 및 요소 초기화
        boothGroup.innerHTML = '';
        svgDefs.innerHTML = '';
        clearSearch();

        try {
            // 선택된 층에 맞는 데이터 URL 설정
            const boothDataUrl = `data/${floorLevel}/booths.json`;
            const mapElementsUrl = `data/${floorLevel}/map_elements.json`;

            const [boothDataResult, mapElementsResult] = await Promise.all([
                fetch(boothDataUrl).then(response => response.json()),
                fetch(mapElementsUrl).then(response => response.json())
            ]);

            // 전역 변수에 데이터 저장
            boothsData = boothDataResult;

            if (boothDataResult.length === 0) {
                searchInfo.textContent = '부스 데이터가 없습니다.';
                searchInfo.style.color = '#dc3545';
                return;
            }

            // 맵 요소 및 부스 렌더링
            renderMapElements(mapElementsResult);
            renderBooths(boothDataResult);

            // 정중앙 위치 계산 및 적용
            const bbox = boothGroup.getBBox();
            if (bbox && bbox.width > 0 && bbox.height > 0) {
                const viewportWidth = mapViewport.clientWidth;
                const viewportHeight = mapViewport.clientHeight;
                const contentCenterX = bbox.x + bbox.width / 2;
                const contentCenterY = bbox.y + bbox.height / 2;

                // 모바일에서는 초기 스케일을 계산, PC에서는 설정된 초기값 사용
                const isMobile = window.innerWidth <= 768;
                scale = isMobile ? calculateInitialScale() : initialScale;

                // 정중앙 위치 계산 (모바일/PC 동일하게)
                currentTranslate.x = -(contentCenterX * scale) + viewportWidth / 2;
                currentTranslate.y = -(contentCenterY * scale) + viewportHeight / 2;
            }

            setTransform(true); // 부드럽게 전환
            searchInfo.textContent = `${getFloorName(floorLevel)} 지도가 로드되었습니다.`;

        } catch (error) {
            console.error(`Failed to load floor ${floorLevel} map:`, error);
            searchInfo.textContent = `${getFloorName(floorLevel)} 지도 로딩 중 오류가 발생했습니다.`;
            searchInfo.style.color = '#dc3545';
        }
    }

    // --- 층 이름 반환 함수 ---
    function getFloorName(floorLevel) {
        const floorNames = {
            'level1': '코엑스 A홀 1층 (1F)',
            'level3': '코엑스 A홀 3층 (3F)'
        };
        return floorNames[floorLevel] || floorLevel;
    }


    // --- Touch Events for Mobile ---
    mapViewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            if (e.target === mapViewport || e.target === svg || e.target === boothGroup ||
                e.target.classList.contains('map-shape') || e.target.classList.contains('booth')) {
                // 링크와 같은 요소만 제외
                if (e.target.closest('a') && !e.target.classList.contains('booth')) return;
                panning = true;
                start = {
                    x: touch.clientX - currentTranslate.x,
                    y: touch.clientY - currentTranslate.y
                };
            }
        }
    });

    mapViewport.addEventListener('touchmove', (e) => {
        if (!panning || e.touches.length !== 1) return;
        e.preventDefault(); // 스크롤 방지
        const touch = e.touches[0];
        currentTranslate.x = touch.clientX - start.x;
        currentTranslate.y = touch.clientY - start.y;
        setTransform(false);
    }, { passive: false });

    mapViewport.addEventListener('touchend', () => {
        panning = false;
    });

    // 모바일 핀치 줌 기능 추가
    let initialDistance = 0;

    mapViewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialDistance = getDistance(e.touches[0], e.touches[1]);
            initialScale = scale;
        }
    });

    mapViewport.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault(); // 핀치 줌 시 페이지 확대 방지
            const distance = getDistance(e.touches[0], e.touches[1]);
            const newScale = initialScale * (distance / initialDistance);

            // 두 터치 지점 사이의 중앙을 기준으로 확대/축소
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;

            const oldScale = scale;
            scale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));

            const viewportRect = mapViewport.getBoundingClientRect();
            const relativeX = centerX - viewportRect.left;
            const relativeY = centerY - viewportRect.top;

            const pointTo = {
                x: (relativeX - currentTranslate.x) / oldScale,
                y: (relativeY - currentTranslate.y) / oldScale,
            };

            currentTranslate.x = relativeX - pointTo.x * scale;
            currentTranslate.y = relativeY - pointTo.y * scale;

            setTransform(false);
        }
    }, { passive: false });

    // 터치 디바이스에서 툴팁 표시를 위한 이벤트
    document.querySelectorAll('.booth').forEach(booth => {
        booth.addEventListener('touchstart', (e) => {
            const boothData = boothsData.find(b => b.id === booth.dataset.id);
            if (boothData) {
                e.preventDefault(); // 기본 터치 액션 방지
                showTooltip(e.touches[0], boothData);
                setTimeout(hideTooltip, 3000); // 3초 후 자동으로 툴팁 숨김
            }
        });
    });

    // 거리 계산 유틸리티 함수
    function getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }


    // --- Helper function to adjust color brightness ---
    function adjustColor(color, percent) {
        if (!color || !color.startsWith('#')) return '#cccccc';
        try {
            let R = parseInt(color.substring(1, 3), 16);
            let G = parseInt(color.substring(3, 5), 16);
            let B = parseInt(color.substring(5, 7), 16);
            R = Math.round(R * (100 + percent) / 100);
            G = Math.round(G * (100 + percent) / 100);
            B = Math.round(B * (100 + percent) / 100);
            R = Math.max(0, Math.min(255, R));
            G = Math.max(0, Math.min(255, G));
            B = Math.max(0, Math.min(255, B));
            const RR = R.toString(16).padStart(2, '0');
            const GG = G.toString(16).padStart(2, '0');
            const BB = B.toString(16).padStart(2, '0');
            return `#${RR}${GG}${BB}`;
        } catch (e) {
            console.error("Color adjustment error:", e, "Input color:", color);
            return '#cccccc';
        }
    }

    // --- Function to set transform on the booth group ---
    function setTransform(smooth = false) {
        boothGroup.style.transition = smooth ? 'transform 0.3s ease-out' : 'none'; // Slightly faster transition
        boothGroup.setAttribute('transform', `translate(${currentTranslate.x}, ${currentTranslate.y}) scale(${scale})`);
        if (smooth) {
            setTimeout(() => { boothGroup.style.transition = 'none'; }, 300);
        }
    }

    // --- Load Data ---
    async function loadBooths() { /* ... (previous version) ... */
        try { const response = await fetch('booths.json'); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); boothsData = await response.json(); return boothsData; } catch (error) { console.error("Failed to load booth data:", error); throw error; }
    }
    async function loadMapElements() { /* ... (previous version) ... */
        try { const response = await fetch('map_elements.json'); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); mapElementsData = await response.json(); return mapElementsData; } catch (error) { console.error("Failed to load map elements data:", error); return {}; }
    }

    // --- Render Booths on SVG ---
    // --- Render Booths on SVG ---
    function renderBooths(data) {
        data.forEach(booth => {
            const baseColor = booth.color || '#aaaaaa'; // JSON에서 색상 읽기

            // --- 1. 그라데이션 생성 로직 제거 또는 주석 처리 ---
            /*
            const gradientId = `grad-${booth.id}`;
            const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            gradient.setAttribute('id', gradientId);
            gradient.setAttribute('x1', "0%"); gradient.setAttribute('y1', "0%");
            gradient.setAttribute('x2', "0%"); gradient.setAttribute('y2', "100%");
            const stops = [
                { offset: '0%', color: adjustColor(baseColor, 35), opacity: '1' },
                { offset: '50%', color: baseColor, opacity: '0.9' },
                { offset: '100%', color: adjustColor(baseColor, -25), opacity: '1' }
            ];
            stops.forEach(s => {
                const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
                Object.entries(s).forEach(([key, value]) => stop.setAttribute(key, value));
                gradient.appendChild(stop);
            });
            svgDefs.appendChild(gradient);
            */
            // --- 그라데이션 로직 끝 ---

            // 2. Create Booth Rect
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute('id', `booth-${booth.id}`);
            rect.setAttribute('x', booth.x); rect.setAttribute('y', booth.y);
            rect.setAttribute('width', booth.width); rect.setAttribute('height', booth.height);

            // --- *** FILL 속성 변경 *** ---
            // rect.setAttribute('fill', `url(#${gradientId})`); // 기존 그라데이션 적용 코드 주석 처리
            rect.setAttribute('fill', baseColor); // JSON에서 읽어온 색상(baseColor)을 직접 적용
            // --- *** 변경 끝 *** ---

            rect.setAttribute('rx', '4'); rect.setAttribute('ry', '4');
            rect.classList.add('booth');
            Object.assign(rect.dataset, { company: booth.company, service: booth.service, id: booth.id });
            boothGroup.appendChild(rect);

            // 3. Create Booth Text (변경 없음)
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute('x', booth.x + booth.width / 2);
            text.setAttribute('y', booth.y + booth.height / 2);
            text.classList.add('booth-text');
            text.textContent = booth.id;
            boothGroup.appendChild(text);

            // 4. Tooltip Listeners (변경 없음)
            rect.addEventListener('mouseenter', (e) => showTooltip(e, booth));
            rect.addEventListener('mousemove', moveTooltip);
            rect.addEventListener('mouseleave', hideTooltip);
        });
    }

    function renderMapElements(elements) { /* ... (previous version, ensures elements added to boothGroup) ... */
        (elements.images || []).forEach(img => { const imageEl = document.createElementNS("http://www.w3.org/2000/svg", "image"); imageEl.setAttribute('id', img.id); imageEl.setAttribute('href', img.href); imageEl.setAttribute('x', img.x); imageEl.setAttribute('y', img.y); imageEl.setAttribute('width', img.width); imageEl.setAttribute('height', img.height); imageEl.classList.add('map-element', 'map-image'); const titleEl = document.createElementNS("http://www.w3.org/2000/svg", "title"); titleEl.textContent = img.description || img.id; imageEl.appendChild(titleEl); const container = img.link ? document.createElementNS("http://www.w3.org/2000/svg", "a") : null; if (container) { container.setAttribute('href', img.link); container.setAttribute('target', '_blank'); container.appendChild(imageEl); boothGroup.appendChild(container); } else { boothGroup.appendChild(imageEl); } if (img.description) { const targetEl = container || imageEl; targetEl.addEventListener('mouseenter', (e) => showSimpleTooltip(e, img.description)); targetEl.addEventListener('mousemove', moveTooltip); targetEl.addEventListener('mouseleave', hideTooltip); } }); (elements.texts || []).forEach(txt => { const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text"); textEl.setAttribute('id', txt.id); textEl.setAttribute('x', txt.x); textEl.setAttribute('y', txt.y); textEl.setAttribute('font-size', txt.fontSize || 12); textEl.setAttribute('fill', txt.fill || '#000000'); textEl.setAttribute('font-weight', txt.fontWeight || 'normal'); textEl.setAttribute('text-anchor', txt.textAnchor || 'start'); textEl.textContent = txt.text; textEl.classList.add('map-element', 'map-text'); textEl.style.pointerEvents = 'none'; boothGroup.appendChild(textEl); }); (elements.shapes || []).forEach(shp => { const shapeEl = document.createElementNS("http://www.w3.org/2000/svg", shp.type); shapeEl.setAttribute('id', shp.id); const commonAttrs = ['fill', 'stroke', 'stroke-width']; commonAttrs.forEach(attr => { if (shp[attr]) shapeEl.setAttribute(attr.replace('Width', '-width'), shp[attr]); }); switch (shp.type) { case 'rect': ['x', 'y', 'width', 'height', 'rx', 'ry'].forEach(attr => { if (shp[attr]) shapeEl.setAttribute(attr, shp[attr]); }); break; case 'circle': ['cx', 'cy', 'r'].forEach(attr => { if (shp[attr]) shapeEl.setAttribute(attr, shp[attr]); }); break; } shapeEl.classList.add('map-element', 'map-shape', `map-shape-${shp.type}`); const titleEl = document.createElementNS("http://www.w3.org/2000/svg", "title"); titleEl.textContent = shp.description || shp.id; shapeEl.appendChild(titleEl); boothGroup.appendChild(shapeEl); if (shp.description) { shapeEl.addEventListener('mouseenter', (e) => showSimpleTooltip(e, shp.description)); shapeEl.addEventListener('mousemove', moveTooltip); shapeEl.addEventListener('mouseleave', hideTooltip); } });
    }

    // --- Tooltip Functions ---
    function showTooltip(event, booth) { /* ... (previous version) ... */ tooltip.innerHTML = `<strong>${booth.id} - ${booth.company}</strong>${booth.service}`; tooltip.style.opacity = '1'; tooltip.style.visibility = 'visible'; moveTooltip(event); }
    function showSimpleTooltip(event, text) { /* ... (previous version) ... */ if (!text) return; tooltip.innerHTML = text; tooltip.style.opacity = '1'; tooltip.style.visibility = 'visible'; moveTooltip(event); }
    function moveTooltip(event) { /* ... (previous version, adjusted for potential scroll) ... */ const viewportRect = mapViewport.getBoundingClientRect(); const relativeX = event.clientX - viewportRect.left; const relativeY = event.clientY - viewportRect.top; tooltip.style.visibility = 'hidden'; tooltip.style.display = 'block'; const tooltipRect = tooltip.getBoundingClientRect(); tooltip.style.display = ''; tooltip.style.visibility = 'visible'; let finalX = relativeX + 20; let finalY = relativeY + 20; if (finalX + tooltipRect.width > mapViewport.clientWidth - 10) { finalX = relativeX - tooltipRect.width - 20; } if (finalY + tooltipRect.height > mapViewport.clientHeight - 10) { finalY = relativeY - tooltipRect.height - 20; } finalX = Math.max(10, finalX); finalY = Math.max(10, finalY); tooltip.style.left = `${finalX}px`; tooltip.style.top = `${finalY}px`; }
    function hideTooltip() { /* ... (previous version) ... */ tooltip.style.opacity = '0'; tooltip.style.visibility = 'hidden'; }

    // --- Pan & Zoom ---
    function zoom(factor, smooth = true) { // Added smooth parameter
        const oldScale = scale;
        scale = Math.max(MIN_SCALE, Math.min(scale * factor, MAX_SCALE));

        const viewportRect = mapViewport.getBoundingClientRect();
        const centerX = viewportRect.width / 2;
        const centerY = viewportRect.height / 2;

        const pointTo = {
            x: (centerX - currentTranslate.x) / oldScale,
            y: (centerY - currentTranslate.y) / oldScale,
        };

        currentTranslate.x = centerX - pointTo.x * scale;
        currentTranslate.y = centerY - pointTo.y * scale;

        setTransform(smooth); // Apply smoothness
    }

    mapViewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? (1 - ZOOM_SENSITIVITY) : (1 + ZOOM_SENSITIVITY);
        const oldScale = scale;
        scale = Math.max(MIN_SCALE, Math.min(scale * delta, MAX_SCALE));

        const viewportRect = mapViewport.getBoundingClientRect();
        const mouseX = e.clientX - viewportRect.left;
        const mouseY = e.clientY - viewportRect.top;

        const pointTo = {
            x: (mouseX - currentTranslate.x) / oldScale,
            y: (mouseY - currentTranslate.y) / oldScale,
        };

        currentTranslate.x = mouseX - pointTo.x * scale;
        currentTranslate.y = mouseY - pointTo.y * scale;

        setTransform(false); // Wheel zoom is instant
    }, { passive: false });

    mapViewport.addEventListener('mousedown', (e) => {
        if (e.target === mapViewport || e.target === svg || e.target === boothGroup || e.target.classList.contains('map-shape')) {
            if (e.target.closest('a') || e.target.classList.contains('booth')) return;
            e.preventDefault();
            panning = true;
            start = { x: e.clientX - currentTranslate.x, y: e.clientY - currentTranslate.y };
            mapViewport.style.cursor = 'grabbing';
        }
    });
    mapViewport.addEventListener('mousemove', (e) => { if (!panning) return; e.preventDefault(); currentTranslate.x = e.clientX - start.x; currentTranslate.y = e.clientY - start.y; setTransform(false); });
    window.addEventListener('mouseup', () => { if (!panning) return; panning = false; mapViewport.style.cursor = 'grab'; });
    mapViewport.addEventListener('mouseleave', hideTooltip);



    // --- 마우스 이벤트 개선 (모든 요소에서 드래그 가능) ---
let lastPanPoint = { x: 0, y: 0 }; // 마지막 드래그 위치 저장 변수 추가

mapViewport.addEventListener('mousedown', (e) => {
    // 링크를 클릭할 때(a 태그)만 드래그를 막고 나머지 요소에서는 드래그 허용
    if (e.target.closest('a:not(.booth)')) return;
    
    // 오른쪽 클릭은 컨텍스트 메뉴를 위해 허용
    if (e.button === 2) return;
    
    e.preventDefault();
    panning = true;
    start = { 
        x: e.clientX - currentTranslate.x, 
        y: e.clientY - currentTranslate.y 
    };
    lastPanPoint = { x: e.clientX, y: e.clientY };
    mapViewport.style.cursor = 'grabbing';
});

mapViewport.addEventListener('mousemove', (e) => {
    if (!panning) return;
    e.preventDefault();
    
    // 드래그 거리가 작으면 이동 안함 (클릭과 구분)
    const dx = Math.abs(e.clientX - lastPanPoint.x);
    const dy = Math.abs(e.clientY - lastPanPoint.y);
    
    if (dx > 3 || dy > 3) {
        currentTranslate.x = e.clientX - start.x;
        currentTranslate.y = e.clientY - start.y;
        setTransform(false);
    }
    
    lastPanPoint = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mouseup', () => {
    if (!panning) return;
    panning = false;
    mapViewport.style.cursor = 'grab';
});

// --- 터치 이벤트 개선 (모든 요소에서 드래그 가능) ---
let touchLastPanPoint = { x: 0, y: 0 }; // 터치용 마지막 위치 저장

mapViewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        // 링크(a 태그)만 제외하고 모든 요소에서 드래그 시작 가능
        if (e.target.closest('a:not(.booth)')) return;
        
        panning = true;
        start = { 
            x: touch.clientX - currentTranslate.x, 
            y: touch.clientY - currentTranslate.y 
        };
        touchLastPanPoint = { x: touch.clientX, y: touch.clientY };
    }
}, { passive: true }); // passive: true 설정하여 스크롤 성능 개선

mapViewport.addEventListener('touchmove', (e) => {
    if (!panning || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    
    // 드래그 거리가 임계값 이상이면 스크롤 방지
    const dx = Math.abs(touch.clientX - touchLastPanPoint.x);
    const dy = Math.abs(touch.clientY - touchLastPanPoint.y);
    
    if (dx > 5 || dy > 5) {
        e.preventDefault(); // 스크롤 방지
        currentTranslate.x = touch.clientX - start.x;
        currentTranslate.y = touch.clientY - start.y;
        setTransform(false);
    }
    
    touchLastPanPoint = { x: touch.clientX, y: touch.clientY };
}, { passive: false }); // 스크롤 방지를 위해 passive: false




    // --- Other Map Functions ---
    function resetView() {
        // Reset to fixed initial state
        scale = initialScale;
        currentTranslate = { ...initialTranslate };
        setTransform(true); // Smoothly reset
        clearSearch();
    }
    function calculateCenterTranslation(targetScale) { /* ... (previous version) ... */ const bbox = boothGroup.getBBox(); if (!bbox || bbox.width === 0) return { x: 0, y: 0 }; const viewportWidth = mapViewport.clientWidth; const viewportHeight = mapViewport.clientHeight; const contentCenterX = bbox.x + bbox.width / 2; const contentCenterY = bbox.y + bbox.height / 2; const tx = -(contentCenterX * targetScale) + viewportWidth / 2; const ty = -(contentCenterY * targetScale) + viewportHeight / 2; return { x: tx, y: ty }; }
    function calculateInitialScale() { /* ... (previous version) ... */ const bbox = boothGroup.getBBox(); const viewportWidth = mapViewport.clientWidth; const viewportHeight = mapViewport.clientHeight; const padding = 60; if (!bbox || bbox.width === 0 || bbox.height === 0) return initialScale; const scaleX = viewportWidth / (bbox.width + padding * 2); const scaleY = viewportHeight / (bbox.height + padding * 2); return Math.min(scaleX, scaleY, initialScale * 1.5); } // Limit initial zoom out/in

    // --- Search Functions ---
    function clearSearch() { /* ... (previous version) ... */ searchInput.value = ''; searchInfo.textContent = '검색어를 입력하거나 지도를 탐색하세요.'; searchInfo.style.color = '#555'; searchResultsList.innerHTML = ''; document.querySelectorAll('.booth.highlight').forEach(el => el.classList.remove('highlight')); }
    function focusOnBooth(boothId, targetScale = 2.0) { /* ... (previous version) ... */ const booth = boothsData.find(b => b.id === boothId); if (!booth) return; document.querySelectorAll('.booth.highlight').forEach(el => el.classList.remove('highlight')); const boothElement = document.getElementById(`booth-${booth.id}`); if (boothElement) boothElement.classList.add('highlight'); const boothCenterX = booth.x + booth.width / 2; const boothCenterY = booth.y + booth.height / 2; const viewportWidth = mapViewport.clientWidth; const viewportHeight = mapViewport.clientHeight; scale = Math.max(MIN_SCALE, Math.min(targetScale, MAX_SCALE)); currentTranslate.x = -(boothCenterX * scale) + viewportWidth / 2; currentTranslate.y = -(boothCenterY * scale) + viewportHeight / 2; setTransform(true); }
    function performSearch() { /* ... (previous version) ... */ const searchTerm = searchInput.value.trim().toLowerCase(); clearSearch(); if (!searchTerm) { searchInfo.textContent = '검색어를 입력하세요.'; return; } const results = boothsData.filter(booth => booth.id.toLowerCase().includes(searchTerm) || booth.company.toLowerCase().includes(searchTerm)); searchInfo.style.color = results.length > 0 ? '#198754' : '#dc3545'; if (results.length > 0) { searchInfo.textContent = `${results.length}개의 부스를 찾았습니다:`; results.forEach(booth => { const li = document.createElement('li'); const link = document.createElement('a'); link.href = '#'; link.textContent = `${booth.id} - ${booth.company}`; link.dataset.boothId = booth.id; li.appendChild(link); searchResultsList.appendChild(li); const boothElement = document.getElementById(`booth-${booth.id}`); if (boothElement) boothElement.classList.add('highlight'); }); if (results.length === 1) { focusOnBooth(results[0].id); } } else { searchInfo.textContent = '검색 결과가 없습니다.'; } }

    // --- Event Listeners Setup ---
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
    resetViewButton.addEventListener('click', resetView);
    zoomInButton.addEventListener('click', () => zoom(BUTTON_ZOOM_FACTOR)); // Use defined factor
    zoomOutButton.addEventListener('click', () => zoom(1 / BUTTON_ZOOM_FACTOR));
    searchResultsList.addEventListener('click', (e) => { if (e.target.tagName === 'A' && e.target.dataset.boothId) { e.preventDefault(); focusOnBooth(e.target.dataset.boothId); e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } });


    // 브라우저 크기 변경 시 뷰 재조정
    window.addEventListener('resize', () => {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            const bbox = boothGroup.getBBox();
            if (bbox && bbox.width > 0 && bbox.height > 0) {
                // 모바일에서는 중앙 위치로 재조정
                const viewportWidth = mapViewport.clientWidth;
                const viewportHeight = mapViewport.clientHeight;
                const contentCenterX = bbox.x + bbox.width / 2;
                const contentCenterY = bbox.y + bbox.height / 2;

                // 스케일은 유지하고 위치만 조정
                currentTranslate.x = -(contentCenterX * scale) + viewportWidth / 2;
                currentTranslate.y = -(contentCenterY * scale) + viewportHeight / 2;

                setTransform(true); // 부드럽게 전환
            }
        }
    });

    // --- Initial Load Logic ---
    // --- Initial Load Logic ---
    async function initializeMap() {
        const selectedFloor = floorLevelSelector.value; // 현재 선택된 층
        await loadFloorMap(selectedFloor);
    }

    // Start the initialization process
    initializeMap();

}); // End DOMContentLoaded