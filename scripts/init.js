// Initialization and Event Listeners

// Initialize all DOM elements
function initializeElements() {
    editor = document.getElementById('editor');
    content = document.getElementById('content');
    toolBtns = document.querySelectorAll('.tool-btn');
    placeholder = document.getElementById('editorPlaceholder');
    pageTitle = document.getElementById('pageTitle');
    starredSection = document.getElementById('starredSection');
    starredSpaces = document.getElementById('starredSpaces');
    recentSpaces = document.getElementById('recentSpaces');
    sidebar = document.getElementById('sidebar');
    layout = document.getElementById('layout');
    homeBtn = document.querySelector('.home-btn');
    wordCharCount = document.getElementById('wordCharCount');
    autoSaveIndicator = document.getElementById('autoSaveIndicator');
    downloadBtn = document.getElementById('downloadBtn');
}

// Initialize URL handling
function initializeUrl() {
    const hash = window.location.hash.substring(1);
    if (hash === 'home' || hash === '') {
        goHome();
    } else {
        const matchingTab = Object.entries(tabs).find(([id, tab]) => 
            tab.name.toLowerCase().replace(/\s+/g, '-') === hash
        );
        if (matchingTab) {
            switchToTab(matchingTab[0]);
        } else {
            goHome();
        }
    }
}

// Home content functions
function updateHomeContent() {
    updateStatistics();
    updateRecentSbaces();
    updateAllSbaces();
}

function updateStatistics() {
    let totalCharacters = 0;
    let totalWords = 0;
    let totalLines = 0;
    let totalSpaces = 0;
    
    Object.values(tabs).forEach(tab => {
        const textContent = stripHTML(tab.content || '');
        totalCharacters += textContent.length;
        totalWords += textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
        totalLines += textContent.split('\n').length;
        totalSpaces++;
    });
    
    const trashData = JSON.parse(localStorage.getItem('trash') || '[]');
    trashData.forEach(item => {
        const textContent = stripHTML(item.content || '');
        totalCharacters += textContent.length;
        totalWords += textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
        totalLines += textContent.split('\n').length;
        totalSpaces++;
    });
    
    const allData = {
        tabs: tabs,
        trash: trashData
    };
    const storageSize = new Blob([JSON.stringify(allData)]).size;
    const storageSizeKB = Math.round(storageSize / 1024 * 10) / 10;
    
    const lastVisit = localStorage.getItem('lastVisit');
    const lastVisitText = lastVisit ? formatRelativeTime(parseInt(lastVisit)) : 'Never';
    
    document.getElementById('statCharacters').textContent = totalCharacters.toLocaleString();
    document.getElementById('statWords').textContent = totalWords.toLocaleString();
    document.getElementById('statLines').textContent = totalLines.toLocaleString();
    document.getElementById('statSpaces').textContent = totalSpaces;
    document.getElementById('statStorage').textContent = `${storageSizeKB} KB`;
    document.getElementById('statLastVisit').textContent = lastVisitText;
}

function updateRecentSbaces() {
    const recentTabs = Object.entries(tabs)
        .sort((a, b) => (b[1].lastModified || b[1].created) - (a[1].lastModified || a[1].created))
        .slice(0, 5);
    
    const container = document.getElementById('recentSbacesContainer');
    
    if (recentViewMode === 'grid') {
        container.className = 'sbaces-grid';
        container.innerHTML = recentTabs.map(([id, tab]) => createSbaceCard(id, tab, false)).join('');
    } else {
        container.className = 'sbaces-list';
        container.innerHTML = recentTabs.map(([id, tab]) => createSbaceCard(id, tab, true)).join('');
    }
}

