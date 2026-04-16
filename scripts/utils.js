// Utility Functions

function stripHTML(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

function formatRelativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showUnsaved() {
    autoSaveIndicator.className = 'auto-save-indicator unsaved';
}

function showSaved() {
    autoSaveIndicator.className = 'auto-save-indicator saved';
    setTimeout(() => { autoSaveIndicator.className = 'auto-save-indicator'; }, 1000);
}

function debouncedSave() {
    showUnsaved();
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => { saveCurrentTab(); showSaved(); }, 300);
}

function updateWordCharCount() {
    if (currentTabId && tabs[currentTabId]) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
            const selectedText = selection.toString();
            const wordCount = selectedText.trim() ? selectedText.trim().split(/\s+/).length : 0;
            wordCharCount.textContent = `${wordCount} Words, ${selectedText.length} Characters (Selected)`;
        } else {
            const textContent = stripHTML(editor.innerHTML);
            const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
            wordCharCount.textContent = `${wordCount} Words, ${textContent.length} Characters`;
        }
    } else {
        wordCharCount.textContent = 'Words: 0 | Chars: 0';
    }
}

function updatePlaceholder() {
    const hasContent = editor.innerText.trim().length > 0;
    placeholder.style.display = hasContent ? 'none' : 'block';
}

function updateUrl(tabName = null) {
    if (tabName) {
        window.history.replaceState(null, null, `#${tabName.toLowerCase().replace(/\s+/g, '-')}`);
    } else {
        window.history.replaceState(null, null, '#home');
    }
}

function updateLastVisit() {
    localStorage.setItem('lastVisit', Date.now());
}

function htmlToMarkdown(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    let markdown = tempDiv.innerHTML;
    markdown = markdown.replace(/<(b|strong)>(.*?)<\/(b|strong)>/gi, '**$2**');
    markdown = markdown.replace(/<(i|em)>(.*?)<\/(i|em)>/gi, '*$2*');
    markdown = markdown.replace(/<u>(.*?)<\/u>/gi, '_$1_');
    markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
        let counter = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`);
    });
    markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    });
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    markdown = markdown.replace(/<br[^>]*>/gi, '\n');
    markdown = markdown.replace(/<[^>]*>/g, '');
    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
    return markdown;
}

function forceSpellCheck() {
    const editor = document.getElementById('editor');
    const original = editor.spellcheck;
    editor.spellcheck = false;
    editor.spellcheck = original;
    editor.offsetHeight;
}

function getListLevel(element) {
    let level = 0;
    let parent = element.parentNode;
    while (parent && parent !== editor) {
        if (parent.nodeName === 'OL' || parent.nodeName === 'UL') level++;
        parent = parent.parentNode;
    }
    return level;
}

function hideOptionsBar() {
    if (currentOptionsBar) {
        currentOptionsBar.classList.remove('show');
        currentOptionsBar = null;
    }
}

function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    function updateThemeIcon(theme) {
        themeIcon.setAttribute('data-lucide', theme === 'light' ? 'moon' : 'sun');
        lucide.createIcons();
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

async function getNextBackupVersion() {
    let version = parseInt(localStorage.getItem('backupVersion') || '0');
    if (sbacesBackupDirectory) {
        try {
            let foundExisting = true;
            while (foundExisting) {
                version++;
                try {
                    await sbacesBackupDirectory.getFileHandle(`sbaces-backup-${version}.json`);
                } catch {
                    foundExisting = false;
                }
            }
        } catch (error) {
            version++;
        }
    } else {
        version++;
    }
    localStorage.setItem('backupVersion', version.toString());
    return version;
}

function initializeBackupDirectory() {
    const savedDirectoryName = localStorage.getItem('backupDirectoryName');
    if (savedDirectoryName) {
        showToast(`Backup directory was set to: ${savedDirectoryName} (may need re-permission)`);
    }
}