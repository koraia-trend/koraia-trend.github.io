import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { initAmbientAnimations, updateAmbientAnimations } from './ambient_animations.js';


// --- 설정값 ---
const moveSpeed = 50; // 아바타 수동 이동 속도
const autoMoveSpeed = 20; // 아바타 자동 이동 속도
const rotationSpeed = Math.PI * 1.5; // 아바타 수동 회전 속도 (라디안/초)
const autoRotationSpeed = Math.PI * 1.8; // 아바타 자동 회전 속도 (라디안/초)
const cameraFollowSpeed = 0.08; // 카메라 추적 속도 (Lerp 알파값)
const cameraOffset = new THREE.Vector3(0, 25, 35); // 아바타 기준 카메라 오프셋 (뒤, 위)

// --- 상태 변수 ---
let currentMode = 'orbit'; // 현재 컨트롤 모드 ('avatar' 또는 'orbit')
let avatar; // 아바타 3D 객체
const keyboardState = {}; // 키보드 입력 상태
const clock = new THREE.Clock(); // 애니메이션 시간 간격 계산용
let collidableObjects = []; // 충돌 감지 대상 객체 배열 (부스 등)
let isMovingToBooth = false; // 부스 자동 이동 중인지 여부
let targetPosition = null; // 자동 이동 목표 위치
let pathLine = null; // 자동 이동 경로 시각화 선
let isAvoiding = false; // 장애물 회피 중인지 여부
const avoidanceCheckDistance = 12; // 장애물 감지 거리 (아바타 크기 고려 필요)
const avoidanceAngle = Math.PI / 4; // 회피 시 좌/우 체크 각도 (45도)
const avoidanceRaycaster = new THREE.Raycaster(); // 회피용 Raycaster 객체

// --- 초기 위치/타겟 ---
const initialAvatarPosition = new THREE.Vector3(0, 0, 100); // 아바타 시작 위치 (바닥 기준)
const initialCameraPosition = new THREE.Vector3(0, 120, 0); // 자유 시점 모드 초기 카메라 위치
const initialControlsTarget = new THREE.Vector3(0, 120, 0); // 자유 시점 모드 초기 카메라 타겟

// --- 기본 설정 (THREE.js Scene, Camera, Renderer) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // 하늘색 배경
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true }); // 안티앨리어싱 활성화
renderer.setSize(window.innerWidth, window.innerHeight); // 렌더러 크기 설정
renderer.shadowMap.enabled = true; // 그림자 활성화
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 부드러운 그림자 타입
document.body.appendChild(renderer.domElement); // 렌더러 DOM 추가


// --- 조명 ---
const hemisphereLight = new THREE.HemisphereLight(0xadd8e6, 0x444444, 1.5); // 하늘/땅 색상, 강도
scene.add(hemisphereLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // 방향성 광원 (태양광 역할)
directionalLight.position.set(50, 80, 30); // 광원 위치
directionalLight.castShadow = true; // 그림자 생성 설정
directionalLight.shadow.mapSize.width = 2048; // 그림자 맵 해상도
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5; // 그림자 카메라 설정 (렌더링 범위)
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -150;
directionalLight.shadow.camera.right = 150;
directionalLight.shadow.camera.top = 150;
directionalLight.shadow.camera.bottom = -150;
scene.add(directionalLight);
// const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera); // 디버깅용 그림자 범위 시각화
// scene.add(shadowHelper);

// --- 바닥 ---
const floorSize = 230; // 바닥 크기
const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.1, roughness: 0.6 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2; // 바닥이 XZ 평면에 놓이도록 회전
floor.receiveShadow = true; // 그림자를 받도록 설정
scene.add(floor);

initAmbientAnimations(scene);
// 바닥은 일반적으로 회피 대상이 아니므로 collidableObjects에 추가하지 않음

// --- 아바타 크기 계산 함수 ---
function getAvatarHeightRadius(av) {
     if (!av) return { height: 5, radius: 1.5 }; // 아바타 없으면 기본값
     if (av.geometry instanceof THREE.CapsuleGeometry) {
         // 캡슐 지오메트리 파라미터 사용
         const params = av.geometry.parameters;
         return { height: params.height + params.radius * 2, radius: params.radius };
     } else {
         // 모델 아바타: 바운딩 박스로 추정
         const box = new THREE.Box3().setFromObject(av);
         const size = box.getSize(new THREE.Vector3());
         // 높이는 Y 크기, 반지름은 X/Z 중 큰 값의 절반으로 근사
         return { height: size.y, radius: Math.max(size.x, size.z) / 2 };
     }
}

// --- 아바타 생성/로드 함수 ---
function loadAvatarModel() {
    const mtlLoader = new MTLLoader();
    mtlLoader.setPath('models/'); // .mtl 파일 경로 설정
    mtlLoader.load('materials.mtl', (materials) => { // .mtl 파일 로드
        materials.preload(); // 재질 미리 로드

        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials); // 로드된 재질 적용
        objLoader.setPath('models/'); // .obj 파일 경로 설정
        objLoader.load('model.obj', (object) => { // .obj 파일 로드
            if (avatar) scene.remove(avatar); // 기존 아바타 제거
            avatar = object; // 로드된 객체를 avatar 변수에 할당
            avatar.scale.set(6.5, 6.5, 6.5); // 모델 크기 조절 (모델에 맞게 조정 필요)

            // 아바타 위치 설정 (Y 위치는 발바닥 기준)
            avatar.position.copy(initialAvatarPosition);
            const box = new THREE.Box3().setFromObject(avatar); // 위치 조정을 위해 바운딩 박스 계산
            avatar.position.y = initialAvatarPosition.y - box.min.y; // 발바닥이 initialAvatarPosition.y에 오도록 조정

            // 그림자 설정
            avatar.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true; // 그림자를 받기도 함
                }
            });

            scene.add(avatar); // 씬에 아바타 추가
            // 초기 모드가 'orbit'이면 아바타 숨김
            if (currentMode === 'orbit') avatar.visible = false;
            console.log('OBJ 아바타 모델 로드 성공!');
        }, undefined, (error) => { // 로드 중 진행 콜백 (undefined), 에러 콜백
            console.error('OBJ 모델 로딩 오류:', error);
            createFallbackAvatar(); // 오류 시 대체 아바타 생성
        });
    }, undefined, (error) => {
        console.error('MTL 파일 로딩 오류:', error);
        createFallbackAvatar(); // MTL 오류 시에도 대체 아바타 생성
    });
}

