// Editor Functions

let currentMatches = [];
let currentMatchIndex = 0;
let findText = '';

function formatText(format) {
    toolBtns.forEach(btn => btn.classList.remove('active'));

    const formatToIcon = {
        bold: 'bold', italic: 'italic', underline: 'underline',
        orderedList: 'list-ordered', unorderedList: 'list'
    };

    const targetIcon = formatToIcon[format];
    if (targetIcon) {
        const button = Array.from(toolBtns).find(btn => {
            const icon = btn.querySelector('i[data-lucide]');
            return icon && icon.getAttribute('data-lucide') === targetIcon;
        });
        if (button) button.classList.add('active');
    }

    document.execCommand(
        format === 'orderedList' ? 'insertOrderedList' :
        format === 'unorderedList' ? 'insertUnorderedList' : format
    );

    editor.focus();
    debouncedSave();
    updatePlaceholder();
    updateWordCharCount();
}

function undoAction() {
    document.execCommand('undo');
    editor.focus();
    debouncedSave();
    updatePlaceholder();
    updateWordCharCount();
}

function redoAction() {
    document.execCommand('redo');
    editor.focus();
    debouncedSave();
    updatePlaceholder();
    updateWordCharCount();
}

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
            navigator.clipboard.write([clipboardItem]).catch(() => navigator.clipboard.writeText(textContent));
        } else {
            navigator.clipboard.writeText(textContent);
        }
    } else {
        const htmlContent = editor.innerHTML;
        const textContent = editor.innerText;

        if (navigator.clipboard && navigator.clipboard.write) {
            const clipboardItem = new ClipboardItem({
                'text/html': new Blob([htmlContent], { type: 'text/html' }),
                'text/plain': new Blob([textContent], { type: 'text/plain' })
            });
            navigator.clipboard.write([clipboardItem]).catch(() => navigator.clipboard.writeText(textContent));
        } else {
            navigator.clipboard.writeText(textContent);
        }
    }
    editor.focus();
}

function checkActiveFormatting() {
    toolBtns.forEach(btn => {
        btn.classList.remove('active');
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    });

    const states = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        'list-ordered': document.queryCommandState('insertOrderedList'),
        list: document.queryCommandState('insertUnorderedList'),
    };

    toolBtns.forEach(btn => {
        const icon = btn.querySelector('i[data-lucide]');
        if (!icon) return;
        const name = icon.getAttribute('data-lucide');
        if (states[name]) btn.classList.add('active');
    });
}

function checkAutoFormat(e) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    let textNode = range.startContainer;

    if (textNode.nodeType !== Node.TEXT_NODE) {
        if (textNode.childNodes.length > 0) {
            textNode = textNode.childNodes[range.startOffset - 1] || textNode.childNodes[0];
            if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
        } else { return; }
    }

    const fullText = textNode.textContent;
    const cursorPos = range.startOffset;
    const beforeCursor = fullText.substring(0, cursorPos);

    const numberedMatch = beforeCursor.match(/(\d+)\.\s$/);
    if (numberedMatch && e.key === ' ') {
        e.preventDefault();
        textNode.textContent = fullText.substring(numberedMatch[0].length);
        const newRange = document.createRange();
        newRange.setStart(textNode, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        setTimeout(() => formatText('orderedList'), 0);
        return;
    }

    const bulletMatch = beforeCursor.match(/\*\s$/);
    if (bulletMatch && e.key === ' ') {
        e.preventDefault();
        textNode.textContent = fullText.substring(bulletMatch[0].length);
        const newRange = document.createRange();
        newRange.setStart(textNode, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        setTimeout(() => formatText('unorderedList'), 0);
        return;
    }
}

// Search
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
    if (!searchText) { clearSearchHighlights(); return; }
    clearSearchHighlights();

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) textNodes.push(node);

    const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    currentMatches = [];

    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const matches = [...text.matchAll(regex)];
        if (matches.length > 0) {
            let lastIndex = 0;
            const fragment = document.createDocumentFragment();
            matches.forEach(match => {
                if (match.index > lastIndex) fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                const mark = document.createElement('mark');
                mark.textContent = match[0];
                fragment.appendChild(mark);
                currentMatches.push(mark);
                lastIndex = match.index + match[0].length;
            });
            if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            textNode.parentNode.replaceChild(fragment, textNode);
        }
    });

    if (currentMatches.length > 0) { currentMatchIndex = 0; highlightCurrentMatch(); }
}

