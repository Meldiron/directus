<template>
	<form @submit.prevent="onSubmit">
		<v-input autofocus autocomplete="username" type="email" v-model="email" :placeholder="$t('email')" />

		<transition-expand>
			<v-input type="text" :placeholder="$t('otp')" v-if="requiresTFA" v-model="otp" />
		</transition-expand>

		<v-notice type="warning" v-if="error">
			{{ errorFormatted }}
		</v-notice>
		<div class="buttons">
			<v-button type="submit" :loading="loggingIn" large>Register</v-button>
			<router-link to="/login" class="forgot-password">Already have account?</router-link>
		</div>

		<p style="margin-top: 16px; margin-bottom: 16px; opacity: 0.5">
			Once you click the register button, we will send you an e-mail. You will have to open this e-mail to finish
			registration and set up your password.
		</p>

		<sso-links />
	</form>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from '@vue/composition-api';
import router from '@/router';
import ssoLinks from '../sso-links.vue';
import { login } from '@/auth';
import { RequestError } from '@/api';
import { translateAPIError } from '@/lang';
import { useUserStore } from '@/stores';
import api from '@/api';

type Credentials = {
	email: string;
	password: string;
	otp?: string;
};

export default defineComponent({
	components: { ssoLinks },
	setup() {
		const loggingIn = ref(false);
		const email = ref<string | null>(null);
		const password = ref<string | null>(null);
		const error = ref<RequestError | null>(null);
		const otp = ref<string | null>(null);
		const requiresTFA = ref(false);
		const userStore = useUserStore();

		watch(email, () => {
			if (requiresTFA.value === true) requiresTFA.value = false;
		});

		const errorFormatted = computed(() => {
			if (error.value) {
				return translateAPIError(error.value);
			}
			return null;
		});

		return {
			errorFormatted,
			error,
			email,
			password,
			onSubmit,
			loggingIn,
			translateAPIError,
			otp,
			requiresTFA,
		};

		async function onSubmit() {
			if (email.value === null) return;

			try {
				loggingIn.value = true;

				const emailStr = email.value;

				const res = await api.get('/custom/custom-auth/register-user?hash=' + emailStr);

				if (res.data.ok != '1') {
					throw Error(
						'Could not register a new account. This may mean problem on our side but most likely, you have already used this email. Please check your inbox, try to login, reset password or register an account for different email address.'
					);
				}

				// alert?

				// Stores are hydrated after login
				const lastPage = userStore.state.currentUser?.last_page;
				router.push(lastPage || '/register-success');
			} catch (err) {
				if (err.response?.data?.errors?.[0]?.extensions?.code === 'INVALID_OTP' && requiresTFA.value === false) {
					requiresTFA.value = true;
				} else {
					error.value = err;
				}
			} finally {
				loggingIn.value = false;
			}
		}
	},
});
</script>

<style lang="scss" scoped>
.v-input,
.v-notice {
	margin-bottom: 20px;
}

.buttons {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.forgot-password {
	color: var(--foreground-subdued);
	transition: color var(--fast) var(--transition);
	&:hover {
		color: var(--foreground-normal);
	}
}
</style>