// --- 기본 캡슐 아바타 생성 함수 (모델 로딩 실패 시) ---
function createFallbackAvatar() {
    console.warn("모델 로딩 실패. 기본 캡슐 아바타를 생성합니다.");
    if (avatar) scene.remove(avatar); // 기존 아바타 있으면 제거
    const size = getAvatarHeightRadius(null); // 기본 캡슐 크기 가져오기
    const avatarGeometry = new THREE.CapsuleGeometry(size.radius, size.height - size.radius * 2, 8, 16); // 몸통 높이 = 전체높이 - 양쪽 반구 높이
    const avatarMaterial = new THREE.MeshStandardMaterial({ color: 0x007bff, roughness: 0.5 });
    avatar = new THREE.Mesh(avatarGeometry, avatarMaterial);
    avatar.position.copy(initialAvatarPosition);
    avatar.position.y = initialAvatarPosition.y + size.height / 2; // 캡슐 중심이 Y 위치가 됨
    avatar.castShadow = true;
    scene.add(avatar);
    // 초기 모드가 'orbit'이면 아바타 숨김
    if (currentMode === 'orbit') avatar.visible = false;
}

// 아바타 로딩 시작
loadAvatarModel();

// --- 부스 및 텍스트 생성 ---
const boothHeight = 3; // 부스 높이
const booths = []; // 부스 메쉬 객체들을 저장할 배열
const fontLoader = new FontLoader(); // 폰트 로더 생성
// 폰트 파일 로드 (CDN 또는 로컬 경로)
fontLoader.load('https://cdn.jsdelivr.net/npm/three@0.163.0/examples/fonts/helvetiker_regular.typeface.json', (font) => {
    // 폰트 로드 완료 후 부스 데이터 순회
    boothData.forEach(data => {
        // 부스 지오메트리 및 재질 생성
        const geometry = new THREE.BoxGeometry(data.width, boothHeight, data.depth);
        const material = new THREE.MeshStandardMaterial({
            color: data.color, // JSON 데이터의 색상 사용
            metalness: 0.2,
            roughness: 0.7
        });
        const booth = new THREE.Mesh(geometry, material);
        // 부스 위치 설정 (JSON 데이터의 x, z는 모서리 기준이므로 중심으로 변환)
        booth.position.set(data.x + data.width / 2, boothHeight / 2, data.z + data.depth / 2);
        booth.castShadow = true; // 그림자 생성
        booth.receiveShadow = true; // 그림자 받음
        booth.userData = { id: data.id.toString(), name: data.name }; // userData에 부스 정보 저장 (ID는 문자열로 통일)
        scene.add(booth); // 씬에 부스 추가
        booths.push(booth); // 배열에 부스 객체 추가 (Raycasting용)
        collidableObjects.push(booth); // 충돌 및 회피 감지 객체 목록에 추가

        // 부스 ID 텍스트 생성
        const textGeometry = new TextGeometry(data.id.toString(), { // ID를 텍스트로 사용
            font: font,
            size: 1.8, // 텍스트 크기
            height: 0.1, // 텍스트 두께
        });
        textGeometry.center(); // 텍스트를 지오메트리 중앙에 정렬
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 }); // 텍스트 색상
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        // 텍스트 위치: 부스 위 중앙
        textMesh.position.set(booth.position.x, boothHeight + 1.5, booth.position.z);
        textMesh.rotation.x = -Math.PI / 2; // 텍스트가 바닥과 평행하도록 회전
        // textMesh.rotation.z = Math.PI; // 텍스트 방향이 반대일 경우 Z축 회전 추가
        scene.add(textMesh);
    });
}, undefined, (error) => console.error('Font loading error:', error));



