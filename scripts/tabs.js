// Tab Management Functions

// Global variables
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

// Get elements (will be initialized in init.js)
let editor, content, toolBtns, placeholder, pageTitle, starredSection;
let starredSpaces, recentSpaces, sidebar, layout, homeBtn, wordCharCount;
let autoSaveIndicator, downloadBtn;

// Load all tabs
function loadTabs() {
    const savedTabs = localStorage.getItem('editorTabs');
    const savedActiveTab = localStorage.getItem('activeTabId');
    
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

// Create new tab
function createNewTab(name = null) {
    const tabId = `tab_${tabCounter++}`;
    const tabName = name || `Space ${Object.keys(tabs).length + 1}`;
    
    if (currentTabId) {
        saveCurrentTab();
    }
    
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
    
    if (content.classList.contains('home')) {
        updateHomeContent();
    }
}

// Save current tab content
function saveCurrentTab() {
    if (currentTabId && tabs[currentTabId]) {
        tabs[currentTabId].content = editor.innerHTML;
        tabs[currentTabId].lastModified = Date.now();
        localStorage.setItem('editorTabs', JSON.stringify(tabs));
        
        if (content.classList.contains('home')) {
            updateHomeContent();
        }
    }
}

// Switch to tab
function switchToTab(tabId) {
    if (currentTabId) {
        saveCurrentTab();
    }
    
    currentTabId = tabId;
    localStorage.setItem('activeTabId', tabId);
    
    content.classList.remove('home');
    homeBtn.classList.remove('active');
    
    downloadBtn.style.display = 'block';
    
    editor.innerHTML = tabs[tabId].content || '';
    pageTitle.querySelector('.title-text').textContent = tabs[tabId].name;
    updateUrl(tabs[tabId].name);
    
    document.querySelectorAll('.nav-link').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    setTimeout(() => {
        editor.focus();
        
        const range = document.createRange();
        const selection = window.getSelection();
        
        if (editor.childNodes.length > 0) {
            let lastNode = editor;
            while (lastNode.lastChild) {
                lastNode = lastNode.lastChild;
            }
            
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
                
                content.scrollTo({
                    top: content.scrollHeight,
                    behavior: 'smooth'
                });
                
                checkActiveFormatting();
                updatePlaceholder();
                updateWordCharCount();
            }, 1);
        }, 10);
        
    }, 50);
    
    hideOptionsBar();
    updateHeaderButtons();
}

// Render all tabs
function renderTabs() {
    starredSpaces.innerHTML = '';
    recentSpaces.innerHTML = '';
    
    const starredTabs = [];
    const normalTabs = [];
    
    Object.entries(tabs).forEach(([tabId, tab]) => {
        if (tab.starred) {
            starredTabs.push([tabId, tab]);
        } else {
            normalTabs.push([tabId, tab]);
        }
    });
    
    starredTabs.sort((a, b) => {
        const aModified = a[1].lastModified || a[1].created;
        const bModified = b[1].lastModified || b[1].created;
        return bModified - aModified;
    });
    
    normalTabs.sort((a, b) => {
        const aModified = a[1].lastModified || a[1].created;
        const bModified = b[1].lastModified || b[1].created;
        return bModified - aModified;
    });
    
    starredSection.style.display = starredTabs.length > 0 ? 'block' : 'none';
    
    starredTabs.forEach(([tabId, tab]) => {
        const navItem = createNavItem(tabId, tab, true);
        starredSpaces.appendChild(navItem);
    });
    
    normalTabs.forEach(([tabId, tab]) => {
        const navItem = createNavItem(tabId, tab, false);
        recentSpaces.appendChild(navItem);
    });
}

