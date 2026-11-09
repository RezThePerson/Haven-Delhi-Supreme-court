<script lang="ts">
	interface Props {
		role?: 'judge' | 'accuser' | 'defendant' | 'happy' | 'neutral';
		size?: number;
		class?: string;
	}

	let { role = 'neutral', size = 80, class: className = '' }: Props = $props();
</script>

<div
	class="inline-block relative select-none {className}"
	style="width: {size}px; height: {size}px;"
	role="img"
	aria-label="Haven Hedgehog {role}"
>
	<svg
		viewBox="0 0 100 100"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		class="w-full h-full drop-shadow-md transition-transform duration-300 hover:scale-105"
	>
		<!-- Spiky Quills (Warm Brown) -->
		<path
			d="M 50 12 
			   C 62 12, 73 17, 81 26 
			   L 90 24 L 84 34 L 94 40 L 85 48 L 92 57 L 83 63 L 88 74 L 77 76 L 80 86 L 68 85 L 67 92 L 53 87 
			   L 47 92 L 42 85 L 30 86 L 33 76 L 22 74 L 27 63 L 18 57 L 25 48 L 16 40 L 26 34 L 20 24 L 29 26 
			   C 37 17, 48 12, 50 12 Z"
			fill="#C87A54"
			stroke="#2B1D0C"
			stroke-width="3"
			stroke-linejoin="round"
		/>

		<!-- Secondary Quill Highlights -->
		<path
			d="M 50 18 C 65 18, 77 28, 80 44 L 86 50 L 78 55 L 83 66 L 73 68 L 74 77 L 63 76 L 50 80 L 37 76 L 26 77 L 27 68 L 17 55 L 23 50 C 26 28, 38 18, 50 18 Z"
			fill="#D98A62"
		/>

		<!-- Cute Round Face / Body (Soft Peach/Pink Blush) -->
		<ellipse cx="50" cy="55" rx="27" ry="24" fill="#F8C2A8" stroke="#2B1D0C" stroke-width="3" />

		<!-- Left Ear -->
		<circle cx="28" cy="40" r="6" fill="#F8C2A8" stroke="#2B1D0C" stroke-width="2.5" />
		<circle cx="28" cy="40" r="3" fill="#E89B95" />

		<!-- Right Ear -->
		<circle cx="72" cy="40" r="6" fill="#F8C2A8" stroke="#2B1D0C" stroke-width="2.5" />
		<circle cx="72" cy="40" r="3" fill="#E89B95" />

		<!-- Rosy Cheeks -->
		<ellipse cx="36" cy="62" rx="4.5" ry="3" fill="#F472B6" opacity="0.6" />
		<ellipse cx="64" cy="62" rx="4.5" ry="3" fill="#F472B6" opacity="0.6" />

		<!-- Eyes -->
		{#if role === 'defendant'}
			<!-- Nervous / wide curious eyes -->
			<circle cx="41" cy="52" r="3.5" fill="#2B1D0C" />
			<circle cx="42" cy="50.5" r="1.2" fill="#FFFFFF" />
			<circle cx="59" cy="52" r="3.5" fill="#2B1D0C" />
			<circle cx="60" cy="50.5" r="1.2" fill="#FFFFFF" />
			<!-- Sweat drop -->
			<path d="M 68 44 C 68 44, 71 47, 71 49 C 71 50.5, 69.5 51.5, 68 51.5 C 66.5 51.5, 65 50.5, 65 49 C 65 47, 68 44, 68 44 Z" fill="#38BDF8" />
		{:else if role === 'judge'}
			<!-- Discerning, focused eyes -->
			<circle cx="41" cy="52" r="3.2" fill="#2B1D0C" />
			<circle cx="42.5" cy="51" r="1" fill="#FFFFFF" />
			<circle cx="59" cy="52" r="3.2" fill="#2B1D0C" />
			<circle cx="60.5" cy="51" r="1" fill="#FFFFFF" />
			<!-- Monocle or spectacles -->
			<circle cx="41" cy="52" r="6.5" stroke="#F59E0B" stroke-width="2" fill="none" />
			<path d="M 47.5 52 L 52.5 52" stroke="#F59E0B" stroke-width="2" />
			<circle cx="59" cy="52" r="6.5" stroke="#F59E0B" stroke-width="2" fill="none" />
		{:else if role === 'happy'}
			<!-- Joyful arc eyes -->
			<path d="M 37 54 Q 41 49 45 54" stroke="#2B1D0C" stroke-width="3" stroke-linecap="round" fill="none" />
			<path d="M 55 54 Q 59 49 63 54" stroke="#2B1D0C" stroke-width="3" stroke-linecap="round" fill="none" />
		{:else}
			<!-- Standard cute shiny eyes -->
			<circle cx="41" cy="52" r="3.5" fill="#2B1D0C" />
			<circle cx="42.5" cy="50.5" r="1.2" fill="#FFFFFF" />
			<circle cx="59" cy="52" r="3.5" fill="#2B1D0C" />
			<circle cx="60.5" cy="50.5" r="1.2" fill="#FFFFFF" />
		{/if}

		<!-- Tiny Button Nose -->
		<ellipse cx="50" cy="57" rx="3.5" ry="2.2" fill="#2B1D0C" />

		<!-- Sweet Smile / Mouth -->
		{#if role === 'defendant'}
			<!-- Nervous wavy mouth -->
			<path d="M 46 64 Q 48 62 50 64 T 54 64" stroke="#2B1D0C" stroke-width="2" stroke-linecap="round" fill="none" />
		{:else if role === 'happy'}
			<!-- Big joyful open mouth -->
			<path d="M 46 62 Q 50 68 54 62 Z" fill="#DC2626" stroke="#2B1D0C" stroke-width="2" />
		{:else}
			<!-- Cute gentle smile -->
			<path d="M 46 62 Q 50 66 54 62" stroke="#2B1D0C" stroke-width="2.2" stroke-linecap="round" fill="none" />
		{/if}

		<!-- Role Specific Headgear / Props -->
		{#if role === 'judge'}
			<!-- Tiny Judge Powdered Wig / Laurels or Gavel badge -->
			<g transform="translate(32, 10)">
				<!-- Judge cap -->
				<rect x="2" y="8" width="32" height="6" rx="3" fill="#1E293B" stroke="#2B1D0C" stroke-width="2" />
				<polygon points="18,0 36,9 18,18 0,9" fill="#334155" stroke="#2B1D0C" stroke-width="2" />
				<circle cx="18" cy="9" r="2.5" fill="#F59E0B" />
				<path d="M 18 9 Q 25 15 28 20" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" fill="none" />
			</g>
		{:else if role === 'accuser'}
			<!-- Detective cap -->
			<path
				d="M 32 30 Q 50 20 68 30 L 74 33 Q 50 25 26 33 Z"
				fill="#D97706"
				stroke="#2B1D0C"
				stroke-width="2"
			/>
		{/if}

		<!-- Little Paws / Hands -->
		<ellipse cx="38" cy="74" rx="4" ry="3.5" fill="#F8C2A8" stroke="#2B1D0C" stroke-width="2" />
		<ellipse cx="62" cy="74" rx="4" ry="3.5" fill="#F8C2A8" stroke="#2B1D0C" stroke-width="2" />
	</svg>
</div>