// --- 예시 부스 데이터 (실제 데이터로 교체 필요) ---
const boothData = [
    { "id": "1", "name": "부스 A (빨강)", "color": 0xff0000, "x": -97.6, "z": -0.1, "width": 35.8, "depth": 19.1 },
    { "id": "2", "name": "부스 B (초록)", "color": 0x00ff00, "x": 46.8, "z": 1.1, "width": 23.9, "depth": 17.8 },
    { "id": "3", "name": "부스 C (파랑)", "color": 0x0000ff, "x": -97.6, "z": -63, "width": 10.6, "depth": 16.6 },
    { "id": "15", "name": "긴 부스 D (노랑)", "color": 0xffff00, "x": -50, "z": 50, "width": 100, "depth": 10 },
    { "id": "28", "name": "작은 부스 E (자홍)", "color": 0xff00ff, "x": 70, "z": -40, "width": 15, "depth": 15 }
];

// --- OrbitControls 설정 ---
const orbitControls = new OrbitControls(camera, renderer.domElement);
// --- 마우스 버튼 기능 변경 (좌클릭: 이동, 우클릭: 회전) ---
orbitControls.mouseButtons = {
	LEFT: THREE.MOUSE.PAN,   // 왼쪽 버튼 드래그 = 이동(Pan)
	MIDDLE: THREE.MOUSE.DOLLY, // 중간 버튼 드래그 = 줌(Dolly) (기본값 유지 또는 필요시 변경)
	RIGHT: THREE.MOUSE.ROTATE // 오른쪽 버튼 드래그 = 회전(Rotate)
};

// --- 이동(Pan) 속도 조절 ---
orbitControls.panSpeed = 2;

orbitControls.enableDamping = true; // 부드러운 이동 효과
orbitControls.dampingFactor = 0.05; // Damping 강도
orbitControls.target.copy(initialControlsTarget); // 초기 카메라 타겟 설정
camera.position.copy(initialCameraPosition); // 초기 카메라 위치 설정
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // 카메라가 땅 아래로 내려가지 않도록 각도 제한
orbitControls.minDistance = 1; // 최소 줌 거리
orbitControls.maxDistance = 200; // 최대 줌 거리
orbitControls.enabled = (currentMode === 'orbit'); // 초기 모드에 따라 활성화 여부 설정
orbitControls.update(); // 초기 카메라 위치/타겟 적용

// --- 키보드 이벤트 리스너 ---
window.addEventListener('keydown', (event) => {
    // 검색 입력 필드에 포커스가 있을 때는 WASD 입력 무시
    if (document.activeElement === searchInput) return;

    // 아바타 모드일 때 키 상태 저장 (자동 이동 중에도 받을 수는 있음)
    if (currentMode === 'avatar') {
        keyboardState[event.code] = true;
    }
    // 검색 입력 필드에서 Enter 키 입력 시 검색 실행
    if (event.code === 'Enter' && document.activeElement === searchInput) {
        handleSearch();
    }
});
window.addEventListener('keyup', (event) => {
    // 검색 입력 필드 포커스 시 무시
    if (document.activeElement === searchInput) return;
    // 아바타 모드일 때 키 상태 해제
    if (currentMode === 'avatar') {
        keyboardState[event.code] = false;
    }
});

// --- 마우스 인터랙션 (Raycasting - 부스 정보 표시) ---
const raycaster = new THREE.Raycaster(); // 부스 정보 표시에 사용할 Raycaster
const mouse = new THREE.Vector2(); // 마우스 좌표 저장용 벡터
const boothInfoDiv = document.getElementById('booth-info'); // 부스 정보 표시용 DIV
let intersectedObject = null; // 현재 마우스 오버된 부스 객체
const highlightColor = new THREE.Color(0x555555); // 마우스 오버 시 부스 하이라이트 색상

