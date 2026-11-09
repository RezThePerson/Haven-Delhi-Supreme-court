<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { CourtCase } from '#lib/types';
	import HedgehogMascot from '#lib/components/HedgehogMascot.svelte';
	import HavenRibbon from '#lib/components/HavenRibbon.svelte';
	import VerdictStamp from '#lib/components/VerdictStamp.svelte';
	import { playGavelStrike, playVerdictFanfare } from '#lib/components/GavelSound';

	let activeCase = $state<CourtCase | null>(null);
	let dbStatus = $state<{ isNeon: boolean; hasUrl: boolean; mode: string }>({
		isNeon: false,
		hasUrl: false,
		mode: 'Checking...'
	});

	let soundEnabled = $state(true);
	let lastVerdictAnnounced = $state<string>('');
	let isConnected = $state(false);
	let eventSource: EventSource | null = null;
	let pollInterval: any = null;

	async function fetchCases() {
		try {
			const res = await fetch('/api/cases');
			if (res.ok) {
				const data = await res.json();
				handleStateUpdate(data);
			}
		} catch (err) {
			console.error('Failed to poll court state:', err);
		}
	}

	function handleStateUpdate(data: { cases: CourtCase[]; activeCase: CourtCase | null; dbStatus?: any }) {
		const newActive = data.activeCase || null;

		// Sound on new verdict announcement
		if (
			newActive &&
			newActive.status === 'VERDICT_ANNOUNCED' &&
			newActive.verdict &&
			newActive.verdict !== lastVerdictAnnounced
		) {
			lastVerdictAnnounced = newActive.verdict;
			if (soundEnabled) {
				playGavelStrike();
				setTimeout(() => playVerdictFanfare(), 250);
			}
		} else if (newActive && newActive.status !== 'VERDICT_ANNOUNCED') {
			lastVerdictAnnounced = '';
		}

		activeCase = newActive;
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

	onMount(() => {
		fetchCases();
		setupSSE();
		pollInterval = setInterval(fetchCases, 2500);
	});

	onDestroy(() => {
		if (eventSource) eventSource.close();
		if (pollInterval) clearInterval(pollInterval);
	});
</script>

<!-- Minimalist Fullscreen Large Screen / Projector View (No Scrolling) -->
<div class="haven-bg-gradient h-screen w-screen overflow-hidden flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none font-sans text-[#2B1D0C]">
	<!-- Sleek Top Header -->
	<header class="w-full flex items-center justify-between gap-4 flex-shrink-0">
		<div class="flex items-center gap-3">
			<span class="w-10 h-10 rounded-2xl bg-white border-2 border-[#2B1D0C] shadow-sm flex items-center justify-center text-xl font-bold">
				⚖️
			</span>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="font-display font-extrabold text-lg sm:text-2xl text-[#2B1D0C] tracking-wide leading-tight">
						HAVEN DELHI SUPREME COURT
					</h1>
					<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/80 border border-[#2B1D0C]/20 shadow-xs">
						<span class="h-2 w-2 rounded-full {isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span>
						<span class="text-[11px] uppercase tracking-wider text-amber-950 font-display">
							{isConnected ? 'LIVE' : 'SYNCING'}
						</span>
					</span>
				</div>
			</div>
		</div>

		<!-- Discreet Controls for AV operator / Judge link -->
		<div class="flex items-center gap-2">
			<button
				onclick={() => {
					soundEnabled = !soundEnabled;
					if (soundEnabled) playGavelStrike();
				}}
				class="haven-btn haven-btn-white text-xs px-3 py-1.5 min-h-[38px] opacity-80 hover:opacity-100 transition-opacity"
				title={soundEnabled ? 'Mute Gavel Audio' : 'Unmute Audio'}
				aria-label="Sound Toggle"
			>
				{soundEnabled ? '🔊 Sound On' : '🔇 Muted'}
			</button>

			<a
				href="/judge"
				class="haven-btn haven-btn-orange text-xs px-3.5 py-1.5 min-h-[38px] opacity-80 hover:opacity-100 transition-opacity"
			>
				<span>Judge Chambers 🔨</span>
			</a>
		</div>
	</header>

	<!-- Main Stage Display (Just the Current Case, Clean & Minimalistic) -->
	<main class="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-center items-center my-2 sm:my-4 overflow-hidden">
		{#if activeCase}
			<div class="w-full haven-card p-5 sm:p-8 lg:p-10 flex flex-col justify-between max-h-[82vh] overflow-hidden shadow-2xl relative border-4 border-[#2B1D0C]">
				<!-- Top Status Ribbon Banner -->
				<div class="flex items-center justify-between border-b-2 border-amber-200/80 pb-3 mb-4 sm:mb-6 flex-shrink-0">
					<div class="flex items-center gap-2">
						{#if activeCase.status === 'VERDICT_ANNOUNCED'}
							<HavenRibbon text="VERDICT PRONOUNCED" color="red" size="sm" notch="both" />
						{:else}
							<HavenRibbon text="HEARING IN SESSION" color="orange" size="sm" notch="both" />
						{/if}
					</div>

					<div class="text-xs sm:text-sm font-bold font-mono text-amber-900 bg-amber-100/90 px-3 py-1 rounded-full border border-amber-300">
						Case Docket #{activeCase.id}
					</div>
				</div>

				<!-- Accuser vs Defendant Showdown Cards -->
				<div class="grid grid-cols-1 md:grid-cols-11 gap-3 sm:gap-6 items-center flex-shrink-0">
					<!-- Accuser Card -->
					<div class="md:col-span-5 bg-gradient-to-br from-amber-50 to-orange-50 border-3 border-[#2B1D0C] rounded-2xl p-4 sm:p-6 text-center shadow-md relative">
						<span class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-600 text-white font-display text-xs font-extrabold px-3 py-0.5 rounded-full border-2 border-[#2B1D0C] tracking-wider shadow-sm uppercase">
							THE ACCUSER 🔍
						</span>
						<div class="mt-1 mb-2">
							<HedgehogMascot role="accuser" size={80} />
						</div>
						<div class="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl text-[#2B1D0C] truncate">
							{activeCase.accuser}
						</div>
					</div>

					<!-- VS Emblem -->
					<div class="md:col-span-1 flex items-center justify-center">
						<div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-display font-black text-xl sm:text-2xl flex items-center justify-center border-3 border-[#2B1D0C] shadow-md">
							VS
						</div>
					</div>

					<!-- Defendant Card -->
					<div class="md:col-span-5 bg-gradient-to-br from-sky-50 to-indigo-50 border-3 border-[#2B1D0C] rounded-2xl p-4 sm:p-6 text-center shadow-md relative">
						<span class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-sky-600 text-white font-display text-xs font-extrabold px-3 py-0.5 rounded-full border-2 border-[#2B1D0C] tracking-wider shadow-sm uppercase">
							THE DEFENDANT 🛡️
						</span>
						<div class="mt-1 mb-2">
							<HedgehogMascot role={activeCase.status === 'VERDICT_ANNOUNCED' ? 'neutral' : 'defendant'} size={80} />
						</div>
						<div class="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl text-[#2B1D0C] truncate">
							{activeCase.defendant}
						</div>
					</div>
				</div>

				<!-- The Reason / Charge (Clean & Large for Easy Projector Reading) -->
				<div class="my-4 sm:my-6 bg-amber-50/90 border-3 border-[#2B1D0C] rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden flex-1 flex flex-col justify-center">
					<div class="font-display text-xs font-extrabold tracking-widest text-amber-900 uppercase mb-1">
						📜 The Charge & Particulars
					</div>
					<p class="font-sans text-xl sm:text-3xl lg:text-4xl text-[#2B1D0C] font-semibold leading-snug line-clamp-3">
						"{activeCase.reason}"
					</p>
				</div>

				<!-- Verdict Display: ONLY GUILTY, NOT GUILTY, OR STILL THINKING -->
				<div class="border-t-2 border-amber-200/80 pt-3 flex-shrink-0 text-center">
					{#if activeCase.status === 'VERDICT_ANNOUNCED' && (activeCase.verdict === 'GUILTY' || activeCase.verdict === 'NOT GUILTY')}
						<div class="flex flex-col items-center">
							<VerdictStamp verdict={activeCase.verdict} />
						</div>
					{:else if activeCase.status === 'VERDICT_ANNOUNCED' && activeCase.verdict}
						<div class="flex flex-col items-center">
							<VerdictStamp verdict={activeCase.verdict} />
						</div>
					{:else}
						<div class="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-amber-100/95 border-3 border-amber-400 text-amber-950 text-base sm:text-xl font-display font-extrabold animate-pulse shadow-sm">
							<span class="text-2xl">🤔</span>
							<span>JUDGE IS STILL THINKING...</span>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<!-- Court Recess Minimalist Screen (Fits viewport without scrolling) -->
			<div class="w-full haven-card p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-xl border-4 border-[#2B1D0C]">
				<div class="flex justify-center mb-4">
					<HedgehogMascot role="happy" size={120} />
				</div>
				<h2 class="font-display font-black text-3xl sm:text-4xl text-[#2B1D0C] mb-2">
					Court is in Recess
				</h2>
				<p class="text-amber-900 text-base sm:text-lg font-medium mb-6">
					Waiting for the Presiding Judge to call the next case to stage.
				</p>
				<a
					href="/judge"
					class="haven-btn haven-btn-orange text-sm sm:text-base px-6 py-3 font-bold"
				>
					Open Judge Chambers to Call a Case 🔨
				</a>
			</div>
		{/if}
	</main>

	<!-- Minimalist Clean Footer -->
	<footer class="w-full flex items-center justify-between text-xs font-semibold text-white/90 drop-shadow-sm flex-shrink-0 pt-2">
		<div class="flex items-center gap-2">
			<span>🏕️ Hack Club Haven • Delhi Edition</span>
			<span class="opacity-40">•</span>
			<span class="font-mono text-[11px] px-2 py-0.5 rounded bg-black/20 text-white">
				{dbStatus.isNeon ? '⚡ Neon PostgreSQL Live' : '💾 Local Mode'}
			</span>
		</div>
		<div class="opacity-75 hidden sm:block">
			Official Judicial Projection Screen
		</div>
	</footer>
</div>
