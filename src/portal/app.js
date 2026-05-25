const API_BASE_URL = 'http://localhost:3000';

// DOM Elements
const loginPage = document.getElementById('login-page');
const mainPage = document.getElementById('main-page');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const userDisplay = document.getElementById('user-display');
const logoutBtn = document.getElementById('logout-btn');
const refreshBtn = document.getElementById('refresh-btn');
const issuesTbody = document.getElementById('issues-tbody');
const noIssuesDiv = document.getElementById('no-issues');
const loadingDiv = document.getElementById('loading');

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const issuesTab = document.getElementById('issues-tab');
const signaturesTab = document.getElementById('signatures-tab');
const signaturesTabBtn = document.getElementById('signatures-tab-btn');
const diagnosticsTab = document.getElementById('diagnostics-tab');
const diagnosticsTabBtn = document.getElementById('diagnostics-tab-btn');

// Signatures
const refreshSignaturesBtn = document.getElementById('refresh-signatures-btn');
const signaturesTbody = document.getElementById('signatures-tbody');
const noSignaturesDiv = document.getElementById('no-signatures');
const addSignatureForm = document.getElementById('add-signature-form');
const resolutionSelect = document.getElementById('sig-resolution');
const kbUploadGroup = document.getElementById('kb-upload-group');
const kbFileInput = document.getElementById('sig-kb-file');
const kbPreview = document.getElementById('kb-preview');

// Edit Modal
const editModal = document.getElementById('edit-modal');
const editSignatureForm = document.getElementById('edit-signature-form');
const editResolutionSelect = document.getElementById('edit-sig-resolution');
const editKbUploadGroup = document.getElementById('edit-kb-upload-group');
const editKbFileInput = document.getElementById('edit-sig-kb-file');
const editKbPreview = document.getElementById('edit-kb-preview');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');

// KB Viewer Modal
const kbModal = document.getElementById('kb-modal');
const kbModalClose = document.getElementById('kb-modal-close');
const kbArticleContent = document.getElementById('kb-article-content');

// Issue Details Modal
const issueModal = document.getElementById('issue-modal');
const issueModalClose = document.getElementById('issue-modal-close');
const issueDetailsContent = document.getElementById('issue-details-content');

// Add Signature Modal
const addSignatureModal = document.getElementById('add-signature-modal');
const addSignatureBtn = document.getElementById('add-signature-btn');
const addSigModalClose = document.getElementById('add-sig-modal-close');
const addSigCancel = document.getElementById('add-sig-cancel');

// State
let currentUser = null;
let kbFileContent = null;
let editKbFileContent = null;
let signaturesCache = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = sessionStorage.getItem('user');
    if (savedUser) {
        currentUser = savedUser;
        showMainPage();
    }

    // Resolution type change handler
    resolutionSelect.addEventListener('change', handleResolutionChange);
    handleResolutionChange();

    // KB file upload handler
    kbFileInput.addEventListener('change', handleKbFileUpload);

    // Edit modal handlers
    editResolutionSelect.addEventListener('change', handleEditResolutionChange);
    editKbFileInput.addEventListener('change', handleEditKbFileUpload);
    modalClose.addEventListener('click', closeEditModal);
    modalCancel.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
    });

    // KB viewer modal handlers
    kbModalClose.addEventListener('click', closeKbModal);
    kbModal.addEventListener('click', (e) => {
        if (e.target === kbModal) closeKbModal();
    });

    // Issue details modal handlers
    issueModalClose.addEventListener('click', closeIssueModal);
    issueModal.addEventListener('click', (e) => {
        if (e.target === issueModal) closeIssueModal();
    });

    // Add signature modal handlers
    addSignatureBtn.addEventListener('click', openAddSignatureModal);
    addSigModalClose.addEventListener('click', closeAddSignatureModal);
    addSigCancel.addEventListener('click', closeAddSignatureModal);
    addSignatureModal.addEventListener('click', (e) => {
        if (e.target === addSignatureModal) closeAddSignatureModal();
    });

    // Diagnostic config handlers
    initDiagnosticsTab();
});

// Open Add Signature Modal
function openAddSignatureModal() {
    addSignatureForm.reset();
    kbFileContent = null;
    kbPreview.classList.add('hidden');
    handleResolutionChange();
    addSignatureModal.classList.remove('hidden');
}

// Close Add Signature Modal
function closeAddSignatureModal() {
    addSignatureModal.classList.add('hidden');
    addSignatureForm.reset();
    kbFileContent = null;
}

// Handle resolution type change
function handleResolutionChange() {
    const resolution = resolutionSelect.value;

    if (resolution === 'kb_article') {
        kbUploadGroup.classList.remove('hidden');
    } else {
        kbUploadGroup.classList.add('hidden');
    }
    kbFileContent = null;
    kbPreview.classList.add('hidden');
    kbFileInput.value = '';
}

// Handle edit resolution type change
function handleEditResolutionChange() {
    const resolution = editResolutionSelect.value;

    if (resolution === 'kb_article') {
        editKbUploadGroup.classList.remove('hidden');
    } else {
        editKbUploadGroup.classList.add('hidden');
        editKbFileContent = null;
        editKbPreview.classList.add('hidden');
        editKbFileInput.value = '';
    }
}

// Handle KB file upload
function handleKbFileUpload(e) {
    const file = e.target.files[0];
    if (!file) {
        kbFileContent = null;
        kbPreview.classList.add('hidden');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        kbFileContent = event.target.result;
        kbPreview.innerHTML = `<span class="filename">${file.name}</span> (${formatFileSize(file.size)})`;
        kbPreview.classList.remove('hidden');
    };
    reader.readAsText(file);
}

// Handle edit KB file upload
function handleEditKbFileUpload(e) {
    const file = e.target.files[0];
    if (!file) {
        editKbFileContent = null;
        editKbPreview.classList.add('hidden');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        editKbFileContent = event.target.result;
        editKbPreview.innerHTML = `<span class="filename">${file.name}</span> (${formatFileSize(file.size)})`;
        editKbPreview.classList.remove('hidden');
    };
    reader.readAsText(file);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (username) {
        currentUser = username;
        sessionStorage.setItem('user', username);
        showMainPage();
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('user');
    showLoginPage();
});

// Refresh Issues
refreshBtn.addEventListener('click', () => {
    loadIssues();
});

// Add Issue Modal
const addIssueBtn = document.getElementById('add-issue-btn');
const addIssueModal = document.getElementById('add-issue-modal');
const addIssueForm = document.getElementById('add-issue-form');
const addIssueModalClose = document.getElementById('add-issue-modal-close');
const addIssueCancel = document.getElementById('add-issue-cancel');

addIssueBtn.addEventListener('click', () => {
    addIssueForm.reset();
    addIssueModal.classList.remove('hidden');
});

addIssueModalClose.addEventListener('click', () => {
    addIssueModal.classList.add('hidden');
});

addIssueCancel.addEventListener('click', () => {
    addIssueModal.classList.add('hidden');
});

addIssueModal.addEventListener('click', (e) => {
    if (e.target === addIssueModal) {
        addIssueModal.classList.add('hidden');
    }
});

addIssueForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.getElementById('issue-type').value;
    const content = document.getElementById('issue-log-content').value.trim();
    const appVersion = document.getElementById('issue-app-version').value.trim() || '1.0.0';
    const osVersion = document.getElementById('issue-os-version').value.trim() || 'macOS 14.0';

    if (!content) {
        alert('Please enter log content');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type,
                content,
                appVersion,
                osVersion,
                tenantId: 'portal-user',
                machineId: 'portal-manual-entry'
            })
        });

        if (response.ok) {
            addIssueModal.classList.add('hidden');
            addIssueForm.reset();
            loadIssues();
        } else {
            const data = await response.json();
            alert(`Error: ${data.error || 'Failed to add issue'}`);
        }
    } catch (error) {
        console.error('Failed to add issue:', error);
        alert('Failed to add issue. Make sure the server is running.');
    }
});

// Refresh Signatures
refreshSignaturesBtn.addEventListener('click', () => {
    loadSignatures();
});

// Resolve Matching Issues
const resolveMatchingBtn = document.getElementById('resolve-matching-btn');
resolveMatchingBtn.addEventListener('click', async () => {
    resolveMatchingBtn.disabled = true;
    resolveMatchingBtn.textContent = 'Processing...';

    try {
        const response = await fetch(`${API_BASE_URL}/issues/resolve-matching`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        if (response.ok) {
            alert(`${data.message}\n\nChecked ${data.totalOpenIssues} open issue(s) against ${data.resolvedSignaturesCount} resolved signature(s).`);
            loadIssues();
        } else {
            alert(`Error: ${data.error || 'Failed to resolve issues'}`);
        }
    } catch (error) {
        console.error('Failed to resolve matching issues:', error);
        alert('Failed to resolve matching issues. Make sure the server is running.');
    } finally {
        resolveMatchingBtn.disabled = false;
        resolveMatchingBtn.textContent = 'Resolve Matching Issues';
    }
});

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        switchTab(tabName);
    });
});

