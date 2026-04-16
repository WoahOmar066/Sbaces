// Modal Functions

// Delete Modal
function showDeleteModal(tabId, tabName) {
    tabToDelete = tabId;
    const modal = document.getElementById('deleteModal');
    const message = document.getElementById('deleteModalMessage');
    
    if (Object.keys(tabs).length <= 1) {
        message.textContent = "Can't delete the last space!";
        const confirmBtn = modal.querySelector('.modal-btn.danger');
        confirmBtn.style.display = 'none';
    } else {
        message.textContent = `Are you sure you want to delete "${tabName}"?`;
        const confirmBtn = modal.querySelector('.modal-btn.danger');
        confirmBtn.style.display = 'block';
    }
    
    modal.classList.add('show');
    hideOptionsBar();
}

function hideDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.classList.remove('show');
    tabToDelete = null;
}

// Clear Modal
function showClearModal() {
    const modal = document.getElementById('clearModal');
    modal.classList.add('show');
}

function hideClearModal() {
    const modal = document.getElementById('clearModal');
    modal.classList.remove('show');
}

function confirmClear() {
    document.execCommand('selectAll');
    document.execCommand('delete');
    editor.focus();
    debouncedSave();
    updatePlaceholder();
    updateWordCharCount();
    hideClearModal();
}

// Space Name Modal
function showNewSpaceModal() {
    isRenaming = false;
    const modal = document.getElementById('spaceNameModal');
    const title = document.getElementById('spaceModalTitle');
    const input = document.getElementById('spaceNameInput');
    const confirmBtn = modal.querySelector('.modal-btn.confirm');
    
    title.textContent = 'New Sbace';
    input.value = '';
    input.placeholder = 'Sbace name...';
    confirmBtn.textContent = 'Create';
    
    modal.classList.add('show');
    setTimeout(() => input.focus(), 100);
}

function showRenameModal(tabId) {
    isRenaming = true;
    tabToRename = tabId;
    const modal = document.getElementById('spaceNameModal');
    const title = document.getElementById('spaceModalTitle');
    const input = document.getElementById('spaceNameInput');
    const confirmBtn = modal.querySelector('.modal-btn.confirm');
    
    title.textContent = 'Rename Space';
    input.value = tabs[tabId].name;
    input.placeholder = 'Sbace name...';
    confirmBtn.textContent = 'Rename';
    
    modal.classList.add('show');
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
    hideOptionsBar();
}

function hideSpaceNameModal() {
    const modal = document.getElementById('spaceNameModal');
    modal.classList.remove('show');
    isRenaming = false;
    tabToRename = null;
}

function confirmSpaceName() {
    const input = document.getElementById('spaceNameInput');
    const name = input.value.trim();
    
    if (!name) return;

    if (isRenaming && tabToRename) {
        tabs[tabToRename].name = name;
        localStorage.setItem('editorTabs', JSON.stringify(tabs));
        renderTabs();
        
        if (currentTabId === tabToRename) {
            pageTitle.querySelector('.title-text').textContent = name;
            updateUrl(name);
        }
        
        if (content.classList.contains('home')) {
            updateHomeContent();
        }
    } else {
        createNewTab(name);
    }
    
    hideSpaceNameModal();
}

// Find and Replace Modal
function showFindReplaceModal() {
    const modal = document.getElementById('findReplaceModal');
    const findInput = document.getElementById('findInput');
    const replaceInput = document.getElementById('replaceInput');
    const counter = document.getElementById('findCounter');
    const replaceBtn = document.getElementById('replaceAllBtn');
    
    findInput.value = '';
    replaceInput.value = '';
    counter.textContent = '0 results';
    replaceInput.style.display = 'none';
    replaceBtn.style.display = 'none';
    
    modal.classList.add('show');
    setTimeout(() => findInput.focus(), 100);
}

function hideFindReplaceModal() {
    const modal = document.getElementById('findReplaceModal');
    modal.classList.remove('show');
    clearSearchHighlights();
}

function updateFindCounter() {
    const findInput = document.getElementById('findInput');
    const replaceInput = document.getElementById('replaceInput');
    const counter = document.getElementById('findCounter');
    const replaceBtn = document.getElementById('replaceAllBtn');
    
    const searchText = findInput.value;
    
    if (searchText) {
        highlightMatches(searchText);
        counter.textContent = `${currentMatches.length} results`;
        
        if (currentMatches.length > 0) {
            replaceInput.style.display = 'block';
            replaceBtn.style.display = 'block';
        } else {
            replaceInput.style.display = 'none';
            replaceBtn.style.display = 'none';
        }
    } else {
        clearSearchHighlights();
        counter.textContent = '0 results';
        replaceInput.style.display = 'none';
        replaceBtn.style.display = 'none';
    }
}

