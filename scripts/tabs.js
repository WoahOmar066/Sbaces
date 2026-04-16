// Tab Management Functions

let currentTabId = null;
let tabs = {};
let tabCounter = 0;
let tabToDelete = null;
let isRenaming = false;
let tabToRename = null;
let sidebarCollapsed = false;
let currentOptionsBar = null;
let saveTimeout = null;
let searchQuery = '';
let filteredTabs = {};
let recentViewMode = 'grid';
let allViewMode = 'grid';
let allSbacesVisible = 20;
let showingAll = false;
let sbacesBackupDirectory = null;

let editor, content, toolBtns, placeholder, pageTitle, starredSection;
let starredSpaces, recentSpaces, sidebar, layout, homeBtn, wordCharCount;
let autoSaveIndicator, downloadBtn;

const SVG = {
    page: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
    star: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    starFill: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    pencil: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
    options: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="lucide"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
};

function loadTabs() {
    const savedTabs = localStorage.getItem('editorTabs');

    if (savedTabs) {
        tabs = JSON.parse(savedTabs);
        tabCounter = Math.max(...Object.keys(tabs).map(id => parseInt(id.replace('tab_', '')))) + 1 || 0;
    }

    if (Object.keys(tabs).length === 0) {
        createNewTab('Untitled');
        return;
    }

    renderTabs();
    loadSidebarState();
}

function createNewTab(name = null) {
    const tabId = `tab_${tabCounter++}`;
    const tabName = name || `Space ${Object.keys(tabs).length + 1}`;

    if (currentTabId) saveCurrentTab();

    tabs[tabId] = {
        name: tabName,
        content: '',
        created: Date.now(),
        lastModified: Date.now(),
        starred: false
    };

    localStorage.setItem('editorTabs', JSON.stringify(tabs));
    renderTabs();
    switchToTab(tabId);

    if (content.classList.contains('home')) updateHomeContent();
}

function saveCurrentTab() {
    if (currentTabId && tabs[currentTabId]) {
        tabs[currentTabId].content = editor.innerHTML;
        tabs[currentTabId].lastModified = Date.now();
        localStorage.setItem('editorTabs', JSON.stringify(tabs));

        if (content.classList.contains('home')) updateHomeContent();
    }
}

function switchToTab(tabId) {
    if (currentTabId) saveCurrentTab();

    currentTabId = tabId;
    localStorage.setItem('activeTabId', tabId);

    content.classList.remove('home');
    homeBtn.classList.remove('active');

    downloadBtn.style.display = 'block';

    editor.innerHTML = tabs[tabId].content || '';
    pageTitle.querySelector('.title-text').textContent = tabs[tabId].name;
    updateUrl(tabs[tabId].name);

    document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));

    const activeTab = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (activeTab) activeTab.classList.add('active');

    setTimeout(() => {
        editor.focus();

        const range = document.createRange();
        const selection = window.getSelection();

        if (editor.childNodes.length > 0) {
            let lastNode = editor;
            while (lastNode.lastChild) lastNode = lastNode.lastChild;

            if (lastNode.nodeType === Node.TEXT_NODE) {
                range.setStart(lastNode, lastNode.textContent.length);
            } else {
                range.setStartAfter(lastNode);
            }
        } else {
            range.setStart(editor, 0);
        }

        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        setTimeout(() => {
            document.execCommand('insertText', false, ' ');
            setTimeout(() => {
                document.execCommand('delete');
                content.scrollTo({ top: content.scrollHeight, behavior: 'smooth' });
                checkActiveFormatting();
                updatePlaceholder();
                updateWordCharCount();
            }, 1);
        }, 10);
    }, 50);

    hideOptionsBar();
    updateHeaderButtons();
}