// Add Signature Form
addSignatureForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.getElementById('sig-type').value;
    const signature = document.getElementById('sig-text').value.trim();
    const description = document.getElementById('sig-description').value.trim();
    const resolutionType = resolutionSelect.value;

    if (!type || !signature) {
        alert('Please fill in signature type and text');
        return;
    }

    let resolution = null;

    if (resolutionType) {
        resolution = { type: resolutionType };

        if (resolutionType === 'kb_article') {
            if (!kbFileContent) {
                alert('Please upload a KB article HTML file');
                return;
            }
            resolution.content = kbFileContent;
            resolution.filename = kbFileInput.files[0]?.name || 'kb_article.html';
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/signatures`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, signature, description, resolution })
        });

        if (response.ok) {
            closeAddSignatureModal();
            loadSignatures();
        } else {
            const data = await response.json();
            alert(`Error: ${data.error || 'Failed to add signature'}`);
        }
    } catch (error) {
        console.error('Failed to add signature:', error);
        alert('Failed to add signature. Make sure the server is running.');
    }
});

// Edit Signature Form
editSignatureForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const signatureId = document.getElementById('edit-sig-id').value;
    const originalType = document.getElementById('edit-sig-original-type').value;
    const type = document.getElementById('edit-sig-type').value;
    const signature = document.getElementById('edit-sig-text').value.trim();
    const description = document.getElementById('edit-sig-description').value.trim();
    const resolutionType = editResolutionSelect.value;

    if (!signature) {
        alert('Please fill in signature text');
        return;
    }

    let resolution = null;

    if (resolutionType) {
        resolution = { type: resolutionType };

        if (resolutionType === 'kb_article') {
            if (editKbFileContent) {
                resolution.content = editKbFileContent;
                resolution.filename = editKbFileInput.files[0]?.name || 'kb_article.html';
            }
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/signatures/${signatureId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ originalType, type, signature, description, resolution })
        });

        if (response.ok) {
            closeEditModal();
            loadSignatures();
        } else {
            const data = await response.json();
            alert(`Error: ${data.error || 'Failed to update signature'}`);
        }
    } catch (error) {
        console.error('Failed to update signature:', error);
        alert('Failed to update signature. Make sure the server is running.');
    }
});

// Open Edit Modal
function openEditModal(sig) {
    document.getElementById('edit-sig-id').value = sig.signature_id;
    document.getElementById('edit-sig-original-type').value = sig.type;
    document.getElementById('edit-sig-type').value = sig.type;
    document.getElementById('edit-sig-text').value = sig.signature;
    document.getElementById('edit-sig-description').value = sig.description || '';
    editResolutionSelect.value = sig.resolution_type || '';

    editKbFileContent = null;
    editKbFileInput.value = '';
    editKbPreview.classList.add('hidden');

    handleEditResolutionChange();
    editModal.classList.remove('hidden');
}

// Close Edit Modal
function closeEditModal() {
    editModal.classList.add('hidden');
    editSignatureForm.reset();
    editKbFileContent = null;
}

// Switch Tab
function switchTab(tabName) {
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    issuesTab.classList.toggle('hidden', tabName !== 'issues');
    signaturesTab.classList.toggle('hidden', tabName !== 'signatures');
    diagnosticsTab.classList.toggle('hidden', tabName !== 'diagnostics');

    if (tabName === 'signatures') {
        loadSignatures();
    } else if (tabName === 'diagnostics') {
        loadConfigs();
    }
}

// Show Login Page
function showLoginPage() {
    loginPage.classList.remove('hidden');
    mainPage.classList.add('hidden');
    loginForm.reset();
}

// Show Main Page
function showMainPage() {
    loginPage.classList.add('hidden');
    mainPage.classList.remove('hidden');
    userDisplay.textContent = `Welcome, ${currentUser}`;

    // Show signatures tab only for support/engineer users
    // Show diagnostics tab for all users
    const isSupportOrEngineer = ['support', 'engineer'].includes(currentUser.toLowerCase());
    const tenantBanner = document.querySelector('.tenant-banner');

    if (isSupportOrEngineer) {
        signaturesTabBtn.classList.remove('hidden');
        tenantBanner.classList.add('hidden');
    } else {
        signaturesTabBtn.classList.add('hidden');
        tenantBanner.classList.remove('hidden');
    }

    // Diagnostics tab visible for all users
    diagnosticsTabBtn.classList.remove('hidden');

    loadIssues();
}

// Load Issues
async function loadIssues() {
    issuesTbody.innerHTML = '';
    noIssuesDiv.classList.add('hidden');
    loadingDiv.classList.remove('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/issues`);
        const data = await response.json();

        loadingDiv.classList.add('hidden');

        // Update dashboard
        if (data.stats) {
            updateIssuesDashboard(data.stats, data.osBreakdown, data.timeline);
        }

        if (data.issues && data.issues.length > 0) {
            renderIssues(data.issues);
        } else {
            noIssuesDiv.classList.remove('hidden');
        }
    } catch (error) {
        loadingDiv.classList.add('hidden');
        console.error('Failed to load issues:', error);
        issuesTbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #ef4444;">
                    Failed to load issues. Make sure the server is running.
                </td>
            </tr>
        `;
    }
}

// Update Issues Dashboard
function updateIssuesDashboard(stats, osBreakdown, timeline) {
    // Update status stats
    document.getElementById('issues-total').textContent = stats.total || 0;
    document.getElementById('issues-open').textContent = stats.open_count || 0;
    document.getElementById('issues-resolved').textContent = stats.resolved_count || 0;
    document.getElementById('issues-closed').textContent = stats.closed_count || 0;

    // Update OS breakdown
    const osContainer = document.getElementById('os-breakdown');
    if (osBreakdown && osBreakdown.length > 0) {
        osContainer.innerHTML = osBreakdown.map(os => `
            <div class="os-item">
                <span class="os-icon">${getOsIcon(os.os_type)}</span>
                <span class="os-name">${os.os_type}</span>
                <span class="os-count">${os.count}</span>
            </div>
        `).join('');
    } else {
        osContainer.innerHTML = '<p class="no-data">No data</p>';
    }

    // Update timeline
    const timelineContainer = document.getElementById('timeline-chart');
    if (timeline && timeline.length > 0) {
        const maxCount = Math.max(...timeline.map(t => t.count), 1);
        timelineContainer.innerHTML = `
            <div class="timeline-bars">
                ${timeline.map(t => `
                    <div class="timeline-bar-container">
                        <div class="timeline-bar" style="height: ${(t.count / maxCount) * 100}%">
                            <span class="timeline-count">${t.count}</span>
                        </div>
                        <span class="timeline-date">${formatShortDate(t.date)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        timelineContainer.innerHTML = '<p class="no-data">No data for the last 7 days</p>';
    }
}

// Get OS icon
function getOsIcon(osType) {
    const icons = {
        'macOS': '🍎',
        'Windows': '🪟',
        'Linux': '🐧',
        'Other': '💻'
    };
    return icons[osType] || '💻';
}

// Format short date
function formatShortDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Parse OS from version string
function parseOsType(osVersion) {
    if (!osVersion) return 'Unknown';
    if (osVersion.includes('Mac') || osVersion.includes('Darwin')) return 'macOS';
    if (osVersion.includes('Windows')) return 'Windows';
    if (osVersion.includes('Linux')) return 'Linux';
    // macOS returns "Version X.Y (Build ABC)" format
    if (osVersion.startsWith('Version ') && osVersion.includes('Build')) return 'macOS';
    return 'Other';
}

// Truncate text
function truncateText(text, maxLength) {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Issues cache for details lookup
let issuesCache = [];

// Render Issues
function renderIssues(issues) {
    issuesCache = issues;
    // Enterprise admin = any user that's not support/engineer (tenant users)
    const isSupportOrEngineer = currentUser && ['support', 'engineer'].includes(currentUser.toLowerCase());
    const isEnterpriseAdmin = currentUser && !isSupportOrEngineer;

    issuesTbody.innerHTML = issues.map((issue, index) => {
        // Show notification bell for enterprise admin when issue is resolved but not yet viewed
        // Use == instead of === for admin_viewed to handle both numeric 0 and string '0' from JSON
        const showNotificationBell = isEnterpriseAdmin &&
            issue.status === 'resolved' &&
            issue.admin_viewed == 0;
        const notificationIcon = showNotificationBell
            ? `<span class="issue-notification-bell" onclick="viewIssueDetails('${issue.issue_id}')" title="New resolution available - click to view">🔔</span>`
            : '';

        return `
        <tr class="${showNotificationBell ? 'has-new-resolution' : ''}">
            <td><code>${issue.issue_id}</code> ${notificationIcon}</td>
            <td><span class="type-badge type-${issue.type}">${issue.type}</span></td>
            <td><span class="status-badge status-${issue.status}">${issue.status}</span></td>
            <td>${issue.occurrence_count}</td>
            <td><button class="btn-details" onclick="viewIssueDetails('${issue.issue_id}')">Details</button></td>
        </tr>
    `}).join('');
}

// Load Signatures
async function loadSignatures() {
    signaturesTbody.innerHTML = '';
    noSignaturesDiv.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/signatures`);
        const data = await response.json();

        if (data.signatures && data.signatures.length > 0) {
            signaturesCache = data.signatures;
            renderSignatures(data.signatures);
            updateSignatureStats(data.signatures);
        } else {
            signaturesCache = [];
            noSignaturesDiv.classList.remove('hidden');
            updateSignatureStats([]);
        }
    } catch (error) {
        console.error('Failed to load signatures:', error);
        signaturesTbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #ef4444;">
                    Failed to load signatures. Make sure the server is running.
                </td>
            </tr>
        `;
        updateSignatureStats([]);
    }
}

// Update signature stats
function updateSignatureStats(signatures) {
    const crashCount = signatures.filter(s => s.type === 'crash').length;
    const hangCount = signatures.filter(s => s.type === 'hang').length;
    const generalCount = signatures.filter(s => s.type === 'general').length;
    const totalCount = signatures.length;

    document.getElementById('stat-crash').textContent = crashCount;
    document.getElementById('stat-hang').textContent = hangCount;
    document.getElementById('stat-general').textContent = generalCount;
    document.getElementById('stat-total').textContent = totalCount;
}

// Render Signatures
function renderSignatures(signatures) {
    signaturesTbody.innerHTML = signatures.map((sig, index) => {
        const resolution = sig.resolution_type || 'N/A';
        const resolutionLabel = formatResolutionType(resolution);

        let resolutionCell;
        if (resolution === 'kb_article' && sig.resolution_content) {
            resolutionCell = `<span class="resolution-badge resolution-${resolution} clickable" onclick="viewKbArticle(${index})">${resolutionLabel}</span>`;
        } else {
            resolutionCell = `<span class="resolution-badge resolution-${resolution}">${resolutionLabel}</span>`;
        }

        return `
            <tr>
                <td><code>${sig.signature_id.substring(0, 8)}...</code></td>
                <td><span class="type-badge type-${sig.type}">${sig.type}</span></td>
                <td>${escapeHtml(sig.description || '-')}</td>
                <td>${resolutionCell}</td>
                <td>${formatDate(sig.created_at)}</td>
                <td><button class="btn-edit" onclick="editSignature(${index})">Edit</button></td>
            </tr>
        `;
    }).join('');
}

// View KB Article (called from onclick)
function viewKbArticle(index) {
    const sig = signaturesCache[index];
    if (sig && sig.resolution_type === 'kb_article' && sig.resolution_content) {
        kbArticleContent.innerHTML = sig.resolution_content;
        kbModal.classList.remove('hidden');
    }
}

// Close KB Modal
function closeKbModal() {
    kbModal.classList.add('hidden');
    kbArticleContent.innerHTML = '';
}

// View Issue Details
async function viewIssueDetails(issueId) {
    issueDetailsContent.innerHTML = '<p>Loading...</p>';
    issueModal.classList.remove('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/issues/${issueId}`);
        const data = await response.json();

        if (data.issue) {
            renderIssueDetails(data.issue, data.logs || [], data.resolution, data.bug);
        } else {
            issueDetailsContent.innerHTML = '<p class="error">Issue not found</p>';
        }
    } catch (error) {
        console.error('Failed to load issue details:', error);
        issueDetailsContent.innerHTML = '<p class="error">Failed to load issue details</p>';
    }
}