function replaceAll() {
    const findInput = document.getElementById('findInput');
    const replaceInput = document.getElementById('replaceInput');
    const findText = findInput.value;
    const replaceText = replaceInput.value;
    
    if (!findText) return;
    
    const selection = window.getSelection();
    let cursorOffset = 0;
    
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        cursorOffset = range.startOffset;
    }
    
    const content = editor.innerHTML;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const newContent = content.replace(regex, replaceText);
    
    editor.innerHTML = newContent;
    
    setTimeout(() => {
        const newRange = document.createRange();
        const newSelection = window.getSelection();
        
        if (editor.childNodes.length > 0) {
            let textNode = editor.childNodes[0];
            while (textNode && textNode.nodeType !== Node.TEXT_NODE) {
                textNode = textNode.childNodes[0];
            }
            
            if (textNode) {
                newRange.setStart(textNode, Math.min(cursorOffset, textNode.textContent.length));
                newRange.collapse(true);
                newSelection.removeAllRanges();
                newSelection.addRange(newRange);
            }
        }
        
        editor.focus();
    }, 0);
    
    debouncedSave();
    updateWordCharCount();
    showToast(`Replaced ${currentMatches.length} occurrences`);
    hideFindReplaceModal();
}

// Trash Modal
function showTrashModal() {
    const modal = document.getElementById('trashModal');
    const trashContent = document.getElementById('trashContent');
    
    const trashData = JSON.parse(localStorage.getItem('trash') || '[]');
    
    if (trashData.length === 0) {
        trashContent.innerHTML = '<div style="color: #97979f; text-align: center; padding: 20px;">Trash is empty</div>';
    } else {
        trashContent.innerHTML = trashData.map(item => `
            <div class="trash-item">
                <div class="trash-item-info">
                    <div class="trash-item-name">${item.name}</div>
                    <div class="trash-item-date">Deleted ${formatRelativeTime(item.deletedAt)}</div>
                </div>
                <div class="trash-item-actions">
                    <button class="trash-btn-small restore" onclick="restoreFromTrash('${item.id}')">Restore</button>
                    <button class="trash-btn-small delete" onclick="deleteFromTrash('${item.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
    
    modal.classList.add('show');
}

function hideTrashModal() {
    const modal = document.getElementById('trashModal');
    modal.classList.remove('show');
}

function restoreFromTrash(itemId) {
    const trashData = JSON.parse(localStorage.getItem('trash') || '[]');
    const itemIndex = trashData.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) return;
    
    const item = trashData[itemIndex];
    
    tabs[item.id] = {
        name: item.name,
        content: item.content,
        created: item.created,
        lastModified: item.lastModified,
        starred: item.starred
    };
    
    trashData.splice(itemIndex, 1);
    localStorage.setItem('trash', JSON.stringify(trashData));
    localStorage.setItem('editorTabs', JSON.stringify(tabs));
    
    renderTabs();
    showToast(`Restored "${item.name}"`);
    
    showTrashModal();
    
    if (content.classList.contains('home')) {
        updateHomeContent();
    }
}

function deleteFromTrash(itemId) {
    const trashData = JSON.parse(localStorage.getItem('trash') || '[]');
    const itemIndex = trashData.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) return;
    
    const item = trashData[itemIndex];
    trashData.splice(itemIndex, 1);
    localStorage.setItem('trash', JSON.stringify(trashData));
    
    showToast(`Permanently deleted "${item.name}"`);
    
    showTrashModal();
}

// Import Modal
function showImportModal() {
    const modal = document.getElementById('importModal');
    modal.classList.add('show');
}

function hideImportModal() {
    const modal = document.getElementById('importModal');
    modal.classList.remove('show');
    importData = null;
}

function confirmImport() {
    if (!importData) return;
    
    try {
        if (importData.tabs) {
            tabs = importData.tabs;
            localStorage.setItem('editorTabs', JSON.stringify(tabs));
        }
        
        if (importData.trash) {
            localStorage.setItem('trash', JSON.stringify(importData.trash));
        }
        
        if (importData.activeTabId && tabs[importData.activeTabId]) {
            currentTabId = importData.activeTabId;
            localStorage.setItem('activeTabId', currentTabId);
        }
        
        if (typeof importData.sidebarCollapsed === 'boolean') {
            sidebarCollapsed = importData.sidebarCollapsed;
            localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
        }
        
        if (importData.lastVisit) {
            localStorage.setItem('lastVisit', importData.lastVisit);
        }
        
        hideImportModal();
        window.location.reload();
        
    } catch (error) {
        showToast('Import failed');
        hideImportModal();
    }
}