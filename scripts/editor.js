// Editor Functions

let currentMatches = [];
let currentMatchIndex = 0;
let findText = '';

// Format text function
function formatText(format) {
    toolBtns.forEach(btn => btn.classList.remove('active'));
    
    const button = Array.from(toolBtns).find(btn => {
        const imgAlt = btn.querySelector('img')?.alt.toLowerCase();
        if (format === 'bold' && imgAlt === 'bold') return true;
        if (format === 'italic' && imgAlt === 'italic') return true;
        if (format === 'underline' && imgAlt === 'underline') return true;
        if (format === 'orderedList' && imgAlt === 'numbered list') return true;
        if (format === 'unorderedList' && imgAlt === 'bullet list') return true;
        return false;
    });
    
    if (button) button.classList.add('active');
    
    document.execCommand(format === 'orderedList' ? 'insertOrderedList' : 
                        format === 'unorderedList' ? 'insertUnorderedList' : format);
    
    editor.focus();
    debouncedSave();
    updatePlaceholder();
    updateWordCharCount();
}

// Undo action
function undoAction() {
    document.execCommand('undo');
    editor.focus();
    debouncedSave();
    updatePlaceholder();
    updateWordCharCount();
}

// Redo action
function redoAction() {
    document.execCommand('redo');
    editor.focus();
    debouncedSave();
    updatePlaceholder();
    updateWordCharCount();
}

// Copy text with formatting
function copyText() {
    const selection = window.getSelection();
    
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());
        const htmlContent = container.innerHTML;
        const textContent = container.textContent || container.innerText;
        
        if (navigator.clipboard && navigator.clipboard.write) {
            const clipboardItem = new ClipboardItem({
                'text/html': new Blob([htmlContent], { type: 'text/html' }),
                'text/plain': new Blob([textContent], { type: 'text/plain' })
            });
            
            navigator.clipboard.write([clipboardItem])
                .then(() => {})
                .catch(err => {
                    console.error('Could not copy formatting: ', err);
                    navigator.clipboard.writeText(textContent);
                });
        } else {
            navigator.clipboard.writeText(textContent)
                .catch(err => {
                    console.error('Could not copy: ', err);
                });
        }
    } else {
        const htmlContent = editor.innerHTML;
        const textContent = editor.innerText;
        
        if (navigator.clipboard && navigator.clipboard.write) {
            const clipboardItem = new ClipboardItem({
                'text/html': new Blob([htmlContent], { type: 'text/html' }),
                'text/plain': new Blob([textContent], { type: 'text/plain' })
            });
            
            navigator.clipboard.write([clipboardItem])
                .then(() => {})
                .catch(err => {
                    console.error('Could not copy formatting: ', err);
                    navigator.clipboard.writeText(textContent);
                });
        } else {
            navigator.clipboard.writeText(textContent)
                .catch(err => {
                    console.error('Could not copy: ', err);
                });
        }
    }
    editor.focus();
}

// Check active formatting
function checkActiveFormatting() {
    toolBtns.forEach(btn => btn.classList.remove('active'));
    
    toolBtns.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    });
    
    const isBold = document.queryCommandState('bold');
    const isItalic = document.queryCommandState('italic');
    const isUnderline = document.queryCommandState('underline');
    const isOrderedList = document.queryCommandState('insertOrderedList');
    const isUnorderedList = document.queryCommandState('insertUnorderedList');
    
    toolBtns.forEach(btn => {
        const imgAlt = btn.querySelector('img')?.alt.toLowerCase();
        if (isBold && imgAlt === 'bold') btn.classList.add('active');
        if (isItalic && imgAlt === 'italic') btn.classList.add('active');
        if (isUnderline && imgAlt === 'underline') btn.classList.add('active');
        if (isOrderedList && imgAlt === 'numbered list') btn.classList.add('active');
        if (isUnorderedList && imgAlt === 'bullet list') btn.classList.add('active');
    });
}