// Render Issue Details
function renderIssueDetails(issue, logs, resolution, bug) {
    const logContent = logs.length > 0 ? logs[0] : null;
    const isSupportOrEngineer = currentUser && ['support', 'engineer'].includes(currentUser.toLowerCase());
    const isRequireMoreData = issue.status === 'require_more_data';

    let resolutionHtml = '';
    if (issue.status === 'resolved' && resolution) {
        const resolutionLabel = formatResolutionType(resolution.resolution_type);
        resolutionHtml = `
            <div class="detail-section">
                <h4>Resolution</h4>
                <div class="detail-row">
                    <span class="detail-label">Type</span>
                    <span class="detail-value"><span class="resolution-badge resolution-${resolution.resolution_type}">${resolutionLabel}</span></span>
                </div>
                ${resolution.description && isSupportOrEngineer ? `
                <div class="detail-row">
                    <span class="detail-label">Description</span>
                    <span class="detail-value">${escapeHtml(resolution.description)}</span>
                </div>
                ` : ''}
                ${resolution.resolution_type === 'kb_article' && resolution.resolution_content ? `
                <div class="detail-row">
                    <span class="detail-label">KB Article</span>
                    <span class="detail-value"><button class="btn-details" onclick="showResolutionKb()">View Article</button></span>
                </div>
                ` : ''}
            </div>
        `;
    }

    // Status edit section for support/engineer
    let statusEditHtml = '';
    if (isSupportOrEngineer && issue.status !== 'resolved' && issue.status !== 'closed') {
        statusEditHtml = `
            <div class="detail-row">
                <span class="detail-label">Update Status</span>
                <span class="detail-value">
                    <select id="issue-status-select" class="status-select">
                        <option value="open" ${issue.status === 'open' ? 'selected' : ''}>Open</option>
                        <option value="require_more_data" ${issue.status === 'require_more_data' ? 'selected' : ''}>Require More Data</option>
                    </select>
                    <button class="btn-small btn-primary" onclick="updateIssueStatus('${issue.issue_id}')">Update</button>
                </span>
            </div>
        `;
    }

    // Add more data section (visible when status is require_more_data)
    let addMoreDataHtml = '';
    if (isRequireMoreData) {
        addMoreDataHtml = `
            <div class="detail-section detail-section-full add-data-section">
                <h4>Add More Data</h4>
                <p class="section-hint">Support has requested additional information for this issue.</p>
                <textarea id="additional-log-content" class="additional-data-input" placeholder="Paste additional log content, configuration, or diagnostic data here..." rows="4"></textarea>
                <button class="btn-primary" onclick="submitAdditionalData('${issue.issue_id}')">Submit Additional Data</button>
            </div>
        `;
    }

    // Store bug for details modal
    window._currentBug = bug;

    issueDetailsContent.innerHTML = `
        <div class="issue-detail-grid">
            <div class="detail-section">
                <h4>Issue Information</h4>
                <div class="detail-row">
                    <span class="detail-label">Issue ID</span>
                    <span class="detail-value"><code>${issue.issue_id}</code></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Type</span>
                    <span class="detail-value"><span class="type-badge type-${issue.type}">${issue.type}</span></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value"><span class="status-badge status-${issue.status}">${formatStatus(issue.status)}</span></span>
                </div>
                ${statusEditHtml}
                <div class="detail-row">
                    <span class="detail-label">Occurrences</span>
                    <span class="detail-value">${issue.occurrence_count}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Created At</span>
                    <span class="detail-value">${formatDate(issue.created_at)}</span>
                </div>
                ${isSupportOrEngineer && bug ? `
                <div class="detail-row">
                    <span class="detail-label">Bug ID</span>
                    <span class="detail-value"><a href="#" class="bug-link" onclick="showBugDetails(); return false;"><code>${bug.bug_id}</code></a></span>
                </div>
                ` : ''}
            </div>

            ${resolutionHtml}

            ${addMoreDataHtml}

            ${logContent ? `
            <div class="detail-section">
                <h4>Environment</h4>
                <div class="detail-row">
                    <span class="detail-label">OS</span>
                    <span class="detail-value">${parseOsType(logContent.os_version)} (${logContent.os_version})</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">App Version</span>
                    <span class="detail-value">${logContent.app_version || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Machine ID</span>
                    <span class="detail-value">${logContent.machine_id || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Received At</span>
                    <span class="detail-value">${formatDate(logContent.received_at)}</span>
                </div>
                ${isSupportOrEngineer && logContent.trace_id ? `
                <div class="detail-row">
                    <span class="detail-label">Trace ID</span>
                    <span class="detail-value"><code class="trace-id">${escapeHtml(logContent.trace_id)}</code></span>
                </div>
                ` : ''}
            </div>

            <div class="detail-section detail-section-full">
                <h4>Log Content</h4>
                <pre class="log-content">${escapeHtml(logContent.content || 'No content')}</pre>
            </div>
            ` : '<p>No log data available</p>'}
        </div>
    `;

    // Store resolution content for KB viewer
    if (resolution && resolution.resolution_content) {
        window._currentResolutionKb = resolution.resolution_content;
    } else {
        window._currentResolutionKb = null;
    }
}

// Format status for display
function formatStatus(status) {
    const labels = {
        'open': 'Open',
        'resolved': 'Resolved',
        'closed': 'Closed',
        'require_more_data': 'Require More Data'
    };
    return labels[status] || status;
}

// Update issue status
async function updateIssueStatus(issueId) {
    const newStatus = document.getElementById('issue-status-select').value;

    try {
        const response = await fetch(`${API_BASE_URL}/issues/${issueId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            alert('Status updated successfully');
            viewIssueDetails(issueId);
            loadIssues();
        } else {
            const data = await response.json();
            alert(`Error: ${data.error || 'Failed to update status'}`);
        }
    } catch (error) {
        console.error('Failed to update status:', error);
        alert('Failed to update status. Make sure the server is running.');
    }
}

// Submit additional data for an issue
async function submitAdditionalData(issueId) {
    const additionalContent = document.getElementById('additional-log-content').value.trim();

    if (!additionalContent) {
        alert('Please enter additional data');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/issues/${issueId}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: additionalContent })
        });

        if (response.ok) {
            alert('Additional data submitted successfully');
            viewIssueDetails(issueId);
        } else {
            const data = await response.json();
            alert(`Error: ${data.error || 'Failed to submit data'}`);
        }
    } catch (error) {
        console.error('Failed to submit additional data:', error);
        alert('Failed to submit data. Make sure the server is running.');
    }
}

// Close Issue Modal
function closeIssueModal() {
    issueModal.classList.add('hidden');
    issueDetailsContent.innerHTML = '';
    window._currentResolutionKb = null;
    window._currentBug = null;
}

// Show Resolution KB Article
function showResolutionKb() {
    if (window._currentResolutionKb) {
        kbArticleContent.innerHTML = window._currentResolutionKb;
        kbModal.classList.remove('hidden');
    }
}

// Show Bug Details
function showBugDetails() {
    const bug = window._currentBug;
    if (!bug) return;

    const resolutionLabel = bug.resolution_type ? formatResolutionType(bug.resolution_type) : 'None';

    kbArticleContent.innerHTML = `
        <div class="bug-details">
            <h3>Bug Details</h3>
            <div class="detail-row">
                <span class="detail-label">Bug ID</span>
                <span class="detail-value"><code>${bug.bug_id}</code></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="detail-value"><span class="status-badge status-${bug.status}">${bug.status}</span></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Resolution</span>
                <span class="detail-value">${resolutionLabel}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Created At</span>
                <span class="detail-value">${formatDate(bug.created_at)}</span>
            </div>
        </div>
    `;
    kbModal.classList.remove('hidden');
}

// Edit Signature (called from onclick)
function editSignature(index) {
    const sig = signaturesCache[index];
    if (sig) {
        openEditModal(sig);
    }
}

// Format resolution type for display
function formatResolutionType(type) {
    const labels = {
        'kb_article': 'KB Article',
        'product_update': 'Update Product',
        'os_update': 'Update OS'
    };
    return labels[type] || type;
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Diagnostic Configuration =====

let commandCounter = 0;
let configsCache = [];
let editingConfigId = null;
let addCommandTarget = 'new-config'; // 'new-config' or 'config-modal'

// Pre-configured commands - fast and reliable for demo
const PRECONFIG_COMMANDS = {
    'system-info': {
        name: 'system_info',
        command: '/usr/bin/sw_vers',
        arguments: [],
        os: ['macos'],
        includeWithCrash: true,
        includeWithHang: true
    },
    'hostname': {
        name: 'hostname',
        command: '/bin/hostname',
        arguments: [],
        os: ['macos', 'windows'],
        includeWithCrash: true,
        includeWithHang: true
    },
    'uptime': {
        name: 'uptime',
        command: '/usr/bin/uptime',
        arguments: [],
        os: ['macos'],
        includeWithCrash: true,
        includeWithHang: true
    },
    'disk-space': {
        name: 'disk_space',
        command: '/bin/df',
        arguments: ['-h'],
        os: ['macos'],
        includeWithCrash: true,
        includeWithHang: true
    },
    'network-interfaces': {
        name: 'network_interfaces',
        command: '/sbin/ifconfig',
        arguments: [],
        os: ['macos'],
        includeWithCrash: true,
        includeWithHang: true
    }
};

function initDiagnosticsTab() {
    const diagnosticConfigForm = document.getElementById('diagnostic-config-form');
    const addCommandBtn = document.getElementById('add-command-btn');
    const previewConfigBtn = document.getElementById('preview-config-btn');

    // List view elements
    const newConfigBtn = document.getElementById('new-config-btn');
    const refreshConfigsBtn = document.getElementById('refresh-configs-btn');
    const newConfigSection = document.getElementById('new-config-section');

    // Config Modal elements
    const configModal = document.getElementById('config-modal');
    const configModalClose = document.getElementById('config-modal-close');
    const configModalCancel = document.getElementById('config-modal-cancel');
    const configModalForm = document.getElementById('config-modal-form');

    // New config button - toggle inline form
    newConfigBtn.addEventListener('click', () => {
        editingConfigId = null;
        resetConfigForm();
        newConfigSection.classList.toggle('hidden');
    });

    // Refresh configs button
    refreshConfigsBtn.addEventListener('click', loadConfigs);

    // Config Modal handlers
    configModalClose.addEventListener('click', closeConfigModal);
    configModalCancel.addEventListener('click', closeConfigModal);
    configModal.addEventListener('click', (e) => {
        if (e.target === configModal) closeConfigModal();
    });

    // Config modal frequency select handlers
    ['crash', 'hang', 'general'].forEach(type => {
        const select = document.getElementById(`config-modal-${type}-freq`);
        const intervalInput = document.getElementById(`config-modal-${type}-interval`);
        if (select && intervalInput) {
            select.addEventListener('change', () => {
                if (select.value === 'interval') {
                    intervalInput.classList.remove('hidden');
                } else {
                    intervalInput.classList.add('hidden');
                }
            });
        }
    });

    // Config modal form submit
    configModalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveConfigFromModal();
    });

    // Modal add custom command button
    const modalAddCommandBtn = document.getElementById('modal-add-command-btn');
    modalAddCommandBtn.addEventListener('click', () => {
        openAddCommandModalFor('config-modal');
    });

    // Add Command Modal elements
    const addCommandModal = document.getElementById('add-command-modal');
    const addCommandForm = document.getElementById('add-command-form');
    const addCmdModalClose = document.getElementById('add-cmd-modal-close');
    const addCmdCancel = document.getElementById('add-cmd-cancel');

    // Frequency select handlers
    ['crash', 'hang', 'general'].forEach(type => {
        const select = document.getElementById(`diag-${type}-freq`);
        const intervalInput = document.getElementById(`diag-${type}-interval`);

        select.addEventListener('change', () => {
            if (select.value === 'interval') {
                intervalInput.classList.remove('hidden');
            } else {
                intervalInput.classList.add('hidden');
            }
        });

        // Initialize visibility
        if (select.value === 'interval') {
            intervalInput.classList.remove('hidden');
        }
    });

    // Add command button - open modal for new config form
    addCommandBtn.addEventListener('click', () => {
        openAddCommandModalFor('new-config');
    });

    // Close modal handlers
    addCmdModalClose.addEventListener('click', () => {
        addCommandModal.classList.add('hidden');
    });
    addCmdCancel.addEventListener('click', () => {
        addCommandModal.classList.add('hidden');
    });
    addCommandModal.addEventListener('click', (e) => {
        if (e.target === addCommandModal) {
            addCommandModal.classList.add('hidden');
        }
    });

    // Add command form submit
    addCommandForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('cmd-name').value.trim();
        const command = document.getElementById('cmd-command').value.trim();
        const argumentsStr = document.getElementById('cmd-arguments').value.trim();
        const osMacos = document.getElementById('cmd-os-macos').checked;
        const osWindows = document.getElementById('cmd-os-windows').checked;
        const includeWithCrash = document.getElementById('cmd-include-crash').checked;
        const includeWithHang = document.getElementById('cmd-include-hang').checked;

        if (!name || !command) {
            alert('Please fill in command name and path');
            return;
        }

        if (!osMacos && !osWindows) {
            alert('Please select at least one target OS');
            return;
        }

        const os = [];
        if (osMacos) os.push('macos');
        if (osWindows) os.push('windows');

        const cmdData = {
            name,
            command,
            arguments: argumentsStr,
            os,
            includeWithCrash,
            includeWithHang
        };

        if (addCommandTarget === 'config-modal') {
            addCommandToModal(cmdData);
        } else {
            addCommandRow(cmdData);
        }

        addCommandModal.classList.add('hidden');
    });

    // Preview button
    previewConfigBtn.addEventListener('click', () => {
        const config = buildDiagnosticConfig();
        if (config) {
            const jsonPreview = document.getElementById('json-preview');
            const jsonPreviewSection = document.getElementById('json-preview-section');
            jsonPreview.textContent = JSON.stringify(config, null, 2);
            jsonPreviewSection.classList.remove('hidden');
        }
    });

    // Save to server button
    const saveConfigBtn = document.getElementById('save-config-btn');
    saveConfigBtn.addEventListener('click', async () => {
        const tenantId = document.getElementById('diag-tenant-id').value.trim();
        const config = buildDiagnosticConfig();

        if (!tenantId) {
            alert('Please enter a Tenant ID');
            return;
        }

        if (!config) {
            return;
        }

        saveConfigBtn.disabled = true;
        saveConfigBtn.textContent = 'Saving...';

        try {
            const response = await fetch(`${API_BASE_URL}/configs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId,
                    appName: config.appName,
                    productIdentifier: config.productIdentifier,
                    config
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Configuration saved for tenant: ${tenantId}`);
            } else {
                alert(`Error: ${data.error || 'Failed to save config'}`);
            }
        } catch (error) {
            console.error('Failed to save config:', error);
            alert('Failed to save config. Make sure the server is running.');
        } finally {
            saveConfigBtn.disabled = false;
            saveConfigBtn.textContent = 'Save to Server';
        }
    });

    // Form submit - download JSON
    diagnosticConfigForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const config = buildDiagnosticConfig();
        if (config) {
            downloadConfigAsJson(config);
        }
    });
}

function addCommandRow(data = {}) {
    const commandsList = document.getElementById('commands-list');
    const commandId = commandCounter++;

    const osArray = data.os || ['macos'];
    const osDisplay = osArray.join(', ');

    const row = document.createElement('div');
    row.className = 'command-row';
    row.id = `command-${commandId}`;
    row.innerHTML = `
        <div class="command-header">
            <span class="command-title">${escapeHtml(data.name || 'Command')}</span>
            <button type="button" class="btn-remove" onclick="removeCommand(${commandId})">×</button>
        </div>
        <div class="command-summary">
            <div class="command-detail"><strong>Path:</strong> ${escapeHtml(data.command || '')}</div>
            <div class="command-detail"><strong>Args:</strong> ${escapeHtml(data.arguments || 'none')}</div>
            <div class="command-detail"><strong>OS:</strong> ${escapeHtml(osDisplay)}</div>
            <div class="command-detail">
                <span class="cmd-tag ${data.includeWithCrash ? 'tag-active' : 'tag-inactive'}">Crash</span>
                <span class="cmd-tag ${data.includeWithHang ? 'tag-active' : 'tag-inactive'}">Hang</span>
            </div>
        </div>
        <input type="hidden" class="cmd-name" value="${escapeHtml(data.name || '')}">
        <input type="hidden" class="cmd-command" value="${escapeHtml(data.command || '')}">
        <input type="hidden" class="cmd-arguments" value="${escapeHtml(data.arguments || '')}">
        <input type="hidden" class="cmd-os" value="${escapeHtml(osArray.join(','))}">
        <input type="hidden" class="cmd-include-crash" value="${data.includeWithCrash !== false}">
        <input type="hidden" class="cmd-include-hang" value="${data.includeWithHang !== false}">
    `;

    commandsList.appendChild(row);
}

function removeCommand(commandId) {
    const row = document.getElementById(`command-${commandId}`);
    if (row) {
        row.remove();
    }
}

function buildDiagnosticConfig() {
    const appName = document.getElementById('diag-app-name').value.trim();
    const productId = document.getElementById('diag-product-id').value.trim();

    if (!appName || !productId) {
        alert('Please fill in App Name and Product Identifier');
        return null;
    }

    // Build monitoring interval (input is in minutes, convert to seconds for output)
    const monitoringInterval = {};
    ['crash', 'hang', 'general'].forEach(type => {
        const freqSelect = document.getElementById(`diag-${type}-freq`);
        const intervalInput = document.getElementById(`diag-${type}-interval`);

        if (freqSelect.value === 'immediately') {
            monitoringInterval[type] = { frequency: 'immediately' };
        } else {
            const minutes = parseFloat(intervalInput.value) || 5;
            const seconds = minutes * 60;
            monitoringInterval[type] = { frequency: 'interval', seconds };
        }
    });

    // Build commands list from pre-configured selections
    const commands = [];

    // Add selected pre-configured commands
    Object.keys(PRECONFIG_COMMANDS).forEach(key => {
        const checkbox = document.getElementById(`preconfig-${key}`);
        if (checkbox && checkbox.checked) {
            commands.push({ ...PRECONFIG_COMMANDS[key] });
        }
    });

    // Add custom commands
    const commandRows = document.querySelectorAll('.command-row');
    commandRows.forEach(row => {
        const name = row.querySelector('.cmd-name').value.trim();
        const command = row.querySelector('.cmd-command').value.trim();
        const argumentsStr = row.querySelector('.cmd-arguments').value.trim();
        const osStr = row.querySelector('.cmd-os').value.trim();
        const includeWithCrash = row.querySelector('.cmd-include-crash').value === 'true';
        const includeWithHang = row.querySelector('.cmd-include-hang').value === 'true';

        if (name && command) {
            const args = argumentsStr ? argumentsStr.split(',').map(a => a.trim()).filter(a => a) : [];
            const os = osStr ? osStr.split(',').map(o => o.trim()).filter(o => o) : ['macos'];
            commands.push({
                name,
                command,
                arguments: args,
                os,
                includeWithCrash,
                includeWithHang
            });
        }
    });

    return {
        appName,
        productIdentifier: productId,
        monitoringInterval,
        additionalCommands: commands
    };
}

function downloadConfigAsJson(config) {
    const jsonString = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.productIdentifier || 'diagnostic'}-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Current config being viewed/edited
let currentViewConfig = null;
let modalCommandCounter = 0;

// Close config modal
function closeConfigModal() {
    document.getElementById('config-modal').classList.add('hidden');
    currentViewConfig = null;
    modalCommandCounter = 0;
}

// Open add command modal for a specific target
function openAddCommandModalFor(target) {
    addCommandTarget = target;
    const addCommandForm = document.getElementById('add-command-form');
    addCommandForm.reset();
    document.getElementById('cmd-os-macos').checked = true;
    document.getElementById('cmd-include-crash').checked = true;
    document.getElementById('cmd-include-hang').checked = true;
    document.getElementById('add-command-modal').classList.remove('hidden');
}

// Add command to config modal
function addCommandToModal(data) {
    const commandsContainer = document.getElementById('config-modal-commands');
    const commandId = modalCommandCounter++;

    // Remove "no custom commands" message if present
    const noDataMsg = commandsContainer.querySelector('.no-data');
    if (noDataMsg) noDataMsg.remove();

    // Add to custom commands array
    if (!currentViewConfig._customCommands) {
        currentViewConfig._customCommands = [];
    }

    const args = data.arguments ? data.arguments.split(',').map(a => a.trim()).filter(a => a) : [];
    const cmdObj = {
        name: data.name,
        command: data.command,
        arguments: args,
        os: data.os,
        includeWithCrash: data.includeWithCrash,
        includeWithHang: data.includeWithHang
    };
    currentViewConfig._customCommands.push(cmdObj);

    // Add to UI
    const cmdDiv = document.createElement('div');
    cmdDiv.className = 'config-command-item';
    cmdDiv.id = `modal-cmd-${commandId}`;
    cmdDiv.innerHTML = `
        <strong>${escapeHtml(data.name)}</strong>
        <button type="button" class="btn-remove-cmd" onclick="removeModalCommand(${commandId}, '${escapeHtml(data.name)}')">&times;</button>
        <span class="config-command-os">${data.os.join(', ')}</span>
        <div class="config-command-path">${escapeHtml(data.command)} ${args.join(' ')}</div>
    `;
    commandsContainer.appendChild(cmdDiv);
}

// Remove command from config modal
function removeModalCommand(commandId, cmdName) {
    // Remove from UI
    const cmdDiv = document.getElementById(`modal-cmd-${commandId}`);
    if (cmdDiv) cmdDiv.remove();

    // Remove from custom commands array
    if (currentViewConfig && currentViewConfig._customCommands) {
        currentViewConfig._customCommands = currentViewConfig._customCommands.filter(c => c.name !== cmdName);
    }

    // Show "no custom commands" if empty
    const commandsContainer = document.getElementById('config-modal-commands');
    if (commandsContainer.children.length === 0) {
        commandsContainer.innerHTML = '<p class="no-data">No custom commands</p>';
    }
}

// Reset config form to defaults
function resetConfigForm() {
    document.getElementById('diagnostic-config-form').reset();
    document.getElementById('diag-tenant-id').value = '';
    document.getElementById('diag-app-name').value = '';
    document.getElementById('diag-product-id').value = '';
    document.getElementById('commands-list').innerHTML = '';
    document.getElementById('json-preview-section').classList.add('hidden');

    // Reset frequency selects
    ['crash', 'hang', 'general'].forEach(type => {
        const select = document.getElementById(`diag-${type}-freq`);
        const intervalInput = document.getElementById(`diag-${type}-interval`);
        if (type === 'general') {
            select.value = 'interval';
            intervalInput.value = '5';
            intervalInput.classList.remove('hidden');
        } else {
            select.value = 'immediately';
            intervalInput.classList.add('hidden');
        }
    });

    // Uncheck all preconfig checkboxes
    Object.keys(PRECONFIG_COMMANDS).forEach(key => {
        const checkbox = document.getElementById(`preconfig-${key}`);
        if (checkbox) checkbox.checked = false;
    });
}

// Load configs from server
async function loadConfigs() {
    const configsTbody = document.getElementById('configs-tbody');
    const noConfigsDiv = document.getElementById('no-configs');
    const newConfigBtn = document.getElementById('new-config-btn');
    const newConfigSection = document.getElementById('new-config-section');

    configsTbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    noConfigsDiv.classList.add('hidden');

    // Check if user is support/engineer
    const isSupportOrEngineer = currentUser && ['support', 'engineer'].includes(currentUser.toLowerCase());

    // Hide "New Config" button and form for tenant users
    if (isSupportOrEngineer) {
        newConfigBtn.classList.remove('hidden');
    } else {
        newConfigBtn.classList.add('hidden');
        newConfigSection.classList.add('hidden');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/configs`);
        const data = await response.json();

        let configs = data.configs || [];

        // Filter configs for tenant users - only show acme-corp
        if (!isSupportOrEngineer) {
            configs = configs.filter(c => c.tenant_id === 'acme-corp');
        }

        if (configs.length > 0) {
            configsCache = configs;
            renderConfigs(configs);
        } else {
            configsCache = [];
            configsTbody.innerHTML = '';
            noConfigsDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Failed to load configs:', error);
        configsTbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #ef4444;">
                    Failed to load configs. Make sure the server is running.
                </td>
            </tr>
        `;
    }
}

// Render configs table
function renderConfigs(configs) {
    const configsTbody = document.getElementById('configs-tbody');
    configsTbody.innerHTML = configs.map((config) => {
        const hasPendingNotification = config.notification_status === 'pending';
        const notificationDropdown = hasPendingNotification
            ? `<div class="config-bell-wrapper">
                <span class="config-notification-bell" onclick="toggleConfigBellDropdown('${config.config_id}')" title="Pending notification - click for options">🔔</span>
                <div class="config-bell-dropdown hidden" id="bell-dropdown-${config.config_id}">
                    <button onclick="viewConfig('${config.config_id}'); closeConfigBellDropdowns();">View</button>
                    <button onclick="pushConfigFromBell('${config.config_id}', '${config.tenant_id}')">Push</button>
                    <button onclick="acknowledgeConfigFromBell('${config.config_id}')">Acknowledge</button>
                </div>
               </div>`
            : '';
        return `
        <tr class="${hasPendingNotification ? 'has-pending-notification' : ''}">
            <td><code>${escapeHtml(config.tenant_id)}</code></td>
            <td>${escapeHtml(config.app_name)} ${notificationDropdown}</td>
            <td>v${config.version}</td>
            <td>${formatConfigStatus(config.notification_status)}</td>
            <td>${formatDate(config.updated_at)}</td>
            <td>
                <button class="btn-details" onclick="viewConfig('${config.config_id}')">View Details</button>
            </td>
        </tr>
    `}).join('');
}

// Toggle config bell dropdown
function toggleConfigBellDropdown(configId) {
    const dropdown = document.getElementById(`bell-dropdown-${configId}`);
    const wasHidden = dropdown.classList.contains('hidden');

    // Close all dropdowns first
    closeConfigBellDropdowns();

    // Toggle this one
    if (wasHidden) {
        dropdown.classList.remove('hidden');
    }
}

// Close all config bell dropdowns
function closeConfigBellDropdowns() {
    document.querySelectorAll('.config-bell-dropdown').forEach(d => d.classList.add('hidden'));
}

// Push config from bell dropdown
async function pushConfigFromBell(configId, tenantId) {
    closeConfigBellDropdowns();
    try {
        const response = await fetch(`${API_BASE_URL}/configs/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ configId, tenantId })
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Config pushed to ${data.clientCount} connected client(s)`);
            // Mark as deployed
            await fetch(`${API_BASE_URL}/configs/${configId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'deployed', updatedBy: currentUser })
            });
            loadConfigs();
        } else {
            alert(`Error: ${data.error || 'Failed to push config'}`);
        }
    } catch (error) {
        console.error('Failed to push config:', error);
        alert('Failed to push config. Make sure the server is running.');
    }
}

