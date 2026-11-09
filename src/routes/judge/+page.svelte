<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { CourtCase, CaseStatus } from '#lib/types';
	import HedgehogMascot from '#lib/components/HedgehogMascot.svelte';
	import HavenRibbon from '#lib/components/HavenRibbon.svelte';
	import { playGavelStrike, playVerdictFanfare, playOrderInCourt } from '#lib/components/GavelSound';

	let cases = $state<CourtCase[]>([]);
	let activeCase = $state<CourtCase | null>(null);
	let dbStatus = $state<{ isNeon: boolean; hasUrl: boolean; mode: string }>({
		isNeon: false,
		hasUrl: false,
		mode: 'Checking...'
	});

	let isConnected = $state(false);
	let isSaving = $state(false);
	let saveFeedback = $state<string>('');
	let soundEnabled = $state(true);
	let eventSource: EventSource | null = null;
	let pollInterval: any = null;

	// New Case Form Inputs
	let newAccuser = $state('');
	let newDefendant = $state('');
	let newReason = $state('');
	let newVerdict = $state('');
	let isAddingCase = $state(false);
	let addError = $state('');

	// Active Stage Editable State (Allows last-moment instant edits without reloading)
	let stageAccuser = $state('');
	let stageDefendant = $state('');
	let stageReason = $state('');
	let stageVerdict = $state('');
	let stageStatus = $state<CaseStatus>('IN_SESSION');

	// Debounce timer for stage auto-save
	let saveTimeout: any = null;

	function syncStageWithActiveCase(c: CourtCase | null) {
		if (c) {
			stageAccuser = c.accuser;
			stageDefendant = c.defendant;
			stageReason = c.reason;
			stageVerdict = c.verdict;
			stageStatus = c.status;
		} else {
			stageAccuser = '';
			stageDefendant = '';
			stageReason = '';
			stageVerdict = '';
			stageStatus = 'UPCOMING';
		}
	}

	async function fetchCases() {
		try {
			const res = await fetch('/api/cases');
			if (res.ok) {
				const data = await res.json();
				handleStateUpdate(data);
			}
		} catch (err) {
			console.error('Failed to load judge cases:', err);
		}
	}

	function handleStateUpdate(data: { cases: CourtCase[]; activeCase: CourtCase | null; dbStatus?: any }) {
		cases = data.cases || [];
		const prevActiveId = activeCase?.id;
		activeCase = data.activeCase || null;

		// Only overwrite stage inputs if activeCase ID changed or if user isn't actively typing
		if (!prevActiveId || prevActiveId !== activeCase?.id) {
			syncStageWithActiveCase(activeCase);
		}

		if (data.dbStatus) {
			dbStatus = data.dbStatus;
		}
	}

	function setupSSE() {
		if (typeof window === 'undefined') return;

		try {
			eventSource = new EventSource('/api/stream');

			eventSource.addEventListener('update', (event) => {
				isConnected = true;
				try {
					const data = JSON.parse(event.data);
					handleStateUpdate(data);
				} catch (err) {
					console.error('Error parsing SSE payload:', err);
				}
			});

			eventSource.onopen = () => {
				isConnected = true;
			};

			eventSource.onerror = () => {
				isConnected = false;
			};
		} catch {
			isConnected = false;
		}
	}

	// Instant autosave for the stage inputs
	function scheduleStageAutosave() {
		if (!activeCase) return;
		isSaving = true;
		saveFeedback = 'Saving...';

		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(async () => {
			await saveStageChanges();
		}, 300);
	}

	async function saveStageChanges(customStatus?: CaseStatus, customVerdict?: string) {
		if (!activeCase) return;

		isSaving = true;
		try {
			const payload = {
				accuser: stageAccuser,
				defendant: stageDefendant,
				reason: stageReason,
				verdict: customVerdict !== undefined ? customVerdict : stageVerdict,
				status: customStatus !== undefined ? customStatus : stageStatus
			};

			const res = await fetch(`/api/cases/${activeCase.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (res.ok) {
				const json = await res.json();
				activeCase = json.case;
				saveFeedback = '✓ Synced live';
				setTimeout(() => {
					if (saveFeedback === '✓ Synced live') saveFeedback = '';
				}, 1500);
			} else {
				saveFeedback = 'Save failed';
			}
		} catch (err) {
			saveFeedback = 'Network error';
		} finally {
			isSaving = false;
		}
	}

	// Judge Action: Set Verdict (Only GUILTY, NOT GUILTY, or STILL THINKING)
	async function setVerdict(verdictChoice: 'GUILTY' | 'NOT GUILTY' | 'STILL_THINKING') {
		if (!activeCase) return;

		if (verdictChoice === 'STILL_THINKING') {
			stageVerdict = '';
			stageStatus = 'IN_SESSION';
			if (soundEnabled) playGavelStrike();
			await saveStageChanges('IN_SESSION', '');
		} else {
			stageVerdict = verdictChoice;
			stageStatus = 'VERDICT_ANNOUNCED';
			if (soundEnabled) {
				playGavelStrike();
				setTimeout(() => playVerdictFanfare(), 250);
			}
			await saveStageChanges('VERDICT_ANNOUNCED', verdictChoice);
		}
	}

	// Judge Action: Put a case on Stage
	async function putOnStage(caseId: string) {
		try {
			const res = await fetch('/api/cases/activate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: caseId })
			});
			if (res.ok) {
				const data = await res.json();
				activeCase = data.activeCase;
				syncStageWithActiveCase(activeCase);
				if (soundEnabled) playGavelStrike();
			}
		} catch (err) {
			console.error('Failed to put case on stage:', err);
		}
	}

	// Judge Action: Take case off stage (Recess)
	async function clearStage() {
		try {
			const res = await fetch('/api/cases/activate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: null })
			});
			if (res.ok) {
				activeCase = null;
				syncStageWithActiveCase(null);
			}
		} catch (err) {
			console.error('Failed to clear stage:', err);
		}
	}

	// Judge Action: Add new case
	async function handleAddCase(andPutOnStage = false) {
		if (!newAccuser.trim() || !newDefendant.trim() || !newReason.trim()) {
			addError = 'Accuser, Defendant, and Reason are required.';
			return;
		}

		addError = '';
		isAddingCase = true;

		try {
			const res = await fetch('/api/cases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					accuser: newAccuser,
					defendant: newDefendant,
					reason: newReason,
					verdict: newVerdict,
					status: 'UPCOMING'
				})
			});

			if (res.ok) {
				const json = await res.json();
				const created = json.case;
				// Reset inputs
				newAccuser = '';
				newDefendant = '';
				newReason = '';
				newVerdict = '';

				if (andPutOnStage && created?.id) {
					await putOnStage(created.id);
				} else {
					await fetchCases();
				}
			} else {
				addError = 'Failed to create case.';
			}
		} catch (err) {
			addError = 'Network error creating case.';
		} finally {
			isAddingCase = false;
		}
	}

	// Judge Action: Delete case
	async function handleDeleteCase(caseId: string) {
		if (!confirm('Are you sure you want to dismiss and delete this case?')) return;

		try {
			const res = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' });
			if (res.ok) {
				if (activeCase?.id === caseId) {
					activeCase = null;
					syncStageWithActiveCase(null);
				}
				await fetchCases();
			}
		} catch (err) {
			console.error('Failed to delete case:', err);
		}
	}

	onMount(() => {
		fetchCases();
		setupSSE();
		pollInterval = setInterval(fetchCases, 3000);
	});

	onDestroy(() => {
		if (eventSource) eventSource.close();
		if (pollInterval) clearInterval(pollInterval);
		if (saveTimeout) clearTimeout(saveTimeout);
	});
</script>

<div class="haven-bg-gradient min-h-screen pb-20 px-3 sm:px-6 font-sans">
	<!-- Judge Header -->
	<header class="max-w-6xl mx-auto pt-4 sm:pt-6 mb-6 flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			<div class="w-12 h-12 rounded-2xl bg-white border-3 border-[#2B1D0C] shadow-sm flex items-center justify-center font-display text-2xl">
				🔨
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="font-display font-black text-xl sm:text-2xl text-[#2B1D0C]">
						Judge Control Chambers
					</h1>
					<span class="bg-red-500 text-white font-display text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
						LIVE STAGE
					</span>
				</div>
				<div class="flex items-center gap-2 text-xs font-medium text-[#543B1D]">
					<span>Single Panel • Real-time Sync</span>
					<span class="opacity-40">•</span>
					<span class="font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-100/90 border border-amber-300 font-bold">
						{dbStatus.isNeon ? '⚡ Neon Postgres' : '💾 Local Fallback'}
					</span>
				</div>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<!-- Sound Strike -->
			<button
				onclick={() => {
					playOrderInCourt();
				}}
				class="haven-btn haven-btn-yellow text-xs sm:text-sm px-3.5 py-2"
				title="Strike Gavel Thrice for Order"
			>
				<span>🔨 Strike Gavel</span>
			</button>

			<!-- Audio Toggle -->
			<button
				onclick={() => {
					soundEnabled = !soundEnabled;
				}}
				class="haven-btn haven-btn-white text-xs sm:text-sm px-3 py-2"
			>
				{soundEnabled ? '🔊 Sound On' : '🔇 Muted'}
			</button>

			<!-- Open Participant Audience View in new tab -->
			<a
				href="/"
				target="_blank"
				rel="noreferrer"
				class="haven-btn haven-btn-green text-xs sm:text-sm px-4 py-2"
			>
				<span>Open Spectator View ↗</span>
			</a>
		</div>
	</header>

	<main class="max-w-6xl mx-auto space-y-8">
		<!-- ========================================== -->
		<!-- THE ONE PANEL, ONE STAGE COMMAND CONTROL   -->
		<!-- ========================================== -->
		<section class="haven-card p-5 sm:p-8 relative border-4 border-[#2B1D0C]">
			<!-- Header of Stage -->
			<div class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-amber-200 pb-4 mb-6">
				<div class="flex items-center gap-3">
					<span class="text-3xl">⚖️</span>
					<div>
						<h2 class="font-display font-extrabold text-xl sm:text-2xl text-[#2B1D0C]">
							The Active Stage
						</h2>
						<p class="text-xs text-amber-900 font-medium">
							Changes here immediately broadcast live to all participants without reloading.
						</p>
					</div>
				</div>

				<div class="flex items-center gap-3">
					{#if saveFeedback}
						<span class="text-xs font-mono font-bold px-2 py-1 rounded bg-amber-100 border border-amber-300 text-amber-900 animate-pulse">
							{saveFeedback}
						</span>
					{/if}

					{#if activeCase}
						<button
							onclick={clearStage}
							class="haven-btn haven-btn-white text-xs px-3 py-1.5"
							title="Remove from public view"
						>
							⏸️ Recess Stage
						</button>
					{/if}
				</div>
			</div>

			{#if activeCase}
				<!-- LIVE STAGE FORM (RAPID EDITING) -->
				<div class="space-y-6">
					<!-- Active Case Alert Ribbon -->
					<div class="bg-gradient-to-r from-amber-500 to-orange-500 p-3 rounded-xl border-2 border-[#2B1D0C] text-white flex flex-wrap items-center justify-between gap-2 shadow-sm">
						<div class="flex items-center gap-2 font-display text-sm font-bold">
							<span class="w-3 h-3 rounded-full bg-red-400 animate-ping"></span>
							<span>NOW BROADCASTING LIVE:</span>
							<span class="underline decoration-white/60">{stageAccuser || 'Accuser'} v. {stageDefendant || 'Defendant'}</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-xs font-mono bg-black/20 px-2 py-0.5 rounded">
								Status: {stageStatus}
							</span>
						</div>
					</div>

					<!-- Accuser & Defendant Live Inputs -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
						<!-- Accuser Input -->
						<div class="bg-amber-50/80 p-4 rounded-xl border-2 border-amber-300">
							<label for="accuser-input" class="block font-display font-bold text-xs uppercase tracking-wider text-amber-900 mb-1">
								🔍 Accuser Name (Prosecution)
							</label>
							<input
								id="accuser-input"
								type="text"
								bind:value={stageAccuser}
								oninput={scheduleStageAutosave}
								placeholder="e.g. Alice the Organizer"
								class="w-full text-lg sm:text-xl font-display font-bold px-3.5 py-2.5 rounded-lg border-2 border-[#2B1D0C] bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
							/>
							<span class="text-[11px] text-amber-800 font-medium mt-1 block">
								Type to instantly update the spectator screen.
							</span>
						</div>

						<!-- Defendant Input -->
						<div class="bg-sky-50/80 p-4 rounded-xl border-2 border-sky-300">
							<label for="defendant-input" class="block font-display font-bold text-xs uppercase tracking-wider text-sky-950 mb-1">
								🛡️ Defendant Name (Accused)
							</label>
							<input
								id="defendant-input"
								type="text"
								bind:value={stageDefendant}
								oninput={scheduleStageAutosave}
								placeholder="e.g. Bob the Night Owl"
								class="w-full text-lg sm:text-xl font-display font-bold px-3.5 py-2.5 rounded-lg border-2 border-[#2B1D0C] bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-inner"
							/>
							<span class="text-[11px] text-sky-800 font-medium mt-1 block">
								Reflects on the defendant battle card immediately.
							</span>
						</div>
					</div>

					<!-- Reason / Allegations Input -->
					<div class="bg-orange-50/80 p-4 rounded-xl border-2 border-orange-300">
						<label for="reason-input" class="block font-display font-bold text-xs uppercase tracking-wider text-orange-950 mb-1">
							📜 The Reason / Particulars of the Charge
						</label>
						<textarea
							id="reason-input"
							rows="3"
							bind:value={stageReason}
							oninput={scheduleStageAutosave}
							placeholder="What is the case about? Details, evidence, and complaints..."
							class="w-full text-base sm:text-lg font-sans font-medium px-3.5 py-2.5 rounded-lg border-2 border-[#2B1D0C] bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-inner resize-y"
						></textarea>
					</div>

					<!-- Verdict Selection: ONLY GUILTY, NOT GUILTY, OR STILL THINKING -->
					<div class="bg-amber-100/70 p-5 sm:p-6 rounded-2xl border-3 border-[#2B1D0C] space-y-4">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<span class="block font-display font-extrabold text-sm uppercase tracking-wider text-[#2B1D0C]">
								⚖️ Judge Verdict Decision
							</span>
							<span class="text-xs font-bold px-3 py-1 rounded-full font-display {stageStatus === 'VERDICT_ANNOUNCED' ? (stageVerdict === 'GUILTY' ? 'bg-red-200 text-red-900 border border-red-400' : 'bg-emerald-200 text-emerald-900 border border-emerald-400') : 'bg-amber-200 text-amber-900 border border-amber-400'}">
								Current: {stageStatus === 'VERDICT_ANNOUNCED' && stageVerdict ? stageVerdict : 'STILL THINKING'}
							</span>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
							<!-- 1. GUILTY -->
							<button
								type="button"
								onclick={() => setVerdict('GUILTY')}
								class="haven-btn haven-btn-red text-base sm:text-xl py-4 px-4 font-display font-black tracking-wider flex items-center justify-center gap-2 {stageStatus === 'VERDICT_ANNOUNCED' && stageVerdict === 'GUILTY' ? 'ring-4 ring-red-400 scale-[1.02] shadow-lg' : 'opacity-85 hover:opacity-100'}"
							>
								<span class="text-2xl">🔨</span>
								<span>GUILTY</span>
							</button>

							<!-- 2. NOT GUILTY -->
							<button
								type="button"
								onclick={() => setVerdict('NOT GUILTY')}
								class="haven-btn haven-btn-green text-base sm:text-xl py-4 px-4 font-display font-black tracking-wider flex items-center justify-center gap-2 {stageStatus === 'VERDICT_ANNOUNCED' && stageVerdict === 'NOT GUILTY' ? 'ring-4 ring-emerald-400 scale-[1.02] shadow-lg' : 'opacity-85 hover:opacity-100'}"
							>
								<span class="text-2xl">🕊️</span>
								<span>NOT GUILTY</span>
							</button>

							<!-- 3. STILL THINKING -->
							<button
								type="button"
								onclick={() => setVerdict('STILL_THINKING')}
								class="haven-btn haven-btn-yellow text-base sm:text-xl py-4 px-4 font-display font-black tracking-wider flex items-center justify-center gap-2 {stageStatus !== 'VERDICT_ANNOUNCED' || !stageVerdict ? 'ring-4 ring-amber-400 scale-[1.02] shadow-lg' : 'opacity-85 hover:opacity-100'}"
							>
								<span class="text-2xl">🤔</span>
								<span>STILL THINKING</span>
							</button>
						</div>

						<div class="flex items-center justify-between text-xs text-amber-900 font-semibold pt-1 border-t border-amber-300/60">
							<span>Click any button above to instantly broadcast the decision to the spectator display.</span>
							<span>{isSaving ? 'Syncing...' : '✓ Synced'}</span>
						</div>
					</div>
				</div>
			{:else}
				<!-- Empty Stage Notice -->
				<div class="text-center py-10 px-4 bg-amber-50/60 rounded-2xl border-2 border-dashed border-amber-300">
					<div class="flex justify-center mb-3">
						<HedgehogMascot role="judge" size={80} />
					</div>
					<h3 class="font-display font-bold text-xl text-[#2B1D0C] mb-1">
						The Stage is Currently Clear
					</h3>
					<p class="text-sm text-amber-800 max-w-md mx-auto mb-4 font-medium">
						Choose any case from the docket below and click <strong>"Put on Stage"</strong> to broadcast it live, or quickly add a new case right below!
					</p>
					{#if cases.length > 0}
						<button
							onclick={() => putOnStage(cases[0].id)}
							class="haven-btn haven-btn-orange text-sm px-5 py-2"
						>
							⚡ Put First Case on Stage ({cases[0].accuser} v. {cases[0].defendant})
						</button>
					{/if}
				</div>
			{/if}
		</section>

		<!-- ========================================== -->
		<!-- FAST "ADD CASE" PANEL (INLINE, NO MODALS)  -->
		<!-- ========================================== -->
		<section class="haven-card p-5 sm:p-7">
			<div class="flex items-center justify-between border-b-2 border-amber-200 pb-3 mb-5">
				<div class="flex items-center gap-2">
					<span class="text-2xl">➕</span>
					<h3 class="font-display font-extrabold text-xl text-[#2B1D0C]">
						Quick File New Case
					</h3>
				</div>
				<span class="text-xs font-bold text-amber-900">
					Add as many cases as needed
				</span>
			</div>

			{#if addError}
				<div class="mb-4 p-3 rounded-xl bg-red-100 border-2 border-red-300 text-red-900 text-sm font-bold">
					⚠️ {addError}
				</div>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleAddCase(false);
				}}
				class="space-y-4"
			>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="new-accuser-input" class="block font-display font-bold text-xs uppercase tracking-wider text-amber-900 mb-1">
							Accuser Name *
						</label>
						<input
							id="new-accuser-input"
							type="text"
							bind:value={newAccuser}
							placeholder="Who is filing the complaint?"
							required
							class="w-full text-base font-display font-semibold px-3 py-2 rounded-lg border-2 border-[#2B1D0C] bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
						/>
					</div>

					<div>
						<label for="new-defendant-input" class="block font-display font-bold text-xs uppercase tracking-wider text-amber-900 mb-1">
							Defendant Name *
						</label>
						<input
							id="new-defendant-input"
							type="text"
							bind:value={newDefendant}
							placeholder="Who is being charged?"
							required
							class="w-full text-base font-display font-semibold px-3 py-2 rounded-lg border-2 border-[#2B1D0C] bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
						/>
					</div>
				</div>

				<div>
					<label for="new-reason-input" class="block font-display font-bold text-xs uppercase tracking-wider text-amber-900 mb-1">
						The Reason / Allegation *
					</label>
					<input
						id="new-reason-input"
						type="text"
						bind:value={newReason}
						placeholder="What happened? e.g. Stole the last donut, deployed broken code, etc."
						required
						class="w-full text-base font-sans font-medium px-3 py-2 rounded-lg border-2 border-[#2B1D0C] bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
					/>
				</div>


				<div class="flex flex-wrap items-center gap-3 pt-2">
					<button
						type="submit"
						disabled={isAddingCase}
						class="haven-btn haven-btn-yellow text-sm px-5 py-2.5"
					>
						<span>📥 Add to Docket</span>
					</button>

					<button
						type="button"
						disabled={isAddingCase}
						onclick={() => handleAddCase(true)}
						class="haven-btn haven-btn-orange text-sm px-5 py-2.5 font-bold"
					>
						<span>⚡ Add & Put on Stage Live</span>
					</button>
				</div>
			</form>
		</section>

		<!-- ========================================== -->
		<!-- ALL CASES DOCKET MANAGER                   -->
		<!-- ========================================== -->
		<section class="haven-card p-5 sm:p-7">
			<div class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-amber-200 pb-3 mb-5">
				<div class="flex items-center gap-2">
					<span class="text-2xl">📋</span>
					<h3 class="font-display font-extrabold text-xl text-[#2B1D0C]">
						Court Docket ({cases.length} Total Cases)
					</h3>
				</div>
				<div class="text-xs text-amber-900 font-medium">
					Click <strong>Put on Stage</strong> to switch live focus immediately.
				</div>
			</div>

			<div class="space-y-4">
				{#if cases.length === 0}
					<div class="text-center py-6 text-amber-800 font-medium">
						No cases on docket. Add your first case above!
					</div>
				{:else}
					{#each cases as c (c.id)}
						<div
							class="p-4 rounded-xl border-3 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 {c.is_active
								? 'bg-amber-100/90 border-[#2B1D0C] shadow-md ring-2 ring-amber-400'
								: 'bg-white border-amber-200 hover:border-amber-400'}"
						>
							<!-- Case Details -->
							<div class="space-y-1.5 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									{#if c.is_active}
										<span class="px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-600 text-white tracking-wider uppercase animate-pulse">
											ON STAGE NOW
										</span>
									{/if}

									<span class="font-display font-extrabold text-lg text-[#2B1D0C]">
										{c.accuser} <span class="text-amber-700 font-normal">v.</span> {c.defendant}
									</span>

									<span class="text-xs px-2 py-0.5 rounded-full font-bold {c.status === 'VERDICT_ANNOUNCED' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-gray-100 text-gray-700 border border-gray-300'}">
										{c.status}
									</span>
								</div>

								<p class="text-sm text-gray-700 italic">
									"{c.reason}"
								</p>

								{#if c.verdict}
									<div class="text-xs font-bold text-amber-950 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 inline-block">
										Verdict: {c.verdict}
									</div>
								{/if}
							</div>

							<!-- Actions for this case -->
							<div class="flex flex-wrap items-center gap-2">
								{#if !c.is_active}
									<button
										onclick={() => putOnStage(c.id)}
										class="haven-btn haven-btn-orange text-xs px-3.5 py-1.5"
									>
										<span>Put on Stage ⚡</span>
									</button>
								{:else}
									<span class="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-300">
										✓ Active on Stage
									</span>
								{/if}

								<button
									onclick={() => handleDeleteCase(c.id)}
									class="haven-btn haven-btn-white text-xs px-2.5 py-1.5 text-red-700 hover:text-red-900"
									title="Dismiss / Delete Case"
								>
									🗑️
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</section>
	</main>
</div>
