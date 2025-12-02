// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyVBgJwTHQ6_gtiN3mc4IFRQWnuCQbGhW93FSGUXKn8fQL3bA4NXnh0_SMRKVI2qWsd/exec';
const USE_MOCK_DATA = false;

// State
let state = {
    employees: [],
    currentEmployee: null,
    isLoading: false,
    activeFilter: null
};

// DOM Elements
const dom = {
    clock: document.getElementById('clock'),
    date: document.getElementById('date'),
    grid: document.getElementById('employee-grid'),
    loading: document.getElementById('loading-view'),
    gridView: document.getElementById('employee-grid-view'),
    modal: document.getElementById('action-modal'),
    modalName: document.getElementById('modal-employee-name'),
    btnStart: document.getElementById('btn-start'),
    btnStop: document.getElementById('btn-stop'),
    closeModal: document.getElementById('close-modal'),
    msg: document.getElementById('action-message'),
    alphabetFilter: document.getElementById('alphabet-filter')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
    renderAlphabet();
    fetchEmployees();
    setupEventListeners();
    scheduleNextMidnightReset();
});

// Clock & Date
function updateClock() {
    const now = new Date();
    dom.clock.textContent = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    dom.date.textContent = now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Helper: Calculate Work Hours
function calculateWorkHours(startTime, endTime) {
    if (!startTime || !endTime) return '';

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    const diffMin = endTotalMin - startTotalMin;

    const hours = Math.floor(diffMin / 60);
    const minutes = diffMin % 60;

    if (minutes === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${minutes}min`;
}

// Helper: Schedule Midnight Reset
function scheduleNextMidnightReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
        console.log('Midnight reset - refreshing employee data...');
        fetchEmployees();
        scheduleNextMidnightReset();
    }, msUntilMidnight);

    console.log(`Next midnight reset scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
}

// Data Fetching
async function fetchEmployees() {
    setLoading(true);

    if (USE_MOCK_DATA) {
        setTimeout(() => {
            state.employees = [
                { id: 1, name: "Jan Kowalski", source: "PRACA", status: "IDLE" },
                { id: 2, name: "Anna Nowak", source: "ZLECENIE", status: "STARTED" },
                { id: 3, name: "Piotr Wiśniewski", source: "PRACA", status: "IDLE" },
                { id: 4, name: "Maria Wójcik", source: "ZLECENIE", status: "IDLE" },
                { id: 5, name: "Krzysztof Krawczyk", source: "PRACA", status: "STARTED" }
            ];
            renderGrid();
            setLoading(false);
        }, 800);
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        state.employees = data.employees;

        state.employees.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
        renderGrid();
    } catch (error) {
        console.error('Error fetching employees:', error);
        alert(error.message || 'Błąd połączenia z bazą danych!');
    } finally {
        setLoading(false);
    }
}

// Rendering
function renderAlphabet() {
    const alphabet = 'ABCĆDEFGHIJKLŁMNOPRSŚTUWZŹŻ'.split('');
    dom.alphabetFilter.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.textContent = 'WSZYSCY';
    allBtn.className = `alphabet-letter ${state.activeFilter === null ? 'active' : ''}`;
    allBtn.onclick = () => {
        state.activeFilter = null;
        renderGrid();
        renderAlphabet();
    };
    dom.alphabetFilter.appendChild(allBtn);

    alphabet.forEach(letter => {
        const btn = document.createElement('button');
        btn.textContent = letter;
        btn.className = `alphabet-letter ${state.activeFilter === letter ? 'active' : ''}`;
        btn.onclick = () => {
            state.activeFilter = letter;
            renderGrid();
            renderAlphabet();
        };
        dom.alphabetFilter.appendChild(btn);
    });
}

function renderGrid() {
    dom.grid.innerHTML = '';

    let filteredEmployees = state.employees;
    if (state.activeFilter !== null) {
        filteredEmployees = state.employees.filter(emp => {
            const firstLetter = emp.name[0].toUpperCase();
            return firstLetter === state.activeFilter;
        });
    }

    filteredEmployees.forEach(emp => {
        const tile = document.createElement('div');

        let tileClass = 'employee-tile';
        let statusClass = 'employee-status';
        let statusText = 'WOLNE';

        if (emp.status === 'STARTED') {
            tileClass += ' started';
            statusClass += ' active';
            statusText = `W PRACY od ${emp.startTime}`;
        } else if (emp.endTime) {
            tileClass += ' finished';
            statusClass += ' finished';
            const workHours = calculateWorkHours(emp.startTime, emp.endTime);
            statusText = `${emp.startTime} - ${emp.endTime} (${workHours})`;
        }

        tile.className = tileClass;
        tile.onclick = () => openModal(emp);

        const initials = emp.name.split(' ').map(n => n[0]).join('');

        tile.innerHTML = `
            <div class="employee-initials">${initials}</div>
            <div class="employee-name">${emp.name}</div>
            <div class="${statusClass}">
                ${statusText}
            </div>
        `;
        dom.grid.appendChild(tile);
    });

    dom.loading.classList.remove('active');
    dom.gridView.classList.add('active');
}

function setLoading(loading) {
    state.isLoading = loading;
    if (loading) {
        dom.loading.classList.add('active');
        dom.gridView.classList.remove('active');
    }
}

// Modal Logic
function openModal(employee) {
    state.currentEmployee = employee;
    dom.modalName.textContent = employee.name;
    dom.msg.classList.add('hidden');

    if (employee.status === 'STARTED') {
        dom.btnStart.classList.add('hidden');
        dom.btnStop.classList.remove('hidden');
    } else {
        dom.btnStart.classList.remove('hidden');
        dom.btnStop.classList.add('hidden');
    }

    dom.modal.classList.remove('hidden');
}

function closeModal() {
    dom.modal.classList.add('hidden');
    state.currentEmployee = null;
}

// Actions
async function handleAction(action) {
    if (!state.currentEmployee) return;

    const emp = state.currentEmployee;
    const originalStatus = emp.status;

    showMessage('Zapisywanie...', 'success');

    if (USE_MOCK_DATA) {
        setTimeout(() => {
            emp.status = action === 'START' ? 'STARTED' : 'IDLE';
            showMessage(action === 'START' ? 'Rozpoczęto pracę!' : 'Zakończono pracę!', 'success');
            setTimeout(() => {
                closeModal();
                renderGrid();
            }, 1000);
        }, 500);
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: action,
                name: emp.name,
                source: emp.source
            })
        });

        const result = await response.json();
        if (result.success) {
            // Update local state with current time
            const now = new Date();
            const timeStr = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

            if (action === 'START') {
                emp.status = 'STARTED';
                emp.startTime = timeStr;
                emp.endTime = null;
                showMessage('Rozpoczęto pracę!', 'success');
            } else {
                emp.status = 'IDLE';
                emp.endTime = timeStr;
                // startTime remains unchanged
                showMessage('Zakończono pracę!', 'success');
            }

            setTimeout(() => {
                closeModal();
                renderGrid();
            }, 1000);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error(error);
        showMessage('Błąd zapisu! Spróbuj ponownie.', 'error');
        emp.status = originalStatus;
    }
}

function showMessage(text, type) {
    dom.msg.textContent = text;
    dom.msg.className = `message ${type}`;
}

// Event Listeners
function setupEventListeners() {
    dom.closeModal.addEventListener('click', closeModal);
    dom.modal.addEventListener('click', (e) => {
        if (e.target === dom.modal) closeModal();
    });

    dom.btnStart.addEventListener('click', () => handleAction('START'));
    dom.btnStop.addEventListener('click', () => handleAction('STOP'));
}