function onMouseMove(event) {
    // 마우스 좌표를 Three.js 정규화된 장치 좌표로 변환 (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 자유 시점 모드일 때만 레이캐스팅 수행
    if (currentMode === 'orbit') {
        raycaster.setFromCamera(mouse, camera); // 카메라 시점에서 마우스 위치로 Ray 발사
        const intersects = raycaster.intersectObjects(booths); // 'booths' 배열의 객체들과의 교차 검사

        if (intersects.length > 0) { // 교차된 부스가 있으면
            // 가장 가까운 객체가 이전에 선택된 객체와 다르면
            if (intersectedObject !== intersects[0].object) {
                // 이전 객체 하이라이트 제거
                if (intersectedObject) intersectedObject.material.emissive.setHex(0x000000);
                // 새 객체 선택 및 하이라이트 설정
                intersectedObject = intersects[0].object;
                intersectedObject.material.emissive.setHex(highlightColor.getHex()); // emissive 색상 변경으로 하이라이트 효과
                // 부스 정보 DIV 표시 및 내용 업데이트
                boothInfoDiv.style.display = 'block';
                boothInfoDiv.style.left = `${event.clientX + 10}px`; // 마우스 옆에 표시
                boothInfoDiv.style.top = `${event.clientY + 10}px`;
                boothInfoDiv.textContent = `${intersectedObject.userData.id}: ${intersectedObject.userData.name}`;
            }
        } else { // 교차된 부스가 없으면
            // 하이라이트 제거 및 정보 숨김
            if (intersectedObject) intersectedObject.material.emissive.setHex(0x000000);
            intersectedObject = null;
            boothInfoDiv.style.display = 'none';
        }
    } else { // 아바타 모드에서는 하이라이트 및 정보 표시 비활성화
        if (intersectedObject) intersectedObject.material.emissive.setHex(0x000000);
        intersectedObject = null;
        boothInfoDiv.style.display = 'none';
    }
}
window.addEventListener('mousemove', onMouseMove, false); // 마우스 이동 이벤트에 리스너 등록


// --- UI 요소 참조 ---
const avatarModeBtn = document.getElementById('avatar-mode-btn');
const orbitModeBtn = document.getElementById('orbit-mode-btn');
const resetButton = document.getElementById('reset-camera');
const controlInfoSpan = document.getElementById('control-info');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');


// --- 모드 전환 함수 ---
function switchMode(newMode) {
    if (newMode === currentMode) return; // 같은 모드면 아무 작업 안 함

    // 모드 전환 시 자동 이동/회피 상태 중지 및 초기화
    if (isMovingToBooth) {
        isMovingToBooth = false;
        isAvoiding = false;
        removePathLine(); // 경로 선 제거
        console.log("자동 이동 중지됨 (모드 전환)");
    }

    currentMode = newMode; // 현재 모드 업데이트
    console.log("Switching to mode:", currentMode);
    const avatarExists = avatar && avatar.parent === scene; // 아바타가 로드되어 씬에 있는지 확인

    if (currentMode === 'avatar') { // 아바타 모드로 전환 시
        orbitControls.enabled = false; // OrbitControls 비활성화
        if (avatarExists) avatar.visible = true; // 아바타 표시

        // 카메라 위치를 즉시 아바타 뒤쪽으로 이동
        if (avatarExists) {
             const targetPos = avatar.position.clone(); // 아바타 현재 위치
             const offset = cameraOffset.clone().applyQuaternion(avatar.quaternion); // 아바타 방향 기준 오프셋 계산
             camera.position.copy(targetPos).add(offset); // 카메라 위치 설정
             const lookAtTarget = targetPos.clone(); // 카메라가 바라볼 지점 (아바타)
             lookAtTarget.y += getAvatarHeightRadius(avatar).height * 0.6; // 아바타 키 비례하여 약간 위를 보도록
             camera.lookAt(lookAtTarget); // 카메라 방향 설정
        } else { // 아바타 로드 전이면 기본 위치 사용
             camera.position.copy(initialAvatarPosition).add(cameraOffset);
             camera.lookAt(initialAvatarPosition);
        }

        // UI 업데이트
        avatarModeBtn.classList.add('active');
        orbitModeBtn.classList.remove('active');
        controlInfoSpan.textContent = '이동: WASD 키';

        // 키보드 상태 초기화
        for (const key in keyboardState) { keyboardState[key] = false; }

    } else { // 자유 시점 모드로 전환 시 (currentMode === 'orbit')
        orbitControls.enabled = true; // OrbitControls 활성화
        if (avatarExists) avatar.visible = false; // 아바타 숨김

        // 필요 시 카메라 위치/타겟 강제 리셋 (주석 처리됨)
        camera.position.copy(initialCameraPosition);
        orbitControls.target.copy(initialControlsTarget);
        orbitControls.update(); // 현재 상태에서 OrbitControls 활성화

        // UI 업데이트
        avatarModeBtn.classList.remove('active');
        orbitModeBtn.classList.add('active');
        controlInfoSpan.textContent = '회전: 우클릭 드래그 / 이동: 좌클릭 드래그 / 줌: 휠';
    }
}

