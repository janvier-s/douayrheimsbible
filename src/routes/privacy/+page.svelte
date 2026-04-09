<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';
</script>

<svelte:head>
	<title>Privacy Policy | Douay-Rheims Bible</title>
	<meta name="description" content="Privacy policy for the Douay-Rheims Bible website." />
	<link rel="canonical" href="https://douayrheimsbible.net/privacy" />
</svelte:head>

<ProseLayout title="Privacy Policy">
	<p><em>Last updated: March 2026</em></p>

	<h2>Summary</h2>

	<p>
		This site collects no personal data. There are no accounts, no tracking cookies, no analytics,
		and no advertising. Your reading preferences are stored in your browser's local storage and
		never leave your device.
	</p>

	<h2>Data We Store</h2>

	<h3>Local Storage (your browser only)</h3>

	<ul>
		<li>
			<strong>Reading preferences</strong> — font size, font family, line height, theme, and reading
			mode. These are stored locally in your browser using <code>localStorage</code> so your settings
			persist between visits. This data is never transmitted to any server.
		</li>
		<li>
			<strong>Compare view settings</strong> — which translations are visible and their order.
		</li>
		<li><strong>Theme preference</strong> — light, dark, sepia, oled, or auto.</li>
	</ul>

	<h3>Server-Side</h3>

	<p>
		This site is hosted on Cloudflare Pages. Cloudflare may collect standard web server logs (IP
		addresses, request timestamps, browser user-agent strings) as part of their infrastructure. We
		do not have access to individual visitor logs. See
		<a href="https://www.cloudflare.com/privacypolicy/">Cloudflare's Privacy Policy</a> for details.
	</p>

	<h2>Third-Party Services</h2>

	<ul>
		<li>
			<strong>Google Fonts</strong> — the Libre Baskerville font family is loaded from Google's font
			CDN. Google may log requests to this service. See
			<a href="https://policies.google.com/privacy">Google's Privacy Policy</a>.
		</li>
	</ul>

	<h2>Cookies</h2>

	<p>This site does not set any cookies.</p>

	<h2>Children's Privacy</h2>

	<p>
		This site contains only the text of Sacred Scripture and related scholarly content. No personal
		data is collected from users of any age.
	</p>

	<h2>Changes</h2>

	<p>If this policy changes, the update will be reflected here with a new "last updated" date.</p>
</ProseLayout>

<PageFooter
	bookMeta={ALL_BOOKS[0]}
	chapterNum={1}
	totalChapters={50}
	routeBase="/odr"
	showNav={false}
/>