function renderTabs() {
    starredSpaces.innerHTML = '';
    recentSpaces.innerHTML = '';

    const starredTabs = [];
    const normalTabs = [];

    Object.entries(tabs).forEach(([tabId, tab]) => {
        if (tab.starred) starredTabs.push([tabId, tab]);
        else normalTabs.push([tabId, tab]);
    });

    const sortFn = (a, b) => (b[1].lastModified || b[1].created) - (a[1].lastModified || a[1].created);
    starredTabs.sort(sortFn);
    normalTabs.sort(sortFn);

    starredSection.style.display = starredTabs.length > 0 ? 'block' : 'none';

    starredTabs.forEach(([tabId, tab]) => starredSpaces.appendChild(createNavItem(tabId, tab, true)));
    normalTabs.forEach(([tabId, tab]) => recentSpaces.appendChild(createNavItem(tabId, tab, false)));
}

function createNavItem(tabId, tab, isStarred) {
    const navItem = document.createElement('div');
    navItem.className = 'nav-item';

    const iconSvg = isStarred ? SVG.starFill : SVG.page;

    navItem.innerHTML = `
        <button class="nav-link ${currentTabId === tabId ? 'active' : ''}" data-tab-id="${tabId}" onclick="switchToTab('${tabId}')">
            <span class="nav-icon" style="color:var(--text-muted)">${iconSvg}</span>
            <span class="nav-text">${tab.name}</span>
        </button>
        <div class="nav-options" onclick="showSpaceOptions(event, '${tabId}')">
            ${SVG.options}
        </div>
    `;

    return navItem;
}

function toggleStarTab(tabId) {
    if (tabs[tabId]) {
        tabs[tabId].starred = !tabs[tabId].starred;
        localStorage.setItem('editorTabs', JSON.stringify(tabs));
        renderTabs();
        updateHeaderButtons();

        if (content.classList.contains('home')) updateHomeContent();
    }
    hideOptionsBar();
}

function toggleCurrentTabStar() {
    if (currentTabId && tabs[currentTabId]) {
        toggleStarTab(currentTabId);
        updateHeaderButtons();
    }
}

function deleteTab(tabId) {
    showDeleteModal(tabId, tabs[tabId].name);
}

function deleteCurrentTab() {
    if (currentTabId && tabs[currentTabId]) {
        showDeleteModal(currentTabId, tabs[currentTabId].name);
    }
}

function showSpaceOptions(event, tabId) {
    event.preventDefault();
    event.stopPropagation();

    hideOptionsBar();

    const optionsBar = document.createElement('div');
    optionsBar.className = 'options-bar show';
    optionsBar.innerHTML = `
        <button class="options-item tooltip-bottom" onclick="showRenameModal('${tabId}')" data-tooltip-text="Rename">
            ${SVG.pencil}
        </button>
        <button class="options-item tooltip-bottom" onclick="toggleStarTab('${tabId}')" data-tooltip-text="${tabs[tabId].starred ? 'Unstar' : 'Star'}" style="color:#e09614">
            ${tabs[tabId].starred ? SVG.starFill : SVG.star}
        </button>
        <button class="options-item tooltip-bottom" onclick="deleteTab('${tabId}')" data-tooltip-text="Delete" style="color:var(--danger)">
            ${SVG.trash}
        </button>
    `;

    const optionsBtn = event.target.closest('.nav-options');
    optionsBtn.appendChild(optionsBar);
    currentOptionsBar = optionsBar;

    setTimeout(() => {
        document.addEventListener('click', function closeOptionsBar(e) {
            if (!optionsBar.contains(e.target) && !optionsBtn.contains(e.target)) {
                hideOptionsBar();
                document.removeEventListener('click', closeOptionsBar);
            }
        });
    }, 0);
}