// --- 모드 버튼 이벤트 리스너 ---
avatarModeBtn.addEventListener('click', () => switchMode('avatar'));
orbitModeBtn.addEventListener('click', () => switchMode('orbit'));

// --- 리셋 버튼 기능 ---
resetButton.addEventListener('click', () => {
    // 리셋 시 자동 이동/회피 상태 중지 및 초기화
    if (isMovingToBooth) {
        isMovingToBooth = false;
        isAvoiding = false;
        removePathLine();
        console.log("자동 이동 중지됨 (리셋)");
    }

    if (currentMode === 'avatar') { // 아바타 모드에서 리셋
        if (avatar && avatar.parent === scene) {
            const avatarSize = getAvatarHeightRadius(avatar); // 아바타 크기 가져오기
            // 아바타 위치 및 회전 초기화
            avatar.position.copy(initialAvatarPosition);
            // Y 위치 조정 (캡슐/모델 구분)
            if (avatar.geometry instanceof THREE.CapsuleGeometry) {
                 avatar.position.y = initialAvatarPosition.y + avatarSize.height / 2; // 중심 Y 기준
            } else { // 모델 아바타
                 const box = new THREE.Box3().setFromObject(avatar); // 박스 재계산
                 avatar.position.y = initialAvatarPosition.y - box.min.y; // 발바닥 기준
            }
            avatar.rotation.set(0, 0, 0); // 회전 초기화

            // 카메라도 즉시 아바타 뒤로 이동
            const targetPos = avatar.position.clone();
            const offset = cameraOffset.clone(); // 기본 오프셋 (회전 0 기준)
            camera.position.copy(targetPos).add(offset);
            const lookAtTarget = targetPos.clone();
            lookAtTarget.y += avatarSize.height * 0.6; // 시선 높이 조정
            camera.lookAt(lookAtTarget);
        }
    } else { // 자유 시점 모드에서 리셋
        // 카메라 위치 및 타겟 초기화
        camera.position.copy(initialCameraPosition);
        orbitControls.target.copy(initialControlsTarget);
        orbitControls.update(); // 변경사항 적용
    }
});

// --- 창 크기 조절 대응 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; // 종횡비 업데이트
    camera.updateProjectionMatrix(); // 투영 행렬 업데이트
    renderer.setSize(window.innerWidth, window.innerHeight); // 렌더러 크기 재설정
}, false);


// --- 충돌 감지 함수 (수동 이동 시 사용) ---
function checkCollision(nextPosition) {
    // 아바타 없으면 충돌 없음
    if (!avatar || avatar.parent !== scene) return false;

    const avatarSize = getAvatarHeightRadius(avatar); // 아바타 크기 정보
    const avatarCollider = new THREE.Box3(); // 충돌 감지용 아바타 바운딩 박스

    // 아바타 타입에 따라 바운딩 박스 설정
    if (avatar.geometry instanceof THREE.CapsuleGeometry) {
        const radius = avatarSize.radius * 0.9; // 실제보다 약간 작게 설정
        const height = avatarSize.height;
        // 캡슐 중심 기준으로 박스 생성
        avatarCollider.setFromCenterAndSize(
             new THREE.Vector3(nextPosition.x, nextPosition.y, nextPosition.z), // 캡슐 중심 사용
             new THREE.Vector3(radius * 2, height, radius * 2)
        );
    } else { // 모델 아바타
         const box = new THREE.Box3().setFromObject(avatar);
         const currentSize = box.getSize(new THREE.Vector3()).multiplyScalar(0.9); // 약간 줄임
         const centerOffset = box.getCenter(new THREE.Vector3()).sub(avatar.position); // 모델 원점과 중심 간 오프셋
         const center = nextPosition.clone().add(centerOffset); // 다음 위치 기준으로 중심 계산
         avatarCollider.setFromCenterAndSize(center, currentSize);
    }

    // collidableObjects (부스들) 와의 충돌 검사
    for (const obj of collidableObjects) {
        if (obj === avatar) continue; // 자기 자신과는 검사 안 함
        const objCollider = new THREE.Box3().setFromObject(obj); // 장애물 바운딩 박스
        if (avatarCollider.intersectsBox(objCollider)) { // 박스 교차 여부 확인
            console.log("Collision detected with:", obj.userData?.id || obj.type);
            return true; // 충돌 발생
        }
    }
    return false; // 충돌 없음
}