// Acknowledge config from bell dropdown
async function acknowledgeConfigFromBell(configId) {
    closeConfigBellDropdowns();
    try {
        const response = await fetch(`${API_BASE_URL}/configs/${configId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'acknowledged', updatedBy: currentUser })
        });

        if (response.ok) {
            loadConfigs();
        } else {
            const data = await response.json();
            alert(`Error: ${data.error || 'Failed to acknowledge'}`);
        }
    } catch (error) {
        console.error('Failed to acknowledge:', error);
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.config-bell-wrapper')) {
        closeConfigBellDropdowns();
    }
});

// Format config status badge
function formatConfigStatus(status) {
    if (!status) {
        return '<span class="config-status config-status-deployed">Deployed</span>';
    }
    const labels = {
        'pending': 'Pending',
        'acknowledged': 'Acknowledged',
        'deployed': 'Deployed',
        'dismissed': 'Dismissed'
    };
    const label = labels[status] || status;
    return `<span class="config-status config-status-${status}">${label}</span>`;
}

// View config in modal (editable)
async function viewConfig(configId) {
    const configModal = document.getElementById('config-modal');
    const configModalTitle = document.getElementById('config-modal-title');

    configModal.classList.remove('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/configs/by-id/${configId}`);
        const data = await response.json();

        if (data.config) {
            currentViewConfig = data.config;
            configModalTitle.textContent = `Configuration: ${data.config.tenant_id}`;
            populateConfigModal(data.config);
        } else {
            alert('Config not found');
            closeConfigModal();
        }
    } catch (error) {
        console.error('Failed to load config:', error);
        alert('Failed to load config. Make sure the server is running.');
        closeConfigModal();
    }
}

