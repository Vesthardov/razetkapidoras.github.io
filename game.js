// game.js
import * as THREE from 'three';
import { AudioSystem } from './audio.js';
import { Input } from './controls.js';

// Глобальные переменные игры
let scene, camera, renderer;
let rooms = [];
let doorsOpened = 0;
let hasKey = false;
let interactableObjects = []; // Для Raycaster
let shakeTimer = 0;
let lastFootstepTime = 0;

// Настройки игрока
const player = {
    speed: 0.1,
    height: 1.6,
    yaw: 0,
    pitch: 0
};

// UI Элементы
const interactBtn = document.getElementById('interact-btn');
const screamerCanvas = document.getElementById('screamer-canvas');

// Инициализация при нажатии "НАЧАТЬ"
document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('ui-container').style.display = 'block';
    
    AudioSystem.init();
    Input.init();
    initThreeJS();
});

function initThreeJS() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.15); // Мрачный туман

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, player.height, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Освещение (Слабое)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffddaa, 1, 10);
    camera.add(pointLight); // Свет от игрока (как фонарик)
    scene.add(camera);

    // Создаем первую комнату
    generateRoom(0);

    // Обработка ресайза
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

function generateRoom(zOffset) {
    const roomLength = 20;
    const roomWidth = 6;
    const roomGroup = new THREE.Group();
    roomGroup.position.z = zOffset;

    // Материалы
    const wallMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    // Пол и потолок
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomLength), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -roomLength / 2);
    roomGroup.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomLength), wallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 3, -roomLength / 2);
    roomGroup.add(ceiling);

    // Стены
    const wallL = new THREE.Mesh(new THREE.PlaneGeometry(roomLength, 3), wallMat);
    wallL.rotation.y = Math.PI / 2;
    wallL.position.set(-roomWidth / 2, 1.5, -roomLength / 2);
    roomGroup.add(wallL);

    const wallR = new THREE.Mesh(new THREE.PlaneGeometry(roomLength, 3), wallMat);
    wallR.rotation.y = -Math.PI / 2;
    wallR.position.set(roomWidth / 2, 1.5, -roomLength / 2);
    roomGroup.add(wallR);

    // Дверь в конце комнаты
    const isLocked = (doorsOpened + 1) % 5 === 0;
    const doorColor = isLocked ? 0x550000 : 0x442200; // Красная если заперта
    const doorGeo = new THREE.BoxGeometry(2, 2.5, 0.2);
    const doorMat = new THREE.MeshBasicMaterial({ color: doorColor });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.25, -roomLength);
    door.userData = { type: 'door', locked: isLocked, zOffset: zOffset - roomLength };
    roomGroup.add(door);
    interactableObjects.push(door);

    // Шкафчики (Лут)
    for(let i=0; i<3; i++) {
        const lockerGeo = new THREE.BoxGeometry(1, 2, 1);
        const lockerMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const locker = new THREE.Mesh(lockerGeo, lockerMat);
        // Расставляем по краям
        const side = Math.random() > 0.5 ? 1 : -1;
        locker.position.set(side * (roomWidth / 2 - 0.6), 1, -Math.random() * (roomLength - 4) - 2);
        locker.userData = { type: 'locker', searched: false };
        roomGroup.add(locker);
        interactableObjects.push(locker);
    }

    scene.add(roomGroup);
    rooms.push(roomGroup);

    // Очистка старых комнат для памяти
    if (rooms.length > 2) {
        const oldRoom = rooms.shift();
        scene.remove(oldRoom);
    }
}

function handleInteraction(obj) {
    if (obj.userData.type === 'door') {
        if (obj.userData.locked && !hasKey) {
            // Заперто
            return;
        }
        
        // Открытие двери
        AudioSystem.playDoorCreak();
        obj.position.x = 2; // "Открываем" смещением
        obj.userData.type = 'opened'; // Больше не взаимодействуем
        hasKey = false; // Тратим ключ
        doorsOpened++;
        
        generateRoom(obj.userData.zOffset);
    } 
    else if (obj.userData.type === 'locker' && !obj.userData.searched) {
        obj.userData.searched = true;
        obj.material.color.setHex(0x555555); // Меняем цвет обысканного
        
        // 99% шанс скримера
        if (Math.random() < 0.99) {
            triggerScreamer();
        } else {
            hasKey = true; // Нашли ключ
        }
    }
}

