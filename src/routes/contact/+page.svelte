<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';

	type FormState = 'idle' | 'submitting' | 'success' | 'error';

	let formState = $state<FormState>('idle');
	let errorMessage = $state('');

	let subject = $state('');
	let reference = $state('');
	let email = $state('');
	let message = $state('');
	let honeypot = $state('');

	type TouchedFields = {
		subject: boolean;
		email: boolean;
		message: boolean;
	};

	let touched = $state<TouchedFields>({
		subject: false,
		email: false,
		message: false
	});

	const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	const subjectError = $derived(touched.subject && !subject ? 'Please select a subject.' : '');

	const emailError = $derived(
		touched.email && !email
			? 'An email address is required.'
			: touched.email && !EMAIL_RE.test(email)
				? 'Please enter a valid email address.'
				: ''
	);

	const messageError = $derived(
		touched.message && !message
			? 'A message is required.'
			: touched.message && message.trim().length < 10
				? 'Please write at least a few words.'
				: ''
	);

	const showReference = $derived(subject === 'text-error' || subject === 'annotation-error');

	function touchAll() {
		touched = { subject: true, email: true, message: true };
	}

	function isValid(): boolean {
		if (!subject) return false;
		if (!email || !EMAIL_RE.test(email)) return false;
		if (!message || message.trim().length < 10) return false;
		return true;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		touchAll();
		if (!isValid()) return;
		if (honeypot) return;

		formState = 'submitting';
		errorMessage = '';

		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					subject,
					reference: showReference ? reference : '',
					email,
					message
				})
			});

			if (res.ok) {
				formState = 'success';
			} else {
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				errorMessage = data.error ?? 'Something went wrong. Please try again.';
				formState = 'error';
			}
		} catch {
			errorMessage = 'Could not send your message. Please check your connection and try again.';
			formState = 'error';
		}
	}
</script>

