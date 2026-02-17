/**
 * Antfarm Workflows - Multi-Agent Automation
 * Jeff Lee | Pedersen Toyota
 */

// ========================================
// Workflow Definitions
// ========================================

const WORKFLOWS = {
    'toyota-recommend': {
        id: 'toyota-recommend',
        name: 'Toyota Recommendations',
        description: 'Qualify customers and recommend new Toyota vehicles with VINs, payments, and comparisons',
        icon: '🚗',
        color: 'yellow',
        agents: ['Qualifier', 'Inventory', 'Sales', 'Verification'],
        steps: [
            { id: 'qualify', agent: 'Qualifier', description: 'Extract customer requirements' },
            { id: 'inventory', agent: 'Inventory', description: 'Check available inventory' },
            { id: 'recommend', agent: 'Sales', description: 'Generate recommendations' },
            { id: 'verify', agent: 'Verification', description: 'Verify accuracy' }
        ]
    },
    'used-vehicle-match': {
        id: 'used-vehicle-match',
        name: 'Used Vehicle Match',
        description: 'Match customers with pre-owned inventory using scoring algorithm and payment calculations',
        icon: '👥',
        color: 'green',
        agents: ['Qualifier', 'Scraper', 'Matcher', 'Calculator', 'Presenter', 'Verifier'],
        steps: [
            { id: 'qualify', agent: 'Qualifier', description: 'Structure customer requirements' },
            { id: 'scrape', agent: 'Scraper', description: 'Fetch current inventory' },
            { id: 'match', agent: 'Matcher', description: 'Score and rank vehicles' },
            { id: 'calculate', agent: 'Calculator', description: 'Calculate payments' },
            { id: 'present', agent: 'Presenter', description: 'Create presentation' },
            { id: 'verify', agent: 'Verifier', description: 'Validate all data' }
        ]
    },
    'vehicle-compare': {
        id: 'vehicle-compare',
        name: 'Vehicle Comparison',
        description: 'Generate competitive analysis with specs, talking points, and conquest scripts',
        icon: '📊',
        color: 'purple',
        agents: ['Collector', 'Standardizer', 'Analyst', 'Recommender', 'Verifier'],
        steps: [
            { id: 'collect', agent: 'Collector', description: 'Gather vehicle specs' },
            { id: 'standardize', agent: 'Standardizer', description: 'Normalize data' },
            { id: 'analyze', agent: 'Analyst', description: 'Competitive analysis' },
            { id: 'recommend', agent: 'Recommender', description: 'Generate talking points' },
            { id: 'verify', agent: 'Verifier', description: 'Verify accuracy' }
        ]
    }
};

// ========================================
// State
// ========================================

const STORAGE_KEY = 'antfarm_workflows';

let state = {
    selectedWorkflow: null,
    runningWorkflow: null,
    currentStep: 0,
    runs: []
};

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    renderRecentRuns();
});

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            state = { ...state, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Error loading state:', e);
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            runs: state.runs
        }));
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

// ========================================
// Workflow Selection
// ========================================

