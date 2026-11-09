<script lang="ts">
	interface Props {
		verdict: string;
	}

	let { verdict = '' }: Props = $props();

	let normalizedVerdict = $derived(verdict.trim().toUpperCase());
	let isGuilty = $derived(normalizedVerdict.includes('GUILTY') && !normalizedVerdict.includes('NOT GUILTY'));
	let isNotGuilty = $derived(normalizedVerdict.includes('NOT GUILTY') || normalizedVerdict.includes('ACQUITTED'));
	let isDismissed = $derived(normalizedVerdict.includes('DISMISSED'));
</script>

<div class="relative inline-block my-2">
	<div
		class="animate-stamp inline-flex flex-col items-center justify-center px-6 py-2 rounded-2xl border-4 font-display uppercase tracking-widest text-center shadow-lg transform -rotate-3 select-none {isGuilty
			? 'border-red-600 bg-red-50 text-red-700 shadow-red-200/50'
			: isNotGuilty
				? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-emerald-200/50'
				: isDismissed
					? 'border-amber-600 bg-amber-50 text-amber-900 shadow-amber-200/50'
					: 'border-orange-600 bg-orange-50 text-orange-900 shadow-orange-200/50'}"
	>
		<span class="text-xs sm:text-sm font-bold tracking-widest opacity-80 border-b-2 border-current pb-0.5 mb-1">
			OFFICIAL VERDICT
		</span>
		<span class="text-2xl sm:text-4xl font-extrabold leading-none tracking-wider drop-shadow-sm">
			{verdict || 'PENDING'}
		</span>
		<span class="text-[10px] tracking-wider font-semibold opacity-70 mt-1">
			HACK CLUB HAVEN DELHI COURT
		</span>
	</div>
</div>
