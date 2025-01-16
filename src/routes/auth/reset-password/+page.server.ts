import { getPasswordReset2FARedirect } from '$lib/server/auth/2fa';
import { verifyPasswordStrength } from '$lib/server/auth/password';
import {
	validatePasswordResetSessionRequest,
	invalidateUserPasswordResetSessions,
	deletePasswordResetSessionTokenCookie
} from '$lib/server/auth/password-reset';
import {
	invalidateUserSessions,
	type SessionFlags,
	generateSessionToken,
	createSession,
	setSessionTokenCookie
} from '$lib/server/auth/session';
import { updateUserPassword } from '$lib/server/auth/user';
import { fail, redirect, type Actions, type RequestEvent } from '@sveltejs/kit';

export async function load(event: RequestEvent) {
	const { session, user } = await validatePasswordResetSessionRequest(event);
	if (session === null) {
		return redirect(302, '/auth/forgot-password');
	}
	if (!session.emailVerified) {
		return redirect(302, '/auth/reset-password/verify-email');
	}
	if (user.registered2FA && !session.twoFactorVerified) {
		return redirect(302, getPasswordReset2FARedirect(user));
	}
	return {
		// For meta tags
		pageName: "Reset Password",
		description: "Create a new password for your account to regain secure access to your dashboard"
	};
}

export const actions: Actions = {
	default: action
};

async function action(event: RequestEvent) {
	const { session: passwordResetSession, user } = await validatePasswordResetSessionRequest(event);
	if (passwordResetSession === null) {
		return fail(401, {
			message: 'Not authenticated'
		});
	}
	if (!passwordResetSession.emailVerified) {
		return fail(403, {
			message: 'Forbidden'
		});
	}
	if (user.registered2FA && !passwordResetSession.twoFactorVerified) {
		return fail(403, {
			message: 'Forbidden'
		});
	}
	const formData = await event.request.formData();
	const password = formData.get('password');
	if (typeof password !== 'string') {
		return fail(400, {
			message: 'Invalid or missing fields'
		});
	}

	const strongPassword = await verifyPasswordStrength(password);
	if (!strongPassword) {
		return fail(400, {
			message: 'Weak password'
		});
	}
	await invalidateUserPasswordResetSessions(passwordResetSession.userId);
	await invalidateUserSessions(passwordResetSession.userId);
	await updateUserPassword(passwordResetSession.userId, password);

	const sessionFlags: SessionFlags = {
		twoFactorVerified: passwordResetSession.twoFactorVerified
	};
	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, user.id, sessionFlags);
	setSessionTokenCookie(event, sessionToken, session.expiresAt);
	deletePasswordResetSessionTokenCookie(event);
	return redirect(302, '/');
}