function triggerScreamer() {
    AudioSystem.playScreamer();
    shakeTimer = 2.0; // Тряска 2 секунды
    
    // Рисуем лицо кодом на Canvas
    screamerCanvas.style.display = 'block';
    const ctx = screamerCanvas.getContext('2d');
    screamerCanvas.width = window.innerWidth;
    screamerCanvas.height = window.innerHeight;
    
    ctx.fillStyle = '#050000';
    ctx.fillRect(0, 0, screamerCanvas.width, screamerCanvas.height);
    
    // Глаза
    ctx.fillStyle = 'red';
    ctx.shadowColor = 'red';
    ctx.shadowBlur = 50;
    ctx.beginPath();
    ctx.arc(screamerCanvas.width / 2 - 100, screamerCanvas.height / 2 - 100, 30, 0, Math.PI * 2);
    ctx.arc(screamerCanvas.width / 2 + 100, screamerCanvas.height / 2 - 100, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Рот (зубы)
    ctx.fillStyle = 'white';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(screamerCanvas.width / 2 - 150, screamerCanvas.height / 2 + 100);
    for (let i = 0; i <= 300; i += 30) {
        ctx.lineTo(screamerCanvas.width / 2 - 150 + i, screamerCanvas.height / 2 + 100 + (Math.random() * 80 - 40));
    }
    ctx.lineTo(screamerCanvas.width / 2, screamerCanvas.height / 2 + 250);
    ctx.fill();

    // Скрываем скример через 1 секунду
    setTimeout(() => {
        screamerCanvas.style.display = 'none';
    }, 1000);
}

const raycaster = new THREE.Raycaster();
const centerVector = new THREE.Vector2(0, 0);

function animate() {
    requestAnimationFrame(animate);

    // 1. Вращение камеры (Look)
    player.yaw -= Input.lookDelta.x * 0.005;
    player.pitch -= Input.lookDelta.y * 0.005;
    Input.lookDelta = { x: 0, y: 0 }; // Сброс дельты после применения
    
    // Ограничение по вертикали
    player.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, player.pitch));

    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = player.pitch;
    euler.y = player.yaw;
    camera.quaternion.setFromEuler(euler);

    // 2. Движение (Джойстик)
    if (Input.movement.x !== 0 || Input.movement.y !== 0) {
        // Вычисление направления с учетом поворота камеры
        const direction = new THREE.Vector3(Input.movement.x, 0, Input.movement.y);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
        direction.normalize();

        camera.position.addScaledVector(direction, player.speed);

        // Звук шагов
        if (performance.now() - lastFootstepTime > 500) {
            AudioSystem.playFootstep();
            lastFootstepTime = performance.now();
        }
    }

    // 3. Тряска камеры (Скример)
    if (shakeTimer > 0) {
        shakeTimer -= 0.016; // Примерно 1 кадр при 60fps
        camera.position.x += (Math.random() - 0.5) * 0.5;
        camera.position.y += (Math.random() - 0.5) * 0.5;
        // Возвращаем на высоту игрока, если не трясет
        if (shakeTimer <= 0) camera.position.y = player.height; 
    }

    // 4. Взаимодействие (Raycast)
    raycaster.setFromCamera(centerVector, camera);
    const intersects = raycaster.intersectObjects(interactableObjects);
    
    let canInteract = false;
    let targetObj = null;

    if (intersects.length > 0 && intersects[0].distance < 3) {
        const obj = intersects[0].object;
        if ((obj.userData.type === 'door') || 
            (obj.userData.type === 'locker' && !obj.userData.searched)) {
            canInteract = true;
            targetObj = obj;
        }
    }

    interactBtn.style.display = canInteract ? 'block' : 'none';

    if (canInteract && Input.isInteracting) {
        handleInteraction(targetObj);
        Input.isInteracting = false; // Сброс, чтобы не кликать много раз
    }

    renderer.render(scene, camera);
}