// Populate config modal with editable fields
function populateConfigModal(config) {
    document.getElementById('config-modal-id').value = config.config_id;
    document.getElementById('config-modal-tenant-id').value = config.tenant_id;
    document.getElementById('config-modal-app-name').value = config.app_name;
    document.getElementById('config-modal-product-id').value = config.product_identifier;
    document.getElementById('config-modal-version').value = `v${config.version}`;
    document.getElementById('config-modal-updated').value = formatDate(config.updated_at);

    // Set status dropdown
    const statusSelect = document.getElementById('config-modal-status');
    statusSelect.value = config.notification_status || 'deployed';

    // Check if user is support/engineer - if not, make form read-only
    const isSupportOrEngineer = currentUser && ['support', 'engineer'].includes(currentUser.toLowerCase());
    const saveBtn = document.querySelector('#config-modal-form button[type="submit"]');
    const addCmdBtn = document.getElementById('modal-add-command-btn');
    const formInputs = document.querySelectorAll('#config-modal-form input:not([readonly]), #config-modal-form select');
    const preconfigCheckboxes = document.querySelectorAll('#config-modal-form .preconfig-commands input[type="checkbox"]');

    if (isSupportOrEngineer) {
        saveBtn.classList.remove('hidden');
        addCmdBtn.classList.remove('hidden');
        formInputs.forEach(input => input.disabled = false);
        preconfigCheckboxes.forEach(cb => cb.disabled = false);
        statusSelect.disabled = false;
    } else {
        saveBtn.classList.add('hidden');
        addCmdBtn.classList.add('hidden');
        formInputs.forEach(input => input.disabled = true);
        preconfigCheckboxes.forEach(cb => cb.disabled = true);
        statusSelect.disabled = true;
    }

    let configJson;
    try {
        configJson = typeof config.config_json === 'string' ? JSON.parse(config.config_json) : config.config_json;
    } catch (e) {
        console.error('Failed to parse config_json:', e);
        return;
    }

    // Populate monitoring intervals
    if (configJson.monitoringInterval) {
        ['crash', 'hang', 'general'].forEach(type => {
            const interval = configJson.monitoringInterval[type];
            const select = document.getElementById(`config-modal-${type}-freq`);
            const intervalInput = document.getElementById(`config-modal-${type}-interval`);

            if (interval && select && intervalInput) {
                if (interval.frequency === 'immediately') {
                    select.value = 'immediately';
                    intervalInput.classList.add('hidden');
                } else {
                    select.value = 'interval';
                    intervalInput.classList.remove('hidden');
                    intervalInput.value = (interval.seconds || 300) / 60;
                }
            }
        });
    }

    // Reset all preconfig checkboxes first
    Object.keys(PRECONFIG_COMMANDS).forEach(key => {
        const checkbox = document.getElementById(`modal-preconfig-${key}`);
        if (checkbox) checkbox.checked = false;
    });

    // Populate commands - separate preconfig from custom
    const customCommands = [];
    if (configJson.additionalCommands) {
        configJson.additionalCommands.forEach(cmd => {
            // Check if it's a pre-configured command
            const preconfigKey = Object.keys(PRECONFIG_COMMANDS).find(
                key => PRECONFIG_COMMANDS[key].name === cmd.name
            );

            if (preconfigKey) {
                const checkbox = document.getElementById(`modal-preconfig-${preconfigKey}`);
                if (checkbox) checkbox.checked = true;
            } else {
                customCommands.push(cmd);
            }
        });
    }

    // Store custom commands for later
    currentViewConfig._customCommands = customCommands;

    // Reset modal command counter
    modalCommandCounter = 0;

    // Render custom commands list with remove buttons
    const commandsContainer = document.getElementById('config-modal-commands');
    if (customCommands.length > 0) {
        commandsContainer.innerHTML = customCommands.map((cmd, idx) => {
            const cmdId = modalCommandCounter++;
            return `
            <div class="config-command-item" id="modal-cmd-${cmdId}">
                <strong>${escapeHtml(cmd.name)}</strong>
                <button type="button" class="btn-remove-cmd" onclick="removeModalCommand(${cmdId}, '${escapeHtml(cmd.name)}')">&times;</button>
                <span class="config-command-os">${(cmd.os || ['macos']).join(', ')}</span>
                <div class="config-command-path">${escapeHtml(cmd.command)} ${(cmd.arguments || []).join(' ')}</div>
            </div>
        `;
        }).join('');
    } else {
        commandsContainer.innerHTML = '<p class="no-data">No custom commands</p>';
    }
}

