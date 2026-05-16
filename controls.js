// controls.js
export const Input = {
    movement: { x: 0, y: 0 },
    lookDelta: { x: 0, y: 0 },
    isInteracting: false,
    
    init: () => {
        const joystickZone = document.getElementById('joystick-zone');
        const stick = document.getElementById('joystick-stick');
        const lookZone = document.getElementById('look-zone');
        const interactBtn = document.getElementById('interact-btn');
        
        let joystickCenter = { x: 0, y: 0 };
        let joystickTouchId = null;
        let lookTouchId = null;
        let lastLookPos = { x: 0, y: 0 };

        // Джойстик (Ходьба)
        joystickZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            joystickTouchId = touch.identifier;
            const rect = joystickZone.getBoundingClientRect();
            joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            updateJoystick(touch.clientX, touch.clientY);
        }, { passive: false });

        joystickZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === joystickTouchId) {
                    updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                }
            }
        }, { passive: false });

        const resetJoystick = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === joystickTouchId) {
                    joystickTouchId = null;
                    stick.style.transform = `translate(0px, 0px)`;
                    Input.movement = { x: 0, y: 0 };
                }
            }
        };

        joystickZone.addEventListener('touchend', resetJoystick);
        joystickZone.addEventListener('touchcancel', resetJoystick);

        function updateJoystick(x, y) {
            let dx = x - joystickCenter.x;
            let dy = y - joystickCenter.y;
            const maxRadius = 40;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > maxRadius) {
                dx = (dx / distance) * maxRadius;
                dy = (dy / distance) * maxRadius;
            }
            
            stick.style.transform = `translate(${dx}px, ${dy}px)`;
            // Нормализуем значения от -1 до 1
            Input.movement.x = dx / maxRadius;
            Input.movement.y = dy / maxRadius;
        }

        // Обзор (Вращение камеры)
        lookZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            lookTouchId = touch.identifier;
            lastLookPos = { x: touch.clientX, y: touch.clientY };
            Input.lookDelta = { x: 0, y: 0 };
        }, { passive: false });

        lookZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === lookTouchId) {
                    const touch = e.changedTouches[i];
                    Input.lookDelta.x = touch.clientX - lastLookPos.x;
                    Input.lookDelta.y = touch.clientY - lastLookPos.y;
                    lastLookPos = { x: touch.clientX, y: touch.clientY };
                }
            }
        }, { passive: false });

        const resetLook = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === lookTouchId) {
                    lookTouchId = null;
                    Input.lookDelta = { x: 0, y: 0 };
                }
            }
        };

        lookZone.addEventListener('touchend', resetLook);
        lookZone.addEventListener('touchcancel', resetLook);

        // Кнопка E
        interactBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            Input.isInteracting = true;
        });
        interactBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            Input.isInteracting = false;
        });
    }
};
