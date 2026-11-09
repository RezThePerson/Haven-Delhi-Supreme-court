<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		text?: string;
		color?: 'orange' | 'green' | 'yellow' | 'red';
		notch?: 'left' | 'right' | 'both' | 'none';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		children?: Snippet;
	}

	let {
		text = '',
		color = 'orange',
		notch = 'both',
		size = 'md',
		class: className = '',
		children
	}: Props = $props();

	const colorStyles = {
		orange: 'bg-gradient-to-b from-[#FF7A30] to-[#E64A19] text-white border-[#B2380F]',
		green: 'bg-gradient-to-b from-[#76A628] to-[#4D7C0F] text-white border-[#365809]',
		yellow: 'bg-gradient-to-b from-[#FFD54F] to-[#FFA000] text-[#2B1D0C] border-[#B26A00]',
		red: 'bg-gradient-to-b from-[#EF4444] to-[#B91C1C] text-white border-[#7F1D1D]'
	};

	const sizeStyles = {
		sm: 'text-sm py-1 px-4 font-bold tracking-wide',
		md: 'text-base sm:text-lg py-1.5 px-6 font-bold tracking-wider',
		lg: 'text-xl sm:text-2xl py-2 px-8 font-extrabold tracking-widest'
	};

	const notchClasses = {
		left: 'ribbon-notch-left',
		right: 'ribbon-notch-right',
		both: 'ribbon-swallowtail',
		none: 'rounded-xl'
	};
</script>

<div
	class="inline-block relative shadow-md font-display transform select-none transition-transform hover:scale-105 {notchClasses[
		notch
	]} {colorStyles[color]} {sizeStyles[size]} {className}"
	style="text-shadow: 0 2px 0 rgba(0,0,0,0.2);"
>
	{#if children}
		{@render children()}
	{:else}
		{text}
	{/if}
</div>