<svelte:head>
	<title>Contact · Douay-Rheims Bible</title>
	<meta
		name="description"
		content="Report an error, ask a question, or send a message to the Douay-Rheims Bible project."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/contact" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Contact" />
	<meta property="og:url" content="https://thedouayrheims.com/contact" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout title="Contact">
	<p class="contact-intro">This project is maintained by a single person. Every report helps.</p>

	{#if formState === 'success'}
		<div class="success-panel">
			<span class="success-cross" aria-hidden="true">✠</span>
			<h2 class="success-heading">Message sent</h2>
			<p class="success-body">
				Thank you for writing.<br />A reply will follow in due course.
			</p>
			<a class="back-link" href="/odr/genesis/1">Back to reading →</a>
		</div>
	{:else}
		<form class="contact-form" onsubmit={handleSubmit} novalidate>
			<!-- Honeypot: hidden from real users, filled only by bots -->
			<div class="hp-field" aria-hidden="true">
				<label for="website">Website</label>
				<input
					type="text"
					id="website"
					name="website"
					tabindex="-1"
					autocomplete="off"
					bind:value={honeypot}
				/>
			</div>

			<div class="field-group">
				<label class="field-label" for="subject"
					>Subject <span class="required" aria-hidden="true">*</span></label
				>
				<div class="select-wrap">
					<select
						id="subject"
						class="field-select"
						class:field-error-input={subjectError}
						bind:value={subject}
						onblur={() => (touched.subject = true)}
						aria-describedby={subjectError ? 'subject-error' : undefined}
						aria-invalid={subjectError ? 'true' : undefined}
					>
						<option value="" disabled selected>Select a subject&hellip;</option>
						<option value="text-error">Error in the Scripture text</option>
						<option value="annotation-error">Error in an annotation or note</option>
						<option value="technical-error">Technical error</option>
						<option value="translation-question">Question about the translation</option>
						<option value="feature-suggestion">Feature suggestion</option>
						<option value="other">Other</option>
					</select>
					<span class="select-chevron" aria-hidden="true">
						<svg
							width="10"
							height="6"
							viewBox="0 0 10 6"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M1 1L5 5L9 1"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</span>
				</div>
				{#if subjectError}
					<p id="subject-error" class="field-error-msg" role="alert">{subjectError}</p>
				{/if}
			</div>

			{#if showReference}
				<div class="field-group">
					<label class="field-label" for="reference">Scripture reference</label>
					<input
						type="text"
						id="reference"
						class="field-input"
						placeholder="e.g. Genesis 1:3"
						bind:value={reference}
						autocomplete="off"
					/>
					<p class="field-hint">The book, chapter, and verse where the error appears.</p>
				</div>
			{/if}

			<div class="field-group">
				<label class="field-label" for="email"
					>Email <span class="required" aria-hidden="true">*</span></label
				>
				<input
					type="email"
					id="email"
					class="field-input"
					class:field-error-input={emailError}
					bind:value={email}
					onblur={() => (touched.email = true)}
					autocomplete="email"
					aria-describedby={emailError ? 'email-error' : undefined}
					aria-invalid={emailError ? 'true' : undefined}
				/>
				{#if emailError}
					<p id="email-error" class="field-error-msg" role="alert">{emailError}</p>
				{/if}
			</div>

			<div class="field-group">
				<label class="field-label" for="message"
					>Message <span class="required" aria-hidden="true">*</span></label
				>
				<textarea
					id="message"
					class="field-textarea"
					class:field-error-input={messageError}
					rows={6}
					bind:value={message}
					onblur={() => (touched.message = true)}
					aria-describedby={messageError ? 'message-error' : undefined}
					aria-invalid={messageError ? 'true' : undefined}
				></textarea>
				{#if messageError}
					<p id="message-error" class="field-error-msg" role="alert">{messageError}</p>
				{/if}
			</div>

			<div class="submit-row">
				<button
					type="submit"
					class="submit-btn"
					disabled={formState === 'submitting'}
					aria-busy={formState === 'submitting'}
				>
					{#if formState === 'submitting'}
						<svg
							class="spinner"
							width="14"
							height="14"
							viewBox="0 0 14 14"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							aria-hidden="true"
						>
							<circle
								cx="7"
								cy="7"
								r="5.5"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-dasharray="22 12"
								stroke-linecap="round"
							/>
						</svg>
						Sending&hellip;
					{:else}
						Send message
					{/if}
				</button>

				{#if formState === 'error'}
					<p class="submit-error" role="alert">{errorMessage}</p>
				{/if}
			</div>
		</form>
	{/if}
</ProseLayout>

<style>
	.contact-intro {
		color: var(--color-muted);
		margin-bottom: 20px;
	}

	/* Success panel */
	.success-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 32px 20px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-panel);
	}

	.success-cross {
		font-size: 22px;
		color: var(--color-accent);
		margin-bottom: 10px;
		display: block;
	}

	.success-heading {
		font-family: var(--font-reader);
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--color-heading, var(--color-text));
		letter-spacing: -0.01em;
		margin: 0 0 8px;
	}

	.success-body {
		font-family: var(--font-reader);
		font-size: 0.95rem;
		line-height: 1.65;
		color: var(--color-muted);
		max-width: 360px;
		margin: 0 0 20px;
	}

	.back-link {
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-accent-text);
		text-decoration: none;
		letter-spacing: 0.02em;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: opacity 150ms ease;
	}

	.back-link:hover {
		opacity: 0.75;
	}

	/* Form layout */
	.contact-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* Honeypot */
	.hp-field {
		display: none;
	}

	/* Field group */
	.field-group {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.field-label {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-text);
	}

	.required {
		color: var(--color-accent);
		margin-left: 2px;
	}

	/* Input base */
	.field-input,
	.field-textarea {
		width: 100%;
		padding: 7px 10px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		font-family: var(--font-ui);
		font-size: 14px;
		color: var(--color-text);
		transition:
			border-color 150ms ease,
			box-shadow 150ms ease;
		box-sizing: border-box;
		appearance: none;
		-webkit-appearance: none;
	}

	.field-input:focus,
	.field-textarea:focus {
		outline: none;
		border-color: var(--color-muted);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-subtle) 30%, transparent);
	}

	.field-input::placeholder,
	.field-textarea::placeholder {
		color: var(--color-subtle);
		opacity: 1;
	}

	.field-textarea {
		resize: vertical;
		min-height: 96px;
		line-height: 1.55;
	}

	/* Select */
	.select-wrap {
		position: relative;
	}

	.field-select {
		width: 100%;
		padding: 7px 32px 7px 10px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		font-family: var(--font-ui);
		font-size: 14px;
		color: var(--color-text);
		appearance: none;
		-webkit-appearance: none;
		cursor: pointer;
		transition:
			border-color 150ms ease,
			box-shadow 150ms ease;
		box-sizing: border-box;
	}

	.field-select:focus {
		outline: none;
		border-color: var(--color-muted);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-subtle) 30%, transparent);
	}

	.select-chevron {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-muted);
		pointer-events: none;
		display: flex;
		align-items: center;
	}

	/* Error states */
	.field-error-input {
		border-color: color-mix(in srgb, #c0392b 60%, var(--color-border));
	}

	.field-error-input:focus {
		border-color: #c0392b;
		box-shadow: 0 0 0 2px color-mix(in srgb, #c0392b 15%, transparent);
	}

	.field-error-msg {
		font-family: var(--font-ui);
		font-size: 11px;
		color: #c0392b;
		margin: 0;
		letter-spacing: 0.01em;
	}

	.field-hint {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-muted);
		margin: 0;
		letter-spacing: 0.01em;
	}

	/* Submit row */
	.submit-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-top: 2px;
	}

	.submit-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		align-self: flex-start;
		padding: 8px 18px;
		border: 1px solid var(--color-subtle);
		border-radius: 3px;
		background: transparent;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--color-text);
		cursor: pointer;
		transition:
			background 150ms ease,
			border-color 150ms ease,
			color 150ms ease,
			opacity 150ms ease;
	}

	.submit-btn:hover:not(:disabled) {
		border-color: var(--color-muted);
		background: color-mix(in srgb, var(--color-subtle) 15%, transparent);
		color: var(--color-text);
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.submit-error {
		font-family: var(--font-ui);
		font-size: 12px;
		color: #c0392b;
		margin: 0;
	}

	/* Spinner */
	.spinner {
		animation: spin 700ms linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