function selectWorkflow(workflowId) {
    // Deselect all
    document.querySelectorAll('.workflow-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select this one
    const card = document.querySelector(`[data-workflow="${workflowId}"]`);
    if (card) {
        card.classList.add('selected');
    }
    
    state.selectedWorkflow = workflowId;
    
    // Show run panel
    const workflow = WORKFLOWS[workflowId];
    document.getElementById('selectedWorkflowName').textContent = workflow.name;
    document.getElementById('runPanel').style.display = 'block';
    document.getElementById('workflowInput').focus();
    
    // Hide progress panel if showing
    document.getElementById('progressPanel').style.display = 'none';
}

function cancelWorkflow() {
    state.selectedWorkflow = null;
    
    document.querySelectorAll('.workflow-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    document.getElementById('runPanel').style.display = 'none';
    document.getElementById('workflowInput').value = '';
}

// ========================================
// Workflow Execution
// ========================================

async function startWorkflow() {
    const input = document.getElementById('workflowInput').value.trim();
    
    if (!input) {
        showToast('Please enter a task or customer inquiry');
        return;
    }
    
    if (!state.selectedWorkflow) {
        showToast('Please select a workflow first');
        return;
    }
    
    const workflow = WORKFLOWS[state.selectedWorkflow];
    
    // Create run record
    const run = {
        id: generateId(),
        workflowId: state.selectedWorkflow,
        workflowName: workflow.name,
        task: input,
        status: 'running',
        startedAt: new Date().toISOString(),
        completedAt: null,
        currentStep: 0,
        output: '',
        result: null
    };
    
    state.runs.unshift(run);
    state.runningWorkflow = run.id;
    saveState();
    
    // Update UI
    document.getElementById('runPanel').style.display = 'none';
    document.getElementById('progressPanel').style.display = 'block';
    document.getElementById('runningWorkflowName').textContent = workflow.name;
    
    // Render steps
    renderProgressSteps(workflow, 0);
    
    // Clear output
    document.getElementById('outputText').textContent = `Starting ${workflow.name}...\n\nTask: ${input}\n\n`;
    
    // Simulate workflow execution
    await executeWorkflow(workflow, input, run);
}

async function executeWorkflow(workflow, input, run) {
    const outputEl = document.getElementById('outputText');
    let fullOutput = outputEl.textContent;
    
    for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        
        // Update step UI
        renderProgressSteps(workflow, i);
        run.currentStep = i;
        
        // Log step start
        fullOutput += `\n[${step.agent}] ${step.description}...\n`;
        outputEl.textContent = fullOutput;
        outputEl.scrollTop = outputEl.scrollHeight;
        
        // Simulate processing time (in real implementation, this would call the agent)
        await sleep(1500 + Math.random() * 1000);
        
        // Simulate step completion
        fullOutput += `  ✓ ${step.agent} completed\n`;
        outputEl.textContent = fullOutput;
        outputEl.scrollTop = outputEl.scrollHeight;
        
        // Check if stopped
        if (!state.runningWorkflow) {
            fullOutput += `\n⏹ Workflow stopped by user\n`;
            outputEl.textContent = fullOutput;
            run.status = 'stopped';
            run.completedAt = new Date().toISOString();
            saveState();
            renderRecentRuns();
            return;
        }
    }
    
    // Generate mock result based on workflow type
    const result = generateMockResult(workflow, input);
    
    fullOutput += `\n${'═'.repeat(50)}\n`;
    fullOutput += `✅ Workflow completed successfully!\n`;
    fullOutput += `${'═'.repeat(50)}\n\n`;
    fullOutput += result;
    
    outputEl.textContent = fullOutput;
    outputEl.scrollTop = outputEl.scrollHeight;
    
    // Update run record
    run.status = 'success';
    run.completedAt = new Date().toISOString();
    run.output = fullOutput;
    run.result = result;
    state.runningWorkflow = null;
    saveState();
    
    // Update UI
    renderProgressSteps(workflow, workflow.steps.length);
    renderRecentRuns();
    
    showToast('Workflow completed!');
}

function stopWorkflow() {
    state.runningWorkflow = null;
    showToast('Stopping workflow...');
}

function renderProgressSteps(workflow, currentIndex) {
    const container = document.getElementById('progressSteps');
    
    container.innerHTML = workflow.steps.map((step, i) => {
        let status = 'pending';
        let icon = '○';
        
        if (i < currentIndex) {
            status = 'completed';
            icon = '✓';
        } else if (i === currentIndex) {
            status = 'active';
            icon = '◉';
        }
        
        return `
            <div class="progress-step ${status}">
                <span>${icon}</span>
                <span>${step.agent}</span>
            </div>
        `;
    }).join('<span style="color: var(--text-light);">→</span>');
}

// ========================================
// Mock Result Generation
// ========================================

function generateMockResult(workflow, input) {
    // Parse some info from input
    const nameMatch = input.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/);
    const customerName = nameMatch ? nameMatch[1] : 'Customer';
    const firstName = customerName.split(' ')[0];
    
    if (workflow.id === 'used-vehicle-match') {
        return `
═══════════════════════════════════════════════════════
USED VEHICLE RECOMMENDATION REPORT
Pedersen Toyota | Fort Collins, CO
Generated: ${new Date().toLocaleString()}
═══════════════════════════════════════════════════════

CUSTOMER PROFILE:
• Name: ${customerName}
• Budget: $450/month
• Looking For: SUV with AWD
• Trade-In: 2019 Ford Escape | Est. Equity: $8,500

───────────────────────────────────────────────────────

🏆 RECOMMENDATION #1: 2023 Toyota RAV4 XLE AWD
Stock #: U24587 | VIN: ...T4R789
Match Score: 94/100 █████████░

Vehicle Details:
• Price: $31,495
• Mileage: 28,450 miles
• Color: Blueprint / Black
• Drivetrain: AWD

Key Features:
✓ Toyota Safety Sense 2.5+
✓ Apple CarPlay / Android Auto
✓ Power Liftgate
✓ Blind Spot Monitor

PAYMENT BREAKDOWN:
┌─────────────────────────────────┐
│ Vehicle Price      $31,495     │
│ Tax (8.30%)        $2,614      │
│ Fees               $996.70     │
│ ─────────────────────────────  │
│ Out-the-Door       $35,106     │
│ Trade Equity      -$8,500      │
│ ═════════════════════════════  │
│ Amount Financed    $26,606     │
│ APR: 6.49%                     │
│ ─────────────────────────────  │
│ 60 months: $520/mo             │
│ 72 months: $449/mo  ← BEST FIT │
└─────────────────────────────────┘

───────────────────────────────────────────────────────

NEXT STEPS:
1. Review with ${firstName}
2. Schedule test drive
3. Appraise trade-in
4. Follow up within 24 hours

Prepared by: Jeff Lee | 720-416-6955
═══════════════════════════════════════════════════════`;
    }
    
    if (workflow.id === 'toyota-recommend') {
        return `
═══════════════════════════════════════════════════════
NEW VEHICLE RECOMMENDATIONS
Pedersen Toyota | Fort Collins, CO
═══════════════════════════════════════════════════════

CUSTOMER: ${customerName}

TOP RECOMMENDATIONS:

1. 2026 Toyota RAV4 Hybrid XLE - $38,500
   • 41 MPG Combined
   • AWD Standard
   • Est. $485/mo (60mo, $0 down)

2. 2026 Toyota Highlander Hybrid XLE - $48,200
   • 3rd Row Seating
   • 36 MPG Combined
   • Est. $625/mo (60mo, $0 down)

3. 2026 Toyota Venza Limited - $43,800
   • Hybrid Only (40 MPG)
   • Premium Interior
   • Est. $555/mo (60mo, $0 down)

═══════════════════════════════════════════════════════`;
    }
    
    if (workflow.id === 'vehicle-compare') {
        return `
═══════════════════════════════════════════════════════
COMPETITIVE ANALYSIS
═══════════════════════════════════════════════════════

SEGMENT: Compact SUV

TOYOTA RAV4 vs COMPETITION:

                    RAV4    CR-V    Forester  Tucson
─────────────────────────────────────────────────────
Base MSRP           $30K    $31K    $33K      $29K
MPG (Combined)      30      30      29        29
Cargo (cu ft)       37.6    36.3    28.9      38.7
Towing (lbs)        3,500   1,500   3,000     2,000
Warranty (basic)    3/36K   3/36K   3/36K     5/60K

TOYOTA ADVANTAGES:
✅ Best-in-class towing (3,500 lbs)
✅ Hybrid option (41 MPG)
✅ ToyotaCare included (2yr maintenance)
✅ Highest resale value

CONQUEST TALKING POINTS:
• "The RAV4 can tow more than double the CR-V"
• "With the hybrid, you'll save $400/year on gas"
• "Toyota's resale value means lower total cost of ownership"

═══════════════════════════════════════════════════════`;
    }
    
    return 'Workflow completed successfully.';
}