// Create navigation item
function createNavItem(tabId, tab, isStarred) {
    const navItem = document.createElement('div');
    navItem.className = 'nav-item';
    
    const iconSrc = isStarred 
        ? 'https://utils.marifyt.com/api/assets?image=%2Ficons%2Fstar5.png&color=ffffff'
        : 'https://utils.marifyt.com/api/assets?image=%2Ficons%2Fpage.png&color=ffffff';
    
    navItem.innerHTML = `
        <a href="#" class="nav-link ${currentTabId === tabId ? 'active' : ''}" data-tab-id="${tabId}" onclick="event.preventDefault(); switchToTab('${tabId}')">
            <img class="nav-icon" src="${iconSrc}" alt="Space">
            <span class="nav-text">${tab.name}</span>
        </a>
        <div class="nav-options" onclick="showSpaceOptions(event, '${tabId}')">
            <img src="https://utils.marifyt.com/icons/options.png" alt="Options">
        </div>
    `;
    
    return navItem;
}

// Toggle star tab
function toggleStarTab(tabId) {
    if (tabs[tabId]) {
        tabs[tabId].starred = !tabs[tabId].starred;
        localStorage.setItem('editorTabs', JSON.stringify(tabs));
        renderTabs();
        updateHeaderButtons();
        
        if (content.classList.contains('home')) {
            updateHomeContent();
        }
    }
    hideOptionsBar();
}

// Toggle star for current tab
function toggleCurrentTabStar() {
    if (currentTabId && tabs[currentTabId]) {
        toggleStarTab(currentTabId);
        updateHeaderButtons();
    }
}

// Delete tab
function deleteTab(tabId) {
    const tabName = tabs[tabId].name;
    showDeleteModal(tabId, tabName);
}

// Delete current tab
function deleteCurrentTab() {
    if (currentTabId && tabs[currentTabId]) {
        const tabName = tabs[currentTabId].name;
        showDeleteModal(currentTabId, tabName);
    }
}

