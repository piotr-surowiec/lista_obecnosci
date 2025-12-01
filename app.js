// Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyVBgJwTHQ6_gtiN3mc4IFRQWnuCQbGhW93FSGUXKn8fQL3bA4NXnh0_SMRKVI2qWsd/exec'; // User will replace this
const USE_MOCK_DATA = false; // Set to false when connected to GAS

// State
let state = {
    employees: [],
    currentEmployee: null,
    isLoading: false,
    activeFilter: null // null means show all
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
});

// Clock & Date
function updateClock() {
    const now = new Date();
    dom.clock.textContent = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    dom.date.textContent = now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Data Fetching
async function fetchEmployees() {
    setLoading(true);

    if (USE_MOCK_DATA) {
        // Mock Data Simulation
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
        // Sort alphabetically by name (Surname Name format)
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

    // "ALL" button
    const allBtn = document.createElement('button');
    allBtn.textContent = 'WSZYSCY';
    allBtn.className = `alphabet-letter ${state.activeFilter === null ? 'active' : ''}`;
    allBtn.onclick = () => {
        state.activeFilter = null;
        renderGrid();
        renderAlphabet();
    };
    dom.alphabetFilter.appendChild(allBtn);

    // Letter buttons
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

    // Filter employees
    let filteredEmployees = state.employees;
    if (state.activeFilter !== null) {
        filteredEmployees = state.employees.filter(emp => {
            const firstLetter = emp.name[0].toUpperCase();
            return firstLetter === state.activeFilter;
        });
    }

    filteredEmployees.forEach(emp => {
        const tile = document.createElement('div');
        tile.className = `employee-tile ${emp.status === 'STARTED' ? 'started' : ''}`;
        tile.onclick = () => openModal(emp);

        const initials = emp.name.split(' ').map(n => n[0]).join('');

        tile.innerHTML = `
            <div class="employee-initials">${initials}</div>
            <div class="employee-name">${emp.name}</div>
            <div class="employee-status ${emp.status === 'STARTED' ? 'active' : ''}">
                ${emp.status === 'STARTED' ? 'W PRACY' : 'WOLNE'}
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

    // Smart Buttons Logic
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

    // Optimistic UI Update
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
                action: action, // 'START' or 'STOP'
                name: emp.name,
                source: emp.source // 'PRACA' or 'ZLECENIE'
            })
        });

        const result = await response.json();
        if (result.success) {
            emp.status = action === 'START' ? 'STARTED' : 'IDLE';
            showMessage(action === 'START' ? 'Rozpoczęto pracę!' : 'Zakończono pracę!', 'success');
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
        emp.status = originalStatus; // Revert
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
