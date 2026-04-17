import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const SUBJECT_LABELS: Record<string, string> = {
	'text-error': 'Error in the Scripture text',
	'annotation-error': 'Error in an annotation or note',
	'technical-error': 'Technical error',
	'translation-question': 'Question about the translation',
	'feature-suggestion': 'Feature suggestion',
	other: 'Other'
};

export const POST: RequestHandler = async ({ request, platform }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body.' }, { status: 400 });
	}

	const { subject, email, reference, message } = body as {
		subject: string;
		email: string;
		reference: string;
		message: string;
	};

	if (!subject || !email || !message) {
		return json({ error: 'Subject, email, and message are required.' }, { status: 400 });
	}

	const env = platform?.env;
	const apiKey = env?.RESEND_API_KEY;

	if (!apiKey) {
		return json({ error: 'Email service not configured.' }, { status: 500 });
	}

	const subjectLabel = SUBJECT_LABELS[subject] ?? subject;
	const emailSubject = `[thedouayrheims.com] ${subjectLabel}`;

	const lines: string[] = [];
	lines.push(`Subject: ${subjectLabel}`);
	if (reference) {
		lines.push('');
		lines.push(`Scripture reference: ${reference}`);
	}
	lines.push('');
	lines.push(`Email: ${email}`);
	lines.push('');
	lines.push('Message:');
	lines.push(message);

	const textBody = lines.join('\n');

	const toAddress = env?.CONTACT_EMAIL ?? 'contact@thedouayrheims.com';

	try {
		const resendRes = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'Contact Form <contact@thedouayrheims.com>',
				to: [toAddress],
				reply_to: email,
				subject: emailSubject,
				text: textBody
			})
		});

		if (resendRes.ok) {
			return json({ ok: true });
		}

		const errBody = await resendRes.text().catch(() => '(unreadable)');
		console.error('Resend error:', resendRes.status, errBody);
		return json({ error: 'Failed to send. Please try again.' }, { status: 500 });
	} catch (err) {
		console.error('Contact fetch error:', err);
		return json({ error: 'Failed to send. Please try again.' }, { status: 500 });
	}
};