// Check for auto-formatting patterns
function checkAutoFormat(e) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let textNode = range.startContainer;
    
    if (textNode.nodeType !== Node.TEXT_NODE) {
        if (textNode.childNodes.length > 0) {
            textNode = textNode.childNodes[range.startOffset - 1] || textNode.childNodes[0];
            if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
        } else {
            return;
        }
    }
    
    const fullText = textNode.textContent;
    const cursorPos = range.startOffset;
    const beforeCursor = fullText.substring(0, cursorPos);
    
    const numberedListPattern = /(\d+)\.\s$/;
    const numberedMatch = beforeCursor.match(numberedListPattern);
    
    if (numberedMatch && e.key === ' ') {
        e.preventDefault();
        
        const patternLength = numberedMatch[0].length;
        const newText = fullText.substring(patternLength);
        textNode.textContent = newText;
        
        const newRange = document.createRange();
        newRange.setStart(textNode, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        setTimeout(() => formatText('orderedList'), 0);
        return;
    }
    
    const bulletListPattern = /\*\s$/;
    const bulletMatch = beforeCursor.match(bulletListPattern);
    
    if (bulletMatch && e.key === ' ') {
        e.preventDefault();
        
        const patternLength = bulletMatch[0].length;
        const newText = fullText.substring(patternLength);
        textNode.textContent = newText;
        
        const newRange = document.createRange();
        newRange.setStart(textNode, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        setTimeout(() => formatText('unorderedList'), 0);
        return;
    }
}

// Search functions
function clearSearchHighlights() {
    const marks = editor.querySelectorAll('mark');
    marks.forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
    });
    currentMatches = [];
    currentMatchIndex = 0;
}

function highlightMatches(searchText) {
    if (!searchText) {
        clearSearchHighlights();
        return;
    }
    
    clearSearchHighlights();
    
    const walker = document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const textNodes = [];
    let node;
    
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    currentMatches = [];
    
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const matches = [...text.matchAll(regex)];
        
        if (matches.length > 0) {
            let lastIndex = 0;
            const fragment = document.createDocumentFragment();
            
            matches.forEach(match => {
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                }
                
                const mark = document.createElement('mark');
                mark.textContent = match[0];
                fragment.appendChild(mark);
                currentMatches.push(mark);
                
                lastIndex = match.index + match[0].length;
            });
            
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }
            
            textNode.parentNode.replaceChild(fragment, textNode);
        }
    });
    
    if (currentMatches.length > 0) {
        currentMatchIndex = 0;
        highlightCurrentMatch();
    }
}