function updateAllSbaces() {
    const tabsToUse = searchQuery ? filteredTabs : tabs;
    const totalCount = Object.keys(tabs).length;
    document.getElementById('allSbacesTitle').textContent = `All Sbaces (${totalCount})`;

    const sortedTabs = Object.entries(tabsToUse)
        .sort((a, b) => (b[1].lastModified || b[1].created) - (a[1].lastModified || a[1].created));
    
    const visibleTabs = showingAll ? sortedTabs : sortedTabs.slice(0, allSbacesVisible);
    const container = document.getElementById('allSbacesContainer');
    const showMoreBtn = document.getElementById('showMoreBtn');
    
    if (sortedTabs.length === 0 && searchQuery) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #97979f;">
                <img src="https://utils.marifyt.com/api/assets?image=%2Ficons%2Fsearch2.png&color=97979f" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;">
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No sbaces found</div>
                <div style="font-size: 14px;">Try adjusting your search terms</div>
            </div>
        `;
        showMoreBtn.style.display = 'none';
        return;
    }
    
    if (sortedTabs.length === 0 && !searchQuery) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #97979f;">
                <img src="https://utils.marifyt.com/api/assets?image=%2Ficons%2Fpage.png&color=97979f" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;">
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No sbaces yet</div>
                <div style="font-size: 14px;">Create your first sbace to get started</div>
            </div>
        `;
        showMoreBtn.style.display = 'none';
        return;
    }
    
    if (allViewMode === 'grid') {
        container.className = 'sbaces-grid';
        container.innerHTML = visibleTabs.map(([id, tab]) => createSbaceCardWithHighlight(id, tab, false)).join('');
    } else {
        container.className = 'sbaces-list';
        container.innerHTML = visibleTabs.map(([id, tab]) => createSbaceCardWithHighlight(id, tab, true)).join('');
    }
    
    if (searchQuery) {
        showMoreBtn.style.display = 'none';
    } else {
        if (sortedTabs.length > allSbacesVisible && !showingAll) {
            showMoreBtn.style.display = 'block';
            showMoreBtn.textContent = `Show More (${sortedTabs.length - allSbacesVisible} remaining)`;
        } else {
            showMoreBtn.style.display = 'none';
        }
    }
}

function createSbaceCard(id, tab, isListView) {
    const textContent = stripHTML(tab.content || '');
    const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
    const lastOpened = formatRelativeTime(tab.lastModified || tab.created);
    const dateCreated = new Date(tab.created).toLocaleDateString();
    
    const listClass = isListView ? ' list-view' : '';
    
    return `
        <div class="sbace-card${listClass}" onclick="switchToTab('${id}')">
            <div class="sbace-name">${tab.name}</div>
            <div class="sbace-meta">
                <div class="sbace-stat">${wordCount} words</div>
                <div class="sbace-stat">Opened ${lastOpened}</div>
                <div class="sbace-stat">Created ${dateCreated}</div>
            </div>
        </div>
    `;
}

function createSbaceCardWithHighlight(id, tab, isListView) {
    const textContent = stripHTML(tab.content || '');
    const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
    const lastOpened = formatRelativeTime(tab.lastModified || tab.created);
    const dateCreated = new Date(tab.created).toLocaleDateString();
    
    const listClass = isListView ? ' list-view' : '';
    
    let highlightedName = tab.name;
    if (searchQuery) {
        const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlightedName = tab.name.replace(regex, '<mark>$1</mark>');
    }
    
    return `
        <div class="sbace-card${listClass}" onclick="switchToTab('${id}')">
            <div class="sbace-name">${highlightedName}</div>
            <div class="sbace-meta">
                <div class="sbace-stat">${wordCount} words</div>
                <div class="sbace-stat">Opened ${lastOpened}</div>
                <div class="sbace-stat">Created ${dateCreated}</div>
            </div>
        </div>
    `;
}

function searchSbaces(query) {
    searchQuery = query.toLowerCase().trim();
    
    if (searchQuery === '') {
        filteredTabs = tabs;
    } else {
        filteredTabs = {};
        Object.entries(tabs).forEach(([id, tab]) => {
            const nameMatch = tab.name.toLowerCase().includes(searchQuery);
            const contentMatch = stripHTML(tab.content || '').toLowerCase().includes(searchQuery);
            
            if (nameMatch || contentMatch) {
                filteredTabs[id] = tab;
            }
        });
    }
    
    showingAll = false;
    updateAllSbaces();
}

function toggleAllView(mode) {
    allViewMode = mode;
    
    const gridBtn = document.getElementById('allGridBtn');
    const listBtn = document.getElementById('allListBtn');
    
    if (mode === 'grid') {
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
        gridBtn.querySelector('img').src = 'https://utils.marifyt.com/api/assets?image=%2Ficons%2Fview-mode-tile.png&color=ffffff';
        listBtn.querySelector('img').src = 'https://utils.marifyt.com/api/assets?image=%2Ficons%2Fview-mode-list.png&color=97979f';
    } else {
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
        listBtn.querySelector('img').src = 'https://utils.marifyt.com/api/assets?image=%2Ficons%2Fview-mode-list.png&color=ffffff';
        gridBtn.querySelector('img').src = 'https://utils.marifyt.com/api/assets?image=%2Ficons%2Fview-mode-tile.png&color=97979f';
    }
    
    updateAllSbaces();
}