function highlightCurrentMatch() {
    currentMatches.forEach((mark, index) => mark.classList.toggle('current-match', index === currentMatchIndex));
    if (currentMatches[currentMatchIndex]) {
        currentMatches[currentMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function nextMatch() {
    if (currentMatches.length > 0) {
        currentMatchIndex = (currentMatchIndex + 1) % currentMatches.length;
        highlightCurrentMatch();
    }
}

// Quick Find
function toggleQuickFind() {
    const overlay = document.getElementById('quickFindOverlay');
    if (overlay.classList.contains('show')) hideQuickFind();
    else showQuickFind();
}

function showQuickFind() {
    const overlay = document.getElementById('quickFindOverlay');
    const input = document.getElementById('quickFindInput');
    const findButton = document.getElementById('quickFindBtn');
    const icon = findButton.querySelector('i[data-lucide]');

    findButton.style.position = 'relative';
    findButton.appendChild(overlay);

    icon.setAttribute('data-lucide', 'x');
    lucide.createIcons();
    findButton.classList.add('find-open');

    overlay.classList.add('show');
    input.focus();
    input.select();

    setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
}

function hideQuickFind() {
    const overlay = document.getElementById('quickFindOverlay');
    const findButton = document.getElementById('quickFindBtn');
    const icon = findButton.querySelector('i[data-lucide]');

    overlay.classList.remove('show');

    icon.setAttribute('data-lucide', 'search');
    lucide.createIcons();
    findButton.classList.remove('find-open');
    findButton.style.position = '';

    document.body.appendChild(overlay);
    document.removeEventListener('click', handleClickOutside);
    clearSearchHighlights();
}

function handleClickOutside(e) {
    const overlay = document.getElementById('quickFindOverlay');
    const findButton = document.getElementById('quickFindBtn');
    if (!overlay.contains(e.target) && !findButton.contains(e.target)) hideQuickFind();
}

// Download
function showDownloadOptions(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }

    const dropdown = document.getElementById('downloadDropdown');
    const downloadBtn = document.getElementById('downloadBtn');
    const buttonRect = downloadBtn.getBoundingClientRect();

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
    document.getElementById('downloadDropdown').classList.remove('show');
    if (!currentTabId || !tabs[currentTabId]) return;

    const tab = tabs[currentTabId];
    const filename = `space-${tab.name.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}`;

    if (format === 'pdf') downloadAsPDF(filename);
    else if (format === 'txt') downloadAsText(filename);
    else if (format === 'md') downloadAsMarkdown(filename);
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
    const blob = new Blob([stripHTML(editor.innerHTML)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.txt`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

function downloadAsMarkdown(filename) {
    const blob = new Blob([htmlToMarkdown(editor.innerHTML)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.md`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

// Export / Import
async function setupBackupDirectory() {
    if (!('showDirectoryPicker' in window)) { showToast('File System Access API not supported'); return false; }
    try {
        const dirHandle = await window.showDirectoryPicker();
        sbacesBackupDirectory = dirHandle;
        localStorage.setItem('backupDirectoryName', dirHandle.name);
        showToast(`Backup directory set to: ${dirHandle.name}`);
        return true;
    } catch (error) {
        if (error.name !== 'AbortError') console.error('Error setting up backup directory:', error);
        return false;
    }
}

async function exportAllData() {
    const exportData = {
        tabs,
        trash: JSON.parse(localStorage.getItem('trash') || '[]'),
        activeTabId: currentTabId,
        sidebarCollapsed,
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
        if (setupSuccess) return exportAllData();
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
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