function highlightCurrentMatch() {
    currentMatches.forEach((mark, index) => {
        mark.classList.toggle('current-match', index === currentMatchIndex);
    });
    
    if (currentMatches[currentMatchIndex]) {
        currentMatches[currentMatchIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

function nextMatch() {
    if (currentMatches.length > 0) {
        currentMatchIndex = (currentMatchIndex + 1) % currentMatches.length;
        highlightCurrentMatch();
    }
}

// Quick find functions
function toggleQuickFind() {
    const overlay = document.getElementById('quickFindOverlay');
    
    if (overlay.classList.contains('show')) {
        hideQuickFind();
    } else {
        showQuickFind();
    }
}

function showQuickFind() {
    const overlay = document.getElementById('quickFindOverlay');
    const input = document.getElementById('quickFindInput');
    const findButton = document.querySelector('[data-tooltip-text="Quick Find (Ctrl+F)"]');
    const findIcon = findButton.querySelector('img');
    
    findButton.style.position = 'relative';
    findButton.appendChild(overlay);
    
    findIcon.src = 'https://utils.marifyt.com/api/assets?image=%2Ficons%2Fclose3.png&color=27272a';
    findButton.classList.add('find-open');
    
    overlay.classList.add('show');
    input.focus();
    input.select();
    
    setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
    }, 0);
}

function hideQuickFind() {
    const overlay = document.getElementById('quickFindOverlay');
    const findButton = document.querySelector('[data-tooltip-text="Quick Find (Ctrl+F)"]');
    const findIcon = findButton.querySelector('img');
    
    overlay.classList.remove('show');
    
    findIcon.src = 'https://utils.marifyt.com/icons/search2.png';
    findButton.classList.remove('find-open');
    findButton.style.position = '';
    
    document.body.appendChild(overlay);
    
    document.removeEventListener('click', handleClickOutside);
    
    clearSearchHighlights();
}

function handleClickOutside(e) {
    const overlay = document.getElementById('quickFindOverlay');
    const findButton = document.querySelector('[data-tooltip-text="Quick Find (Ctrl+F)"]');
    
    if (!overlay.contains(e.target) && !findButton.contains(e.target)) {
        hideQuickFind();
    }
}

// Download functions
function showDownloadOptions(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const dropdown = document.getElementById('downloadDropdown');
    const downloadBtn = document.getElementById('downloadBtn');
    
    const buttonRect = downloadBtn.getBoundingClientRect();
    
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${buttonRect.bottom + 8}px`;
    dropdown.style.right = `${window.innerWidth - buttonRect.right}px`;
    dropdown.style.left = 'auto';
    
    dropdown.classList.add('show');
    
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target) && !downloadBtn.contains(e.target)) {
                dropdown.classList.remove('show');
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 0);
}

function downloadAs(format) {
    const dropdown = document.getElementById('downloadDropdown');
    dropdown.classList.remove('show');
    
    if (!currentTabId || !tabs[currentTabId]) return;
    
    const tab = tabs[currentTabId];
    const filename = `space-${tab.name.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}`;
    
    switch (format) {
        case 'pdf':
            downloadAsPDF(filename);
            break;
        case 'txt':
            downloadAsText(filename);
            break;
        case 'md':
            downloadAsMarkdown(filename);
            break;
    }
}

function downloadAsPDF(filename) {
    const marks = editor.querySelectorAll('mark');
    marks.forEach(mark => mark.style.display = 'none');
    
    const originalTitle = document.title;
    document.title = filename;
    
    window.print();
    
    document.title = originalTitle;
    marks.forEach(mark => mark.style.display = '');
}

function downloadAsText(filename) {
    const textContent = stripHTML(editor.innerHTML);
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadAsMarkdown(filename) {
    const markdownContent = htmlToMarkdown(editor.innerHTML);
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Export and import functions
async function setupBackupDirectory() {
    if (!('showDirectoryPicker' in window)) {
        showToast('File System Access API not supported in this browser');
        return false;
    }
    
    try {
        const dirHandle = await window.showDirectoryPicker();
        sbacesBackupDirectory = dirHandle;
        
        localStorage.setItem('backupDirectoryName', dirHandle.name);
        showToast(`Backup directory set to: ${dirHandle.name}`);
        return true;
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error setting up backup directory:', error);
        }
        return false;
    }
}

async function exportAllData() {
    const exportData = {
        tabs: tabs,
        trash: JSON.parse(localStorage.getItem('trash') || '[]'),
        activeTabId: currentTabId,
        sidebarCollapsed: sidebarCollapsed,
        lastVisit: localStorage.getItem('lastVisit'),
        exportDate: Date.now(),
        version: '1.0'
    };
    
    const backupVersion = await getNextBackupVersion();
    const filename = `sbaces-backup-${backupVersion}.json`;
    
    if (sbacesBackupDirectory && 'showDirectoryPicker' in window) {
        try {
            const permission = await sbacesBackupDirectory.requestPermission({ mode: 'readwrite' });
            
            if (permission === 'granted') {
                const fileHandle = await sbacesBackupDirectory.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                
                await writable.write(JSON.stringify(exportData, null, 2));
                await writable.close();
                
                showToast(`Backup created: ${filename} in ${sbacesBackupDirectory.name}`);
                return;
            } else {
                sbacesBackupDirectory = null;
                localStorage.removeItem('backupDirectoryName');
            }
        } catch (error) {
            console.error('Error writing to backup directory:', error);
            sbacesBackupDirectory = null;
            localStorage.removeItem('backupDirectoryName');
        }
    }
    
    if (!sbacesBackupDirectory && 'showDirectoryPicker' in window) {
        const setupSuccess = await setupBackupDirectory();
        if (setupSuccess) {
            return exportAllData();
        }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Backup created: ${filename} in Downloads folder`);
}

function importAllData() {
    const fileInput = document.getElementById('fileInput');
    fileInput.onchange = handleFileSelect;
    fileInput.click();
}

let importData = null;

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            importData = JSON.parse(e.target.result);
            showImportModal();
        } catch (error) {
            showToast('Invalid file format');
        }
    };
    reader.readAsText(file);
    
    event.target.value = '';
}