function updateHeaderButtons() {
    const renameBtn = document.getElementById('renameBtn');
    const starBtn = document.getElementById('starBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const starBtnIcon = document.getElementById('starBtnIcon');

    if (currentTabId && tabs[currentTabId]) {
        renameBtn.style.display = 'block';
        starBtn.style.display = 'block';
        deleteBtn.style.display = 'block';
        downloadBtn.style.display = 'block';

        if (tabs[currentTabId].starred) {
            starBtnIcon.setAttribute('fill', 'currentColor');
            starBtn.setAttribute('data-tooltip-text', 'Unstar');
        } else {
            starBtnIcon.setAttribute('fill', 'none');
            starBtn.setAttribute('data-tooltip-text', 'Star');
        }
    } else {
        renameBtn.style.display = 'none';
        starBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        downloadBtn.style.display = 'none';
    }
}

function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    const toggleIcon = document.getElementById('sidebarToggleIcon');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const homeBtn = document.querySelector('.home-btn');
    const newSpaceBtn = document.querySelector('.new-space-btn');
    const trashBtn = document.querySelector('.trash-btn');
    const searchBtn = document.querySelector('.search-sidebar-btn');

    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        layout.classList.add('collapsed');
        toggleIcon.setAttribute('data-lucide', 'panel-left-open');
        lucide.createIcons();
        toggleBtn.setAttribute('data-tooltip-text', 'Expand');
        [homeBtn, newSpaceBtn, trashBtn, searchBtn].forEach(b => b && b.classList.add('tooltip-bottom'));
    } else {
        sidebar.classList.remove('collapsed');
        layout.classList.remove('collapsed');
        toggleIcon.setAttribute('data-lucide', 'panel-left-close');
        lucide.createIcons();
        toggleBtn.setAttribute('data-tooltip-text', 'Collapse');
        [homeBtn, newSpaceBtn, trashBtn, searchBtn].forEach(b => b && b.classList.remove('tooltip-bottom'));
    }

    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
    hideOptionsBar();
}

function loadSidebarState() {
    const saved = localStorage.getItem('sidebarCollapsed');
    const toggleIcon = document.getElementById('sidebarToggleIcon');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const homeBtn = document.querySelector('.home-btn');
    const newSpaceBtn = document.querySelector('.new-space-btn');
    const trashBtn = document.querySelector('.trash-btn');
    const searchBtn = document.querySelector('.search-sidebar-btn');

    if (saved === 'true') {
        sidebarCollapsed = true;
        sidebar.classList.add('collapsed');
        layout.classList.add('collapsed');
        toggleIcon.setAttribute('data-lucide', 'panel-left-open');
        lucide.createIcons();
        toggleBtn.setAttribute('data-tooltip-text', 'Expand');
        [homeBtn, newSpaceBtn, trashBtn, searchBtn].forEach(b => b && b.classList.add('tooltip-bottom'));
    } else {
        toggleBtn.setAttribute('data-tooltip-text', 'Collapse');
        [homeBtn, newSpaceBtn, trashBtn, searchBtn].forEach(b => b && b.classList.remove('tooltip-bottom'));
    }
}

function goHome() {
    currentTabId = null;
    editor.innerHTML = '';
    pageTitle.querySelector('.title-text').textContent = 'Home';
    content.classList.add('home');
    downloadBtn.style.display = 'none';
    autoSaveIndicator.className = 'auto-save-indicator';

    const searchInput = document.getElementById('sbaceSearchInput');
    if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        filteredTabs = tabs;
    }

    document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
    homeBtn.classList.add('active');

    updatePlaceholder();
    updateUrl();
    hideOptionsBar();
    updateHomeContent();
    updateLastVisit();
    updateWordCharCount();
    updateHeaderButtons();
}

function showSearchModal() {
    goHome();
    setTimeout(() => {
        const searchInput = document.getElementById('sbaceSearchInput');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }, 50);
}

function openRenameFromHeader() {
    if (currentTabId && tabs[currentTabId]) {
        showRenameModal(currentTabId);
    }
}

function moveToTrash(tabId) {
    const tab = tabs[tabId];
    if (!tab) return;

    const trashData = JSON.parse(localStorage.getItem('trash') || '[]');
    trashData.push({
        id: tabId,
        name: tab.name,
        content: tab.content,
        created: tab.created,
        lastModified: tab.lastModified,
        starred: tab.starred,
        deletedAt: Date.now()
    });
    localStorage.setItem('trash', JSON.stringify(trashData));
}

function confirmDelete() {
    if (tabToDelete && Object.keys(tabs).length > 1) {
        moveToTrash(tabToDelete);
        delete tabs[tabToDelete];
        localStorage.setItem('editorTabs', JSON.stringify(tabs));

        if (currentTabId === tabToDelete) goHome();

        renderTabs();
        if (content.classList.contains('home')) updateHomeContent();
    }
    hideDeleteModal();
}