function showMoreSbaces() {
    showingAll = true;
    updateAllSbaces();
    
    const showMoreBtn = document.getElementById('showMoreBtn');
    showMoreBtn.textContent = 'Show Less';
    showMoreBtn.onclick = showLessSbaces;
}

function showLessSbaces() {
    showingAll = false;
    updateAllSbaces();
    
    const showMoreBtn = document.getElementById('showMoreBtn');
    showMoreBtn.onclick = showMoreSbaces;
}

// Initialize all event listeners
function initializeEventListeners() {
    // Quick find input
    document.getElementById('quickFindInput').addEventListener('input', function(e) {
        const searchText = e.target.value;
        findText = searchText;
        highlightMatches(searchText);
    });

    document.getElementById('quickFindInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextMatch();
        } else if (e.key === 'Escape') {
            hideQuickFind();
        }
    });

    document.getElementById('quickFindInput').addEventListener('click', function(e) {
        e.stopPropagation();
    });

    document.getElementById('quickFindOverlay').addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Find and replace input
    document.getElementById('findInput').addEventListener('input', updateFindCounter);

    // Search input
    document.getElementById('sbaceSearchInput').addEventListener('input', function(e) {
        searchSbaces(e.target.value);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === ' ') {
            checkAutoFormat(e);
        }
        
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            showQuickFind();
            return;
        }
        
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undoAction();
        } else if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || 
                (e.ctrlKey && e.key === 'y')) {
            e.preventDefault();
            redoAction();
        }
        
        if (e.ctrlKey) {
            if (e.key === 'b') {
                e.preventDefault();
                formatText('bold');
            } else if (e.key === 'i') {
                e.preventDefault();
                formatText('italic');
            } else if (e.key === 'u') {
                e.preventDefault();
                formatText('underline');
            }
        }
        
        if (e.key === 'Escape') {
            hideDeleteModal();
            hideClearModal();
            hideSpaceNameModal();
            hideFindReplaceModal();
            hideTrashModal();
            hideImportModal();
            hideQuickFind();
            hideOptionsBar();
            
            const dropdown = document.getElementById('downloadDropdown');
            dropdown.classList.remove('show');
        }

        if (e.key === 'Enter') {
            const spaceModal = document.getElementById('spaceNameModal');
            if (spaceModal.classList.contains('show')) {
                e.preventDefault();
                confirmSpaceName();
            }
        }
    });

    // Selection change
    document.addEventListener('selectionchange', function() {
        if (document.activeElement === editor) {
            checkActiveFormatting();
            updateWordCharCount();
        }
    });

    // Editor events
    editor.addEventListener('keydown', function(e) {
        debouncedSave();
        
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            document.execCommand('insertLineBreak');
            updatePlaceholder();
            updateWordCharCount();
            return;
        }
        
        if (e.key === 'Enter') {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const range = selection.getRangeAt(0);
            const node = selection.anchorNode;
            const listItem = node ? node.parentNode.closest('li') : null;
            
            if (listItem) {
                const listItemText = listItem.textContent.trim();
                
                if (listItemText === '') {
                    e.preventDefault();
                    
                    const newPara = document.createElement('p');
                    newPara.innerHTML = '<br>';
                    
                    if (listItem.parentNode.parentNode) {
                        listItem.parentNode.parentNode.insertBefore(newPara, listItem.parentNode.nextSibling);
                    } else {
                        editor.appendChild(newPara);
                    }
                    
                    const newRange = document.createRange();
                    newRange.selectNodeContents(newPara);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    
                    updatePlaceholder();
                    updateWordCharCount();
                    return;
                }
            }
        }
        
        if (e.key === 'Tab') {
            e.preventDefault();
            const selection = window.getSelection();
            const node = selection.anchorNode;
            let listItem = node;
            
            while (listItem && listItem !== editor && listItem.nodeName !== 'LI') {
                listItem = listItem.parentNode;
            }
            
            if (listItem && listItem.nodeName === 'LI') {
                const currentLevel = getListLevel(listItem);
                
                if (e.shiftKey) {
                    if (currentLevel > 0) {
                        document.execCommand('outdent');
                    }
                } else {
                    const range = selection.getRangeAt(0);
                    const curListItem = range.startContainer.parentElement.closest('li');
                    
                    if (curListItem) {
                        const savedSelection = {
                            startOffset: range.startOffset,
                            startContainer: range.startContainer
                        };
                        
                        const listRange = document.createRange();
                        listRange.selectNodeContents(curListItem);
                        selection.removeAllRanges();
                        selection.addRange(listRange);
                        
                        document.execCommand('indent');
                        
                        const newLevel = getListLevel(curListItem);
                        const newParentList = curListItem.parentElement;
                        
                        if (newLevel % 2 === 1) {
                            newParentList.style.listStyleType = 'lower-alpha';
                        } else {
                            newParentList.style.listStyleType = 'decimal';
                        }
                        
                        const newRange = document.createRange();
                        newRange.setStart(savedSelection.startContainer, savedSelection.startOffset);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    }
                }
            } else {
                document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
            }
            updatePlaceholder();
            updateWordCharCount();
        }
        
        if (e.key === 'Backspace') {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const range = selection.getRangeAt(0);
            const node = selection.anchorNode;
            const listItem = node ? node.parentNode.closest('li') : null;
            
            if (listItem && range.startOffset === 0) {
                const listItemText = listItem.textContent.trim();
                
                if (listItemText === '') {
                    e.preventDefault();
                    document.execCommand('outdent');
                    updatePlaceholder();
                    updateWordCharCount();
                    return;
                }
            }
        }
    });

    editor.addEventListener('input', function() {
        setTimeout(checkActiveFormatting, 0);
        setTimeout(forceSpellCheck, 0);
        debouncedSave();
        updatePlaceholder();
        updateWordCharCount();
    });

    editor.addEventListener('keyup', function(e) {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
            setTimeout(forceSpellCheck, 0);
        }
    });

    editor.addEventListener('focus', function() {
        checkActiveFormatting();
        updatePlaceholder();
        updateWordCharCount();
    });

    editor.addEventListener('blur', function() {
        updatePlaceholder();
    });

    editor.addEventListener('paste', function(e) {
        e.preventDefault();
        
        const clipboardData = e.clipboardData || window.clipboardData;
        
        let htmlContent = clipboardData.getData('text/html');
        const textContent = clipboardData.getData('text/plain');
        
        if (htmlContent) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            
            const allowedTags = ['B', 'STRONG', 'I', 'EM', 'U', 'OL', 'UL', 'LI', 'P', 'BR', 'DIV'];
            const walker = document.createTreeWalker(
                tempDiv,
                NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode: function(node) {
                        return allowedTags.includes(node.tagName) ? 
                            NodeFilter.FILTER_ACCEPT : 
                            NodeFilter.FILTER_REJECT;
                    }
                }
            );
            
            const nodesToRemove = [];
            let node;
            while (node = walker.nextNode()) {
                if (!allowedTags.includes(node.tagName)) {
                    nodesToRemove.push(node);
                }
            }
            
            nodesToRemove.forEach(node => {
                const parent = node.parentNode;
                while (node.firstChild) {
                    parent.insertBefore(node.firstChild, node);
                }
                parent.removeChild(node);
            });
            
            document.execCommand('insertHTML', false, tempDiv.innerHTML);
        } else {
            document.execCommand('insertText', false, textContent);
        }
        
        updatePlaceholder();
        updateWordCharCount();
        debouncedSave();
    });

    editor.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // Click outside handlers
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-options') && !e.target.closest('.options-bar')) {
            hideOptionsBar();
        }
    });

    // Modal overlay clicks
    document.getElementById('deleteModal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideDeleteModal();
        }
    });

    document.getElementById('clearModal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideClearModal();
        }
    });

    document.getElementById('spaceNameModal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideSpaceNameModal();
        }
    });

    document.getElementById('findReplaceModal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideFindReplaceModal();
        }
    });

    document.getElementById('trashModal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideTrashModal();
        }
    });

    document.getElementById('importModal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideImportModal();
        }
    });

    // Save before unload
    window.addEventListener('beforeunload', function() {
        if (currentTabId) {
            saveCurrentTab();
        }
    });
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    initThemeToggle();
    loadTabs();
    updatePlaceholder();
    initializeUrl();
    initializeEventListeners();
    initializeBackupDirectory();
});