// --- 경로 생성 함수 ---
function createPathLine(startPos, endPos) {
    removePathLine(); // 기존 경로 선 제거

    const points = [];
    points.push(startPos.clone()); // 시작점
    points.push(endPos.clone());   // 끝점 (직선 경로)

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    // 점선 재질 설정
    const material = new THREE.LineDashedMaterial({
        color: 0xff0000, // 빨간색
        linewidth: 2,    // 선 두께 (WebGL에서는 대부분 1로 렌더링됨)
        scale: 1,        // 점선 패턴 스케일
        dashSize: 1,     // 점선 길이
        gapSize: 0.5,    // 점선 간격
    });

    pathLine = new THREE.Line(geometry, material); // 선 객체 생성
    pathLine.computeLineDistances(); // 점선 렌더링을 위한 거리 계산
    scene.add(pathLine); // 씬에 선 추가
    console.log("Path line created");
}

// --- 경로 제거 함수 ---
function removePathLine() {
    if (pathLine) { // 경로 선 객체가 존재하면
        scene.remove(pathLine); // 씬에서 제거
        pathLine.geometry.dispose(); // 지오메트리 메모리 해제
        pathLine.material.dispose(); // 재질 메모리 해제
        pathLine = null; // 참조 제거
        console.log("Path line removed");
    }
}


// --- 검색 처리 함수 ---
function handleSearch() {
    const boothId = searchInput.value.trim(); // 입력값 공백 제거
    if (!boothId) { // 입력값이 없으면
        alert("부스 번호를 입력하세요.");
        return;
    }
    // 아바타 로드 확인
    if (!avatar || avatar.parent !== scene) {
        alert("아바타가 아직 로드되지 않았습니다. 잠시 후 다시 시도하세요.");
        return;
    }

    // 부스 검색 (userData.id 비교, 대소문자 무시)
    const targetBooth = booths.find(b => b.userData.id.toLowerCase() === boothId.toLowerCase());

    if (!targetBooth) { // 해당 부스가 없으면
        alert(`부스 번호 "${boothId}"를 찾을 수 없습니다.`);
        searchInput.value = ''; // 입력 필드 비우기
        return;
    }

    console.log(`Found booth: ${targetBooth.userData.id} (${targetBooth.userData.name})`);

    // 1. 목표 위치 설정 (부스 앞쪽 중앙)
    targetPosition = targetBooth.position.clone(); // 부스 중심 위치 복사
    const boothBox = new THREE.Box3().setFromObject(targetBooth);
    const boothSize = boothBox.getSize(new THREE.Vector3());
    const avatarSize = getAvatarHeightRadius(avatar);
    // 부스 Z축 방향으로 부스 깊이 절반 + 아바타 반지름 * 3 만큼 떨어진 위치 계산
    targetPosition.z += boothSize.z / 2 + avatarSize.radius * 3;
    // Y 위치는 현재 아바타 높이 유지 (또는 바닥 기준으로 재설정 가능)
    targetPosition.y = avatar.position.y;

    // 2. 아바타 모드로 전환 (필요시)
    if (currentMode !== 'avatar') {
        switchMode('avatar');
    }

    // 3. 경로 생성
    createPathLine(avatar.position, targetPosition);

    // 4. 자동 이동 상태 시작 및 회피 상태 초기화
    isMovingToBooth = true;
    isAvoiding = false; // 검색 시작 시 회피 상태 초기화
    console.log("Starting auto-move to booth:", boothId, " at:", targetPosition);

    // 입력 필드 비우기
    searchInput.value = '';
}

// 검색 버튼 이벤트 리스너
searchButton.addEventListener('click', handleSearch);


