// VALORANT GACHA
// Agent, weapon and map data + artwork are loaded from Valorant-API.

const API = "https://valorant-api.com/v1";

const state = {
    currentTab: "agents",
    isSpinning: false,
    data: {
        agents: [],
        weapons: [],
        maps: []
    },
    history: loadHistory()
};

const elements = {
    grid: document.getElementById("selectionGrid"),
    resultName: document.getElementById("resultName"),
    resultDetail: document.getElementById("resultDetail"),
    resultSymbol: document.getElementById("resultSymbol"),
    panelTitle: document.getElementById("panelTitle"),
    panelSubtitle: document.getElementById("panelSubtitle"),
    status: document.getElementById("systemStatus"),
    spinButton: document.getElementById("spinButton"),
    roleFilter: document.getElementById("roleFilter"),
    filterArea: document.getElementById("filterArea"),
    itemCount: document.getElementById("itemCount"),
    historyList: document.getElementById("historyList"),
    clearHistory: document.getElementById("clearHistory"),
    rollHint: document.getElementById("rollHint"),
    tabButtons: document.querySelectorAll(".tab-button")
};

const tabSettings = {
    agents: {
        title: "CHOOSE YOUR AGENT",
        subtitle: "AGENT SELECTION",
        button: "✦ ROLL AGENT",
        hint: "ONE AGENT. ONE DESTINY."
    },
    weapons: {
        title: "CHOOSE YOUR WEAPON",
        subtitle: "WEAPON SELECTION",
        button: "✦ ROLL WEAPON",
        hint: "FIND YOUR PERFECT WEAPON."
    },
    maps: {
        title: "CHOOSE YOUR MAP",
        subtitle: "MAP SELECTION",
        button: "✦ ROLL MAP",
        hint: "LET FATE CHOOSE YOUR BATTLEFIELD."
    }
};