// Show space options
function showSpaceOptions(event, tabId) {
    event.preventDefault();
    event.stopPropagation();
    
    hideOptionsBar();
    
    const optionsBar = document.createElement('div');
    optionsBar.className = 'options-bar show';
    optionsBar.innerHTML = `
        <button class="options-item tooltip-bottom" onclick="showRenameModal('${tabId}')" data-tooltip-text="Rename">
            <img src="https://utils.marifyt.com/icons/edit.png" alt="Edit">
        </button>
        <button class="options-item tooltip-bottom" onclick="toggleStarTab('${tabId}')" data-tooltip-text="${tabs[tabId].starred ? 'Unstar' : 'Star'}">
            <img src="https://utils.marifyt.com/api/assets?image=%2Ficons%2Fstar5.png&color=e09614" alt="Star">
        </button>
        <button class="options-item tooltip-bottom" onclick="deleteTab('${tabId}')" data-tooltip-text="Delete">
            <img src="https://utils.marifyt.com/api/assets?image=%2Ficons%2Ftrash.png&color=ff3030" alt="Delete">
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

// Update header buttons
function updateHeaderButtons() {
    const renameBtn = document.getElementById('renameBtn');
    const starBtn = document.getElementById('starBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const starImg = starBtn.querySelector('img');
    
    if (currentTabId && tabs[currentTabId]) {
        renameBtn.style.display = 'block';
        starBtn.style.display = 'block';
        deleteBtn.style.display = 'block';
        downloadBtn.style.display = 'block';
        
        if (tabs[currentTabId].starred) {
            starImg.src = 'https://utils.marifyt.com/api/assets?image=%2Ficons%2Fstar8-full.png&color=3e3e42';
            starBtn.setAttribute('data-tooltip-text', 'Unstar');
        } else {
            starImg.src = 'https://utils.marifyt.com/api/assets?image=%2Ficons%2Fstar8-empty.png&color=3e3e42';
            starBtn.setAttribute('data-tooltip-text', 'Star');
        }
    } else {
        renameBtn.style.display = 'none';
        starBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        downloadBtn.style.display = 'none';
    }
}

// Toggle sidebar
function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    const toggleIcon = document.querySelector('.sidebar-toggle-icon');
    const toggleBtn = document.querySelector('.sidebar-toggle');
    const homeBtn = document.querySelector('.home-btn');
    const newSpaceBtn = document.querySelector('.new-space-btn');
    const trashBtn = document.querySelector('.trash-btn');
    
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        layout.classList.add('collapsed');
        toggleIcon.src = 'https://utils.marifyt.com/icons/close-sidebar.png';
        toggleBtn.setAttribute('data-tooltip-text', 'Expand');
        
        homeBtn.classList.add('tooltip-bottom');
        newSpaceBtn.classList.add('tooltip-bottom');
        trashBtn.classList.add('tooltip-bottom');
    } else {
        sidebar.classList.remove('collapsed');
        layout.classList.remove('collapsed');
        toggleIcon.src = 'https://utils.marifyt.com/icons/open-sidebar.png';
        toggleBtn.setAttribute('data-tooltip-text', 'Collapse');
        
        homeBtn.classList.remove('tooltip-bottom');
        newSpaceBtn.classList.remove('tooltip-bottom');
        trashBtn.classList.remove('tooltip-bottom');
    }
    
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
    hideOptionsBar();
}

// Load sidebar state
function loadSidebarState() {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') {
        sidebarCollapsed = true;
        sidebar.classList.add('collapsed');
        layout.classList.add('collapsed');
        const toggleIcon = document.querySelector('.sidebar-toggle-icon');
        const toggleBtn = document.querySelector('.sidebar-toggle');
        toggleIcon.src = 'https://utils.marifyt.com/icons/close-sidebar.png';
        toggleBtn.setAttribute('data-tooltip-text', 'Expand');
        
        const homeBtn = document.querySelector('.home-btn');
        const newSpaceBtn = document.querySelector('.new-space-btn');
        const trashBtn = document.querySelector('.trash-btn');
        homeBtn.classList.add('tooltip-bottom');
        newSpaceBtn.classList.add('tooltip-bottom');
        trashBtn.classList.add('tooltip-bottom');
    } else {
        const toggleBtn = document.querySelector('.sidebar-toggle');
        toggleBtn.setAttribute('data-tooltip-text', 'Collapse');
        
        const homeBtn = document.querySelector('.home-btn');
        const newSpaceBtn = document.querySelector('.new-space-btn');
        const trashBtn = document.querySelector('.trash-btn');
        homeBtn.classList.remove('tooltip-bottom');
        newSpaceBtn.classList.remove('tooltip-bottom');
        trashBtn.classList.remove('tooltip-bottom');
    }
}

// Go home
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
    
    document.querySelectorAll('.nav-link').forEach(item => {
        item.classList.remove('active');
    });
    
    homeBtn.classList.add('active');
    
    updatePlaceholder();
    updateUrl();
    hideOptionsBar();
    updateHomeContent();
    updateLastVisit();
    updateWordCharCount();
    updateHeaderButtons();
}

// Open rename modal from header
function openRenameFromHeader() {
    if (currentTabId && tabs[currentTabId]) {
        showRenameModal(currentTabId);
    }
}

// Move to trash
function moveToTrash(tabId) {
    const tab = tabs[tabId];
    if (!tab) return;
    
    const trashData = JSON.parse(localStorage.getItem('trash') || '[]');
    
    const trashItem = {
        id: tabId,
        name: tab.name,
        content: tab.content,
        created: tab.created,
        lastModified: tab.lastModified,
        starred: tab.starred,
        deletedAt: Date.now()
    };
    
    trashData.push(trashItem);
    localStorage.setItem('trash', JSON.stringify(trashData));
}

// Confirm delete
function confirmDelete() {
    if (tabToDelete && Object.keys(tabs).length > 1) {
        moveToTrash(tabToDelete);
        
        delete tabs[tabToDelete];
        localStorage.setItem('editorTabs', JSON.stringify(tabs));
        
        if (currentTabId === tabToDelete) {
            goHome();
        }
        
        renderTabs();
        if (content.classList.contains('home')) {
            updateHomeContent();
        }
    }
    hideDeleteModal();
}