// --- 렌더링 루프 (애니메이션) ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = clock.getElapsedTime(); // Get total time for animations needing it
    const avatarSize = getAvatarHeightRadius(avatar);

    // --- 아바타 모드일 때의 로직 ---
    if (currentMode === 'avatar' && avatar && avatar.parent === scene) {

        let finalMoveDirection = new THREE.Vector3(0, 0, 0); // 이번 프레임 최종 이동 방향
        let targetRotationY = avatar.rotation.y; // 목표 Y 회전 (현재값으로 초기화)
        let applyRotation = true; // 회전 적용 여부 (기본적으로 적용 시도)

        // --- 자동 이동 (부스 찾기) 로직 ---
        if (isMovingToBooth && targetPosition) {
            const distanceToTarget = avatar.position.distanceTo(targetPosition); // 목표까지 거리

            // 목표 도착 판정 (반지름 2배 이내)
            if (distanceToTarget > avatarSize.radius * 2) {
                // 목표 지점 직접 방향
                const directDirection = targetPosition.clone().sub(avatar.position).normalize();

                // --- 장애물 감지 및 회피 로직 ---
                let desiredMoveDirection = directDirection.clone(); // 기본적으로 목표 방향으로 이동 시도
                isAvoiding = false; // 매 프레임 회피 상태 재평가

                const avatarForward = new THREE.Vector3(0, 0, -1).applyQuaternion(avatar.quaternion); // 아바타 현재 전방
                const rayOrigin = avatar.position.clone().add(new THREE.Vector3(0, avatarSize.height * 0.5, 0)); // Ray 시작점 (중심 높이)

                // 1. 전방 감지
                avoidanceRaycaster.set(rayOrigin, avatarForward);
                const intersects = avoidanceRaycaster.intersectObjects(collidableObjects);

                if (intersects.length > 0 && intersects[0].distance < avoidanceCheckDistance) {
                    console.log("Obstacle detected ahead! Dist:", intersects[0].distance.toFixed(2));
                    isAvoiding = true; // 회피 상태 시작

                    // 2. 좌/우 탐색
                    const rightCheckDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(avatar.up, -avoidanceAngle).applyQuaternion(avatar.quaternion);
                    avoidanceRaycaster.set(rayOrigin, rightCheckDir);
                    const rightIntersects = avoidanceRaycaster.intersectObjects(collidableObjects);

                    const leftCheckDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(avatar.up, avoidanceAngle).applyQuaternion(avatar.quaternion);
                    avoidanceRaycaster.set(rayOrigin, leftCheckDir);
                    const leftIntersects = avoidanceRaycaster.intersectObjects(collidableObjects);

                    const rightClear = rightIntersects.length === 0 || rightIntersects[0].distance > avoidanceCheckDistance * 0.8; // 오른쪽 여유 공간 확인
                    const leftClear = leftIntersects.length === 0 || leftIntersects[0].distance > avoidanceCheckDistance * 0.8; // 왼쪽 여유 공간 확인

                    // 3. 회피 방향 결정 (더 결정적인 조향)
                    if (rightClear && leftClear) {
                        // 양쪽 다 비었으면, 목표 지점과의 각도가 작은 쪽으로 회피 (덜 꺾는 방향)
                        const angleToRight = rightCheckDir.angleTo(directDirection);
                        const angleToLeft = leftCheckDir.angleTo(directDirection);
                        if (angleToRight < angleToLeft) {
                            desiredMoveDirection = rightCheckDir; // 오른쪽으로
                            console.log("Avoiding slightly right (both clear)");
                        } else {
                            desiredMoveDirection = leftCheckDir; // 왼쪽으로
                            console.log("Avoiding slightly left (both clear)");
                        }
                    } else if (rightClear) {
                        desiredMoveDirection = rightCheckDir; // 오른쪽으로 회피
                        console.log("Avoiding decisively right");
                    } else if (leftClear) {
                        desiredMoveDirection = leftCheckDir; // 왼쪽으로 회피
                        console.log("Avoiding decisively left");
                    } else {
                        // 양쪽 다 막혔을 때: 강제로 한쪽 방향으로 회전 (예: 오른쪽 90도)
                        console.log("Blocked! Forcing a turn.");
                        // 현재 전방 벡터에서 강제로 오른쪽 90도 방향 설정
                        desiredMoveDirection = new THREE.Vector3().crossVectors(avatar.up, avatarForward).normalize();
                         if (desiredMoveDirection.lengthSq() === 0) { // 만약 위/아래를 보고 있었다면
                              desiredMoveDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(avatar.quaternion); // 임의의 측면 방향
                         }
                        // desiredMoveDirection = leftCheckDir; // 또는 마지막 시도 방향 유지
                    }
                }
                // --- 회피 로직 끝 ---

                finalMoveDirection = desiredMoveDirection; // 최종 이동 방향 설정

                // 목표 회전값 계산 (최종 이동 방향 기준)
                targetRotationY = Math.atan2(finalMoveDirection.x, finalMoveDirection.z);

            } else { // 목표 지점 도착
                console.log("Reached target booth.");
                avatar.position.copy(targetPosition); // 정확한 위치로 스냅
                isMovingToBooth = false;
                isAvoiding = false;
                targetPosition = null;
                removePathLine();
                applyRotation = false; // 도착했으므로 추가 회전 불필요
            }
        }
        // --- WASD 수동 이동 로직 (자동 이동 중 아닐 때만 활성화) ---
        else {
            isAvoiding = false; // 수동 이동 시 회피 상태 해제
            const moveDistance = moveSpeed * delta;
            const velocity = new THREE.Vector3();
            const currentForward = new THREE.Vector3(0, 0, -1).applyQuaternion(avatar.quaternion);

            if (keyboardState['KeyW']) { velocity.add(currentForward.clone().multiplyScalar(moveDistance)); }
            if (keyboardState['KeyS']) { velocity.sub(currentForward.clone().multiplyScalar(moveDistance)); }

            // 회전은 자동 이동이 아닐 때만 키보드로 제어
            const currentRotationSpeed = rotationSpeed * delta;
            if (keyboardState['KeyA']) { avatar.rotateY(currentRotationSpeed); applyRotation = false; } // 수동 회전 시 자동 회전 비활성화
            if (keyboardState['KeyD']) { avatar.rotateY(-currentRotationSpeed); applyRotation = false; } // 수동 회전 시 자동 회전 비활성화

            // 수동 이동 적용 (충돌 검사 포함)
            if (velocity.lengthSq() > 0) {
                const nextPosition = avatar.position.clone().add(velocity);
                nextPosition.y = avatar.position.y;
                if (!checkCollision(nextPosition)) { // 수동 이동용 충돌 검사
                    finalMoveDirection = velocity.normalize(); // 실제 이동 방향 기록 (카메라 추적용)
                    avatar.position.copy(nextPosition);
                } else {
                    finalMoveDirection.set(0,0,0); // 충돌 시 이동 없음
                }
            } else {
                 finalMoveDirection.set(0,0,0); // 이동 입력 없으면 이동 방향 0
            }
            // 수동 이동 시 목표 회전은 현재 회전값 유지 (키보드 입력으로 이미 변경됨)
            targetRotationY = avatar.rotation.y;
            // applyRotation은 키보드 입력 없으면 true, 있으면 false
        }

        // --- 아바타 회전 적용 (자동/수동 공통 - applyRotation 플래그 확인) ---
        if (applyRotation && finalMoveDirection.lengthSq() > 0.001) { // 이동 방향이 있을 때만 회전 적용
            // 현재 회전과 목표 회전 사이의 각도 차이 계산 (최단 경로)
            let currentRotationY = avatar.rotation.y;
            let diff = targetRotationY - currentRotationY;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            // 이번 프레임 최대 회전량 계산 (자동/수동 속도 다를 수 있음)
            const currentAutoRotationSpeed = isMovingToBooth ? autoRotationSpeed : rotationSpeed * 1.5; // 자동 이동 시 더 빠르게 회전
            const maxRotationStep = currentAutoRotationSpeed * delta;
            const rotationStep = THREE.MathUtils.clamp(diff, -maxRotationStep, maxRotationStep);

            // 아바타 Y 회전 업데이트
            avatar.rotation.y += rotationStep;
        }

        // --- 아바타 이동 적용 (자동/수동 공통 - 이미 계산된 finalMoveDirection 사용) ---
        if (!isMovingToBooth && finalMoveDirection.lengthSq() > 0) {
             // 수동 이동은 이미 위에서 충돌 검사 후 적용됨. 여기서는 finalMoveDirection만 사용.
        } else if (isMovingToBooth && finalMoveDirection.lengthSq() > 0) {
            // 자동 이동 적용 (위에서 이미 계산된 방향으로)
            const moveStep = finalMoveDirection.clone().multiplyScalar(autoMoveSpeed * delta);
            const nextPosition = avatar.position.clone().add(moveStep);
            nextPosition.y = avatar.position.y;
            // 자동 이동 시에도 마지막으로 간단한 충돌 체크 추가 가능 (회피 실패 대비)
            // if(!checkCollision(nextPosition)) {
                 avatar.position.copy(nextPosition);
            // } else { console.log("Auto-move final step blocked."); }
        }



        // --- Camera Following Logic (Common) ---
        // Calculate desired camera position based on avatar position and orientation
        const avatarCurrentWorldPos = new THREE.Vector3();
        avatar.getWorldPosition(avatarCurrentWorldPos); // Get reliable current world position

        const lookAtTarget = avatarCurrentWorldPos.clone(); // Target for camera to look at
        lookAtTarget.y += avatarSize.height * 0.6; // Look slightly above avatar base

        const targetCameraPosition = avatarCurrentWorldPos.clone(); // Start from avatar position
        const currentOffset = cameraOffset.clone().applyQuaternion(avatar.quaternion); // Rotate offset vector
        targetCameraPosition.add(currentOffset); // Add offset to get target camera position

        // Smoothly move camera towards the target position
        camera.position.lerp(targetCameraPosition, cameraFollowSpeed);

        // Make camera look at the target
        camera.lookAt(lookAtTarget);

    } // --- End of Avatar Mode Logic ---

    // --- 자유 시점 모드일 때의 로직 ---
    else if (currentMode === 'orbit') {
        orbitControls.update(); // OrbitControls 업데이트 (Damping 등)
    }

    // Final Rendering
    renderer.render(scene, camera);
} // --- End of animate() ---

// --- 초기화 및 애니메이션 시작 ---
switchMode(currentMode); // 페이지 로드 시 초기 모드 UI/상태 설정
animate(); // 렌더링 루프 시작