// ========================================
// Recent Runs
// ========================================

function renderRecentRuns() {
    const container = document.getElementById('recentRuns');
    const empty = document.getElementById('emptyRuns');
    
    if (state.runs.length === 0) {
        empty.style.display = 'block';
        return;
    }
    
    empty.style.display = 'none';
    
    container.innerHTML = state.runs.slice(0, 10).map(run => {
        const statusIcon = run.status === 'success' ? '✅' : 
                          run.status === 'error' ? '❌' : 
                          run.status === 'running' ? '⏳' : '⏹';
        const statusClass = run.status;
        
        return `
            <div class="run-item" onclick="viewRun('${run.id}')">
                <div class="run-status ${statusClass}">${statusIcon}</div>
                <div class="run-info">
                    <div class="run-workflow">${run.workflowName}</div>
                    <div class="run-task">${run.task}</div>
                </div>
                <div class="run-time">${formatTime(run.startedAt)}</div>
            </div>
        `;
    }).join('');
}

function viewRun(runId) {
    const run = state.runs.find(r => r.id === runId);
    if (!run || !run.result) return;
    
    document.getElementById('resultContent').innerHTML = `<pre>${run.result}</pre>`;
    document.getElementById('resultModal').classList.add('active');
}

function closeResultModal() {
    document.getElementById('resultModal').classList.remove('active');
}

function copyResult() {
    const content = document.getElementById('resultContent').textContent;
    navigator.clipboard.writeText(content);
    showToast('Result copied to clipboard!');
}

function sendToCustomer() {
    // In a real implementation, this would integrate with the Client Hub
    showToast('Opening Client Hub to send result...');
    closeResultModal();
}

// ========================================
// Utility Functions
// ========================================

function generateId() {
    return Math.random().toString(36).substring(2, 14);
}

function formatTime(date) {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function refreshWorkflows() {
    showToast('Workflows refreshed');
}