function loadHistory() {
    try {
        const saved = JSON.parse(localStorage.getItem("valorantGachaHistory"));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveHistory() {
    localStorage.setItem(
        "valorantGachaHistory",
        JSON.stringify(state.history)
    );
}

async function fetchApi(endpoint) {
    const response = await fetch(`${API}/${endpoint}`);
    if (!response.ok) {
        throw new Error(`API request failed: ${endpoint}`);
    }

    const json = await response.json();
    return json.data || [];
}

async function loadGameData() {
    elements.status.textContent = "● LOADING DATA";
    elements.grid.innerHTML =
        '<div class="loading-state">CONNECTING TO VALORANT DATA...</div>';

    try {
        const [agentData, weaponData, mapData] = await Promise.all([
            fetchApi("agents?isPlayableCharacter=true"),
            fetchApi("weapons"),
            fetchApi("maps")
        ]);

        state.data.agents = agentData
            .filter(agent => agent.isPlayableCharacter && agent.role)
            .map(agent => ({
                id: agent.uuid,
                name: agent.displayName,
                detail: agent.role.displayName,
                image: agent.fullPortrait || agent.fullPortraitV2 ||
                    agent.bustPortrait || agent.displayIcon,
                symbol: "✦"
            }));

        state.data.weapons = weaponData
            .filter(weapon => weapon.displayName && weapon.displayIcon)
            .map(weapon => ({
                id: weapon.uuid,
                name: weapon.displayName,
                detail: weapon.shopData?.category || "WEAPON",
                image: weapon.displayIcon,
                symbol: "⌁"
            }));

        state.data.maps = mapData
            .filter(map => map.displayName && (map.splash || map.listViewIcon || map.displayIcon))
            .map(map => ({
                id: map.uuid,
                name: map.displayName,
                detail: "BATTLEFIELD",
                image: map.splash || map.listViewIcon || map.displayIcon,
                symbol: "✦"
            }));

        elements.status.textContent = "● SYSTEM READY";
        renderGrid();
    } catch (error) {
        console.error(error);
        elements.status.textContent = "● CONNECTION ERROR";
        elements.grid.innerHTML =
            '<div class="error-state">KHÔNG TẢI ĐƯỢC DỮ LIỆU. HÃY KIỂM TRA INTERNET VÀ TẢI LẠI TRANG.</div>';
        elements.spinButton.disabled = true;
    }
}

function getCurrentItems() {
    let items = state.data[state.currentTab] || [];

    if (state.currentTab === "agents") {
        const role = elements.roleFilter.value;
        if (role !== "all") {
            items = items.filter(agent => agent.detail === role);
        }
    }

    return items;
}

function renderGrid() {
    const items = getCurrentItems();
    elements.grid.innerHTML = "";
    elements.itemCount.textContent = `${items.length} ITEMS`;

    if (!items.length) {
        elements.grid.innerHTML =
            '<div class="loading-state">NO ITEMS AVAILABLE</div>';
        elements.spinButton.disabled = true;
        return;
    }

    items.forEach((item, index) => {
        const tile = document.createElement("article");
        tile.className = "selection-tile";
        tile.dataset.index = String(index);
        tile.dataset.category = state.currentTab;

        if (item.image) {
            const image = document.createElement("img");
            image.className = "tile-image";
            image.src = item.image;
            image.alt = item.name;
            image.loading = "lazy";
            image.onerror = () => image.remove();
            tile.appendChild(image);
        }

        const shade = document.createElement("div");
        shade.className = "tile-shade";

        const symbol = document.createElement("div");
        symbol.className = "tile-symbol";
        symbol.textContent = item.symbol;

        const name = document.createElement("div");
        name.className = "tile-name";
        name.textContent = item.name;

        const detail = document.createElement("div");
        detail.className = "tile-detail";
        detail.textContent = item.detail.toUpperCase();

        tile.append(shade, symbol, name, detail);
        elements.grid.appendChild(tile);
    });

    elements.spinButton.disabled = state.isSpinning;
}

function switchTab(tab) {
    if (state.isSpinning || !tabSettings[tab]) return;

    state.currentTab = tab;

    elements.tabButtons.forEach(button => {
        button.classList.toggle("active", button.dataset.tab === tab);
    });

    const settings = tabSettings[tab];
    elements.panelTitle.textContent = settings.title;
    elements.panelSubtitle.textContent = settings.subtitle;
    elements.spinButton.textContent = settings.button;
    elements.rollHint.textContent = settings.hint;
    elements.filterArea.style.display = tab === "agents" ? "block" : "none";

    elements.resultName.textContent = "NOT SELECTED";
    elements.resultDetail.textContent = "WAITING FOR YOUR ROLL...";
    elements.resultSymbol.textContent = "?";

    renderGrid();
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function spinGacha() {
    if (state.isSpinning) return;

    const items = getCurrentItems();
    if (!items.length) return;

    state.isSpinning = true;
    elements.spinButton.disabled = true;
    elements.spinButton.textContent = "✦ SELECTING...";

    const tiles = Array.from(
        elements.grid.querySelectorAll(".selection-tile")
    );

    tiles.forEach(tile => tile.classList.remove("rolling", "winner"));

    elements.resultName.textContent = "SELECTING...";
    elements.resultDetail.textContent = "RANDOMIZING...";
    elements.resultSymbol.textContent = "✦";

    const duration = 2800;
    const start = Date.now();
    let activeIndex = -1;

    while (Date.now() - start < duration) {
        if (activeIndex >= 0) {
            tiles[activeIndex].classList.remove("rolling");
        }

        activeIndex = Math.floor(Math.random() * tiles.length);
        tiles[activeIndex].classList.add("rolling");

        const progress = (Date.now() - start) / duration;
        await wait(45 + progress * 190);
    }

    tiles.forEach(tile => tile.classList.remove("rolling"));

    const winnerIndex = Math.floor(Math.random() * items.length);
    const winner = items[winnerIndex];

    tiles[winnerIndex].classList.add("winner");

    elements.resultName.textContent = winner.name;
    elements.resultDetail.textContent = winner.detail.toUpperCase();
    elements.resultSymbol.textContent = winner.symbol;

    addHistory(winner);

    state.isSpinning = false;
    elements.spinButton.disabled = false;
    elements.spinButton.textContent =
        tabSettings[state.currentTab].button;
}

function addHistory(item) {
    state.history.unshift({
        name: item.name,
        category: state.currentTab.toUpperCase(),
        detail: item.detail,
        time: new Date().toLocaleString("vi-VN")
    });

    state.history = state.history.slice(0, 30);
    saveHistory();
    renderHistory();
}

function renderHistory() {
    elements.historyList.innerHTML = "";

    if (!state.history.length) {
        elements.historyList.innerHTML =
            '<p class="empty-history">NO HISTORY AVAILABLE</p>';
        return;
    }

    state.history.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "history-item";

        const info = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = `#${index + 1} ${item.name}`;

        const detail = document.createElement("small");
        detail.textContent = ` | ${item.category} | ${item.detail}`;

        info.append(title, detail);

        const time = document.createElement("small");
        time.textContent = item.time;

        row.append(info, time);
        elements.historyList.appendChild(row);
    });
}

elements.tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        switchTab(button.dataset.tab);
    });
});

elements.roleFilter.addEventListener("change", () => {
    if (state.currentTab !== "agents" || state.isSpinning) return;

    elements.resultName.textContent = "NOT SELECTED";
    elements.resultDetail.textContent = "WAITING FOR YOUR ROLL...";
    elements.resultSymbol.textContent = "?";
    renderGrid();
});

elements.spinButton.addEventListener("click", spinGacha);

elements.clearHistory.addEventListener("click", () => {
    if (!confirm("Bạn có chắc muốn xóa toàn bộ lịch sử gacha?")) return;

    state.history = [];
    localStorage.removeItem("valorantGachaHistory");
    renderHistory();
});

// Start website
renderHistory();
loadGameData();