// Save config from modal
async function saveConfigFromModal() {
    const configId = document.getElementById('config-modal-id').value;
    const tenantId = document.getElementById('config-modal-tenant-id').value;
    const appName = document.getElementById('config-modal-app-name').value.trim();
    const productId = document.getElementById('config-modal-product-id').value.trim();
    const status = document.getElementById('config-modal-status').value;

    if (!appName || !productId) {
        alert('Please fill in App Name and Product Identifier');
        return;
    }

    // Build monitoring interval
    const monitoringInterval = {};
    ['crash', 'hang', 'general'].forEach(type => {
        const select = document.getElementById(`config-modal-${type}-freq`);
        const intervalInput = document.getElementById(`config-modal-${type}-interval`);

        if (select.value === 'immediately') {
            monitoringInterval[type] = { frequency: 'immediately' };
        } else {
            const minutes = parseFloat(intervalInput.value) || 5;
            monitoringInterval[type] = { frequency: 'interval', seconds: minutes * 60 };
        }
    });

    // Build commands list from modal preconfig checkboxes
    const commands = [];

    // Add selected pre-configured commands
    Object.keys(PRECONFIG_COMMANDS).forEach(key => {
        const checkbox = document.getElementById(`modal-preconfig-${key}`);
        if (checkbox && checkbox.checked) {
            commands.push({ ...PRECONFIG_COMMANDS[key] });
        }
    });

    // Add custom commands that were preserved
    if (currentViewConfig && currentViewConfig._customCommands) {
        commands.push(...currentViewConfig._customCommands);
    }

    const config = {
        appName,
        productIdentifier: productId,
        monitoringInterval,
        additionalCommands: commands
    };

    try {
        // Save config
        const response = await fetch(`${API_BASE_URL}/configs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId, appName, productIdentifier: productId, config, changedBy: currentUser })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(`Error: ${data.error || 'Failed to save config'}`);
            return;
        }

        // Update status if changed
        const originalStatus = currentViewConfig?.notification_status || 'deployed';
        if (status !== originalStatus) {
            await fetch(`${API_BASE_URL}/configs/${configId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, updatedBy: currentUser })
            });
        }

        closeConfigModal();
        loadConfigs();
    } catch (error) {
        console.error('Failed to save config:', error);
        alert('Failed to save config. Make sure the server is running.');